import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api'
import { calculateSessionResult } from '@/lib/services/scoring'

// GET /api/sessions/[id]/results - Get calculated session results with points
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const sessionId = parseInt(id)

    // Get session with all details
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        tournament: true,
        lane: {
          include: {
            opponentLane: true,
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
            lane: true,
          },
        },
      },
    })

    if (!session) {
      return errorResponse('Session not found', 404)
    }

    if (!session.lane.opponentLane) {
      return errorResponse('Session lane has no opponent lane configured', 400)
    }

    // Get team player sessions for both teams
    const laneId = session.laneId
    const opponentLaneId = session.lane.opponentLaneId

    const teamAPlayerSessions = session.teamPlayerSessions.filter(
      (tps) => tps.laneId === laneId
    )
    const teamBPlayerSessions = session.teamPlayerSessions.filter(
      (tps) => tps.laneId === opponentLaneId
    )

    // Check if scores exist
    if (teamAPlayerSessions.length === 0 || teamBPlayerSessions.length === 0) {
      return errorResponse('No scores entered for this session yet', 400)
    }

    // Calculate results
    const results = calculateSessionResult(
      sessionId,
      session.sessionDate,
      session.lane.laneNumber,
      session.lane.opponentLane.laneNumber,
      teamAPlayerSessions as any,
      teamBPlayerSessions as any
    )

    return successResponse({
      ...results,
      tournament: {
        id: session.tournament.id,
        name: session.tournament.name,
      },
      playerScores: {
        teamA: teamAPlayerSessions.map((tps) => ({
          playerId: tps.teamPlayer.playerId,
          playerName: tps.teamPlayer.player.name,
          line1: tps.line1,
          line2: tps.line2,
          line3: tps.line3,
          handicap: tps.handicap,
          assistance: tps.assistance,
          payment: tps.payment,
          total: tps.line1 + tps.line2 + tps.line3,
        })),
        teamB: teamBPlayerSessions.map((tps) => ({
          playerId: tps.teamPlayer.playerId,
          playerName: tps.teamPlayer.player.name,
          line1: tps.line1,
          line2: tps.line2,
          line3: tps.line3,
          handicap: tps.handicap,
          assistance: tps.assistance,
          payment: tps.payment,
          total: tps.line1 + tps.line2 + tps.line3,
        })),
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
