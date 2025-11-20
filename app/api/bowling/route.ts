import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleApiError, validateRequest } from '@/lib/utils/api'
import { createBowlingSchema } from '@/lib/validations'
import { z } from 'zod'

// Extended schema for bowling with lane range
const createBowlingWithLanesSchema = createBowlingSchema.extend({
  startLane: z.number().int().positive('Start lane must be positive').optional(),
  endLane: z.number().int().positive('End lane must be positive').optional(),
})

// GET /api/bowling - Get all bowling alleys
export async function GET() {
  try {
    const bowlingAlleys = await prisma.bowling.findMany({
      include: {
        _count: {
          select: {
            tournaments: true,
          },
        },
        tournaments: {
          select: {
            id: true,
            name: true,
          },
          take: 5,
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    // Fetch lanes for each bowling alley
    const bowlingWithLanes = await Promise.all(
      bowlingAlleys.map(async (bowling) => {
        // Note: Lanes are global, not per bowling alley in current schema
        // We'll return all lanes for now
        const lanes = await prisma.lane.findMany({
          orderBy: {
            laneNumber: 'asc',
          },
        })
        return {
          ...bowling,
          lanes,
        }
      })
    )

    return successResponse(bowlingWithLanes)
  } catch (error) {
    return handleApiError(error)
  }
}

// POST /api/bowling - Create a new bowling alley with lanes
export async function POST(request: NextRequest) {
  const validation = await validateRequest(request, createBowlingWithLanesSchema)
  if (!validation.success) return validation.response

  const { name, startLane, endLane } = validation.data

  try {
    // Validate lane range if provided
    if (startLane !== undefined && endLane !== undefined) {
      if (startLane >= endLane) {
        return errorResponse('End lane must be greater than start lane', 400)
      }

      const totalLanes = endLane - startLane + 1
      if (totalLanes % 2 !== 0) {
        return errorResponse('Lane range must have an even number of lanes for proper pairing', 400)
      }

      // Check if any lanes in this range already exist
      const existingLanes = await prisma.lane.findMany({
        where: {
          laneNumber: {
            gte: startLane,
            lte: endLane,
          },
        },
      })

      if (existingLanes.length > 0) {
        const existingNumbers = existingLanes.map(l => l.laneNumber).join(', ')
        return errorResponse(
          `Some lanes in this range already exist: ${existingNumbers}. Please choose a different range.`,
          400
        )
      }
    }

    // Create bowling alley and lanes in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the bowling alley
      const bowling = await tx.bowling.create({
        data: { name },
        include: {
          _count: {
            select: {
              tournaments: true,
            },
          },
        },
      })

      // Create lanes if range is provided
      const lanes = []
      if (startLane !== undefined && endLane !== undefined) {
        // Create lanes in pairs
        for (let i = startLane; i <= endLane; i += 2) {
          // Create first lane of the pair
          const lane1 = await tx.lane.create({
            data: { laneNumber: i },
          })

          // Create second lane of the pair
          const lane2 = await tx.lane.create({
            data: {
              laneNumber: i + 1,
              opponentLaneId: lane1.id,
            },
          })

          // Update first lane with opponent reference
          await tx.lane.update({
            where: { id: lane1.id },
            data: { opponentLaneId: lane2.id },
          })

          lanes.push(lane1, lane2)
        }
      }

      return {
        ...bowling,
        lanes,
      }
    })

    return successResponse(result, 'Bowling alley created successfully')
  } catch (error) {
    return handleApiError(error)
  }
}
