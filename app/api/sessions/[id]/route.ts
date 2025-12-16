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

// PATCH /api/sessions/[id] - Update session (e.g., toggle completion)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const sessionId = parseInt(id)
    const body = await request.json()

    // If trying to mark session as complete, validate previous session is complete
    if (body.completed === true) {
      // Get the current session
      const currentSession = await prisma.session.findUnique({
        where: { id: sessionId },
        select: {
          id: true,
          sessionDate: true,
          tournamentId: true,
        },
      })

      if (!currentSession) {
        return errorResponse('Session not found', 404)
      }

      // Get all sessions in this tournament ordered by date
      const allSessions = await prisma.session.findMany({
        where: {
          tournamentId: currentSession.tournamentId,
        },
        orderBy: {
          sessionDate: 'asc',
        },
        select: {
          id: true,
          sessionDate: true,
          completed: true,
        },
      })

      // Find current session index
      const currentIndex = allSessions.findIndex(s => s.id === sessionId)

      // If not the first session, check if previous session is complete
      if (currentIndex > 0) {
        const previousSession = allSessions[currentIndex - 1]
        if (!previousSession.completed) {
          return errorResponse(
            `Cannot mark session as complete. Previous session (${new Date(previousSession.sessionDate).toLocaleDateString()}) must be marked as complete first.`,
            400
          )
        }
      }
    }

    const session = await prisma.session.update({
      where: { id: sessionId },
      data: {
        completed: body.completed,
      },
    })

    return successResponse(session, 'Session updated successfully')
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
