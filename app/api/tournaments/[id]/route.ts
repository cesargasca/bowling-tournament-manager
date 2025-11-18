import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleApiError, validateRequest } from '@/lib/utils/api'
import { updateTournamentSchema } from '@/lib/validations'

// GET /api/tournaments/[id] - Get tournament details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const tournament = await prisma.tournament.findUnique({
      where: { id: parseInt(id) },
      include: {
        bowling: true,
        teams: {
          include: {
            teamPlayers: {
              include: {
                player: true,
              },
            },
          },
        },
        sessions: {
          orderBy: { sessionDate: 'asc' },
          include: {
            sessionMatchups: {
              include: {
                lane: {
                  include: {
                    opponentLane: true,
                  },
                },
                teamA: true,
                teamB: true,
              },
            },
          },
        },
        _count: {
          select: {
            teams: true,
            sessions: true,
          },
        },
      },
    })

    if (!tournament) {
      return errorResponse('Tournament not found', 404)
    }

    return successResponse(tournament)
  } catch (error) {
    return handleApiError(error)
  }
}

// PUT /api/tournaments/[id] - Update tournament
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const validation = await validateRequest(request, updateTournamentSchema)
  if (!validation.success) return validation.response

  try {
    const tournament = await prisma.tournament.update({
      where: { id: parseInt(id) },
      data: validation.data,
      include: {
        bowling: true,
      },
    })

    return successResponse(tournament, 'Tournament updated successfully')
  } catch (error) {
    return handleApiError(error)
  }
}

// DELETE /api/tournaments/[id] - Delete tournament
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check if tournament has teams or sessions
    const tournament = await prisma.tournament.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: {
            teams: true,
            sessions: true,
          },
        },
      },
    })

    if (!tournament) {
      return errorResponse('Tournament not found', 404)
    }

    if (tournament._count.teams > 0 || tournament._count.sessions > 0) {
      return errorResponse(
        'Cannot delete tournament with existing teams or sessions',
        400
      )
    }

    await prisma.tournament.delete({
      where: { id: parseInt(id) },
    })

    return successResponse(null, 'Tournament deleted successfully')
  } catch (error) {
    return handleApiError(error)
  }
}
