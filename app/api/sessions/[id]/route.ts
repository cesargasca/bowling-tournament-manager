import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api'

// GET /api/sessions/[id] - Get session details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await prisma.session.findUnique({
      where: { id: parseInt(id) },
      include: {
        tournament: true,
        sessionMatchups: {
          include: {
            lane: {
              include: {
                opponentLane: true,
              },
            },
            teamA: {
              include: {
                teamPlayers: {
                  include: {
                    player: true,
                  },
                },
              },
            },
            teamB: {
              include: {
                teamPlayers: {
                  include: {
                    player: true,
                  },
                },
              },
            },
          },
        },
        teamPlayerSessions: {
          include: {
            teamPlayer: {
              include: {
                player: true,
                team: true,
              },
            },
          },
        },
      },
    })

    if (!session) {
      return errorResponse('Session not found', 404)
    }

    return successResponse(session)
  } catch (error) {
    return handleApiError(error)
  }
}

// DELETE /api/sessions/[id] - Delete session
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.session.delete({
      where: { id: parseInt(id) },
    })

    return successResponse(null, 'Session deleted successfully')
  } catch (error) {
    return handleApiError(error)
  }
}
