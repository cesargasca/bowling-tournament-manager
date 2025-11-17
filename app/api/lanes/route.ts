import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleApiError, validateRequest } from '@/lib/utils/api'
import { createLaneSchema } from '@/lib/validations'

// GET /api/lanes - List all lanes
export async function GET() {
  try {
    const lanes = await prisma.lane.findMany({
      orderBy: { laneNumber: 'asc' },
      include: {
        opponentLane: {
          select: {
            id: true,
            laneNumber: true,
          },
        },
      },
    })

    return successResponse(lanes)
  } catch (error) {
    return handleApiError(error)
  }
}

// POST /api/lanes - Create a new lane (with optional opponent pairing)
export async function POST(request: NextRequest) {
  const validation = await validateRequest(request, createLaneSchema)
  if (!validation.success) return validation.response

  try {
    const { opponentLaneId, ...laneData } = validation.data

    // Create lane
    const lane = await prisma.lane.create({
      data: {
        ...laneData,
        opponentLaneId: opponentLaneId || undefined,
      },
      include: {
        opponentLane: true,
      },
    })

    return successResponse(lane, 'Lane created successfully')
  } catch (error) {
    return handleApiError(error)
  }
}
