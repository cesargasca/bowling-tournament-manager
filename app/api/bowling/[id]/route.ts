import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleApiError, validateRequest } from '@/lib/utils/api'
import { updateBowlingSchema } from '@/lib/validations'

// GET /api/bowling/[id] - Get a single bowling alley
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const bowling = await prisma.bowling.findUnique({
      where: { id: parseInt(id) },
      include: {
        tournaments: {
          select: {
            id: true,
            name: true,
            createdAt: true,
            _count: {
              select: {
                teams: true,
                sessions: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        _count: {
          select: {
            tournaments: true,
          },
        },
      },
    })

    if (!bowling) {
      return errorResponse('Bowling alley not found', 404)
    }

    // Get all lanes (lanes are global in current schema)
    const lanes = await prisma.lane.findMany({
      orderBy: {
        laneNumber: 'asc',
      },
      include: {
        opponentLane: {
          select: {
            id: true,
            laneNumber: true,
          },
        },
      },
    })

    return successResponse({
      ...bowling,
      lanes,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

// PUT /api/bowling/[id] - Update a bowling alley
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const validation = await validateRequest(request, updateBowlingSchema)
  if (!validation.success) return validation.response

  try {
    const bowling = await prisma.bowling.update({
      where: { id: parseInt(id) },
      data: validation.data,
      include: {
        _count: {
          select: {
            tournaments: true,
          },
        },
      },
    })

    return successResponse(bowling, 'Bowling alley updated successfully')
  } catch (error) {
    return handleApiError(error)
  }
}

// DELETE /api/bowling/[id] - Delete a bowling alley
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const bowlingId = parseInt(id)

    // Check if there are any tournaments using this bowling alley
    const tournamentsCount = await prisma.tournament.count({
      where: { bowlingId },
    })

    if (tournamentsCount > 0) {
      return errorResponse(
        `Cannot delete bowling alley. It has ${tournamentsCount} tournament(s) associated with it. Please delete the tournaments first.`,
        400
      )
    }

    await prisma.bowling.delete({
      where: { id: bowlingId },
    })

    return successResponse(null, 'Bowling alley deleted successfully')
  } catch (error) {
    return handleApiError(error)
  }
}
