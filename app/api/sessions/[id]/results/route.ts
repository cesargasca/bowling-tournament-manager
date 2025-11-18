import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api'
import { calculateSessionResult } from '@/lib/services/scoring'

// GET /api/sessions/[id]/results - Get calculated session results with points for all matchups
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

    if (session.sessionMatchups.length === 0) {
      return errorResponse('No matchups configured for this session', 400)
    }

    // Calculate results for each matchup
    const matchupResults = []

    for (const matchup of session.sessionMatchups) {
      if (!matchup.lane.opponentLane) {
        continue // Skip matchups without opponent lanes
      }

      if (!matchup.teamA || !matchup.teamB) {
        continue // Skip matchups without both teams assigned
      }

      const laneId = matchup.laneId
      const opponentLaneId = matchup.lane.opponentLane.id

      const teamAPlayerSessions = session.teamPlayerSessions.filter(
        (tps) => tps.laneId === laneId && tps.teamPlayer.teamId === matchup.teamAId
      )
      const teamBPlayerSessions = session.teamPlayerSessions.filter(
        (tps) => tps.laneId === opponentLaneId && tps.teamPlayer.teamId === matchup.teamBId
      )

      // Skip if no scores entered for this matchup
      if (teamAPlayerSessions.length === 0 || teamBPlayerSessions.length === 0) {
        matchupResults.push({
          matchupId: matchup.id,
          laneNumber: matchup.lane.laneNumber,
          opponentLaneNumber: matchup.lane.opponentLane.laneNumber,
          teamA: {
            id: matchup.teamA.id,
            name: matchup.teamA.name,
          },
          teamB: {
            id: matchup.teamB.id,
            name: matchup.teamB.name,
          },
          hasScores: false,
          message: 'No scores entered for this matchup yet',
        })
        continue
      }

      // Calculate results for this matchup
      const results = calculateSessionResult(
        sessionId,
        session.sessionDate,
        matchup.lane.laneNumber,
        matchup.lane.opponentLane.laneNumber,
        teamAPlayerSessions as any,
        teamBPlayerSessions as any
      )

      matchupResults.push({
        matchupId: matchup.id,
        laneNumber: matchup.lane.laneNumber,
        opponentLaneNumber: matchup.lane.opponentLane.laneNumber,
        teamA: {
          id: matchup.teamA.id,
          name: matchup.teamA.name,
        },
        teamB: {
          id: matchup.teamB.id,
          name: matchup.teamB.name,
        },
        hasScores: true,
        results,
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
    }

    return successResponse({
      sessionId,
      sessionDate: session.sessionDate,
      tournament: {
        id: session.tournament.id,
        name: session.tournament.name,
      },
      matchups: matchupResults,
      totalMatchups: session.sessionMatchups.length,
      matchupsWithScores: matchupResults.filter((m) => m.hasScores).length,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
