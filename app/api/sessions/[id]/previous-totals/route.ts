import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, handleApiError } from '@/lib/utils/api'

// GET /api/sessions/[id]/previous-totals - Get cumulative totals from all previous sessions for each player
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const sessionId = parseInt(id)

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
      return Response.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      )
    }

    // Get all sessions before this one in the same tournament, ordered by date
    const previousSessions = await prisma.session.findMany({
      where: {
        tournamentId: currentSession.tournamentId,
        sessionDate: {
          lt: currentSession.sessionDate,
        },
      },
      orderBy: {
        sessionDate: 'asc',
      },
      select: {
        id: true,
        sessionDate: true,
        teamPlayerSessions: {
          select: {
            teamPlayerId: true,
            line1: true,
            line2: true,
            line3: true,
            teamPlayer: {
              select: {
                id: true,
                playerId: true,
                player: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    // Calculate cumulative totals per player
    const playerCumulativeTotals: Record<number, {
      teamPlayerId: number
      playerId: number
      playerName: string
      cumulativeTotal: number
      sessionCount: number
    }> = {}

    // Process sessions in chronological order
    previousSessions.forEach((session) => {
      session.teamPlayerSessions.forEach((tps) => {
        const total = tps.line1 + tps.line2 + tps.line3
        const teamPlayerId = tps.teamPlayerId

        if (!playerCumulativeTotals[teamPlayerId]) {
          playerCumulativeTotals[teamPlayerId] = {
            teamPlayerId: tps.teamPlayerId,
            playerId: tps.teamPlayer.playerId,
            playerName: tps.teamPlayer.player.name,
            cumulativeTotal: 0,
            sessionCount: 0,
          }
        }

        playerCumulativeTotals[teamPlayerId].cumulativeTotal += total
        playerCumulativeTotals[teamPlayerId].sessionCount += 1
      })
    })

    return successResponse({
      sessionId: currentSession.id,
      sessionDate: currentSession.sessionDate,
      previousSessionsCount: previousSessions.length,
      playerTotals: Object.values(playerCumulativeTotals),
    })
  } catch (error) {
    return handleApiError(error)
  }
}
