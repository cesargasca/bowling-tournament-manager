import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api'
import { calculateSessionPoints, calculateLineScores } from '@/lib/services/scoring'
import { TeamStatistics } from '@/types'

// GET /api/tournaments/[id]/standings - Get tournament standings
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const tournamentId = parseInt(id)

    // Verify tournament exists
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { id: true, name: true },
    })

    if (!tournament) {
      return errorResponse('Tournament not found', 404)
    }

    // Get all teams in the tournament
    const teams = await prisma.team.findMany({
      where: { tournamentId },
      include: {
        teamPlayers: {
          include: {
            player: true,
          },
        },
      },
    })

    // Get all sessions for the tournament with scores
    const sessions = await prisma.session.findMany({
      where: { tournamentId },
      include: {
        lane: true,
        teamPlayerSessions: {
          include: {
            teamPlayer: {
              include: {
                team: true,
                player: true,
              },
            },
          },
        },
      },
    })

    // Initialize team statistics
    const teamStats: Map<number, TeamStatistics> = new Map()
    teams.forEach((team) => {
      teamStats.set(team.id, {
        teamId: team.id,
        teamName: team.name,
        totalPoints: 0,
        sessionsPlayed: 0,
        wins: 0,
        losses: 0,
        ties: 0,
        totalPins: 0,
        averagePins: 0,
      })
    })

    // Calculate standings from session results
    for (const session of sessions) {
      const laneId = session.laneId
      const opponentLaneId = session.lane.opponentLaneId

      if (!opponentLaneId) continue

      // Get sessions for both lanes
      const teamAPlayerSessions = session.teamPlayerSessions.filter(
        (tps) => tps.laneId === laneId
      )
      const teamBPlayerSessions = session.teamPlayerSessions.filter(
        (tps) => tps.laneId === opponentLaneId
      )

      if (teamAPlayerSessions.length === 0 || teamBPlayerSessions.length === 0) {
        continue // No scores entered yet
      }

      try {
        // Calculate scores and points
        const teamAScores = calculateLineScores(teamAPlayerSessions as any)
        const teamBScores = calculateLineScores(teamBPlayerSessions as any)
        const points = calculateSessionPoints(teamAScores, teamBScores)

        // Update team A stats
        const teamAStats = teamStats.get(teamAScores.teamId)
        if (teamAStats) {
          teamAStats.totalPoints += points.teamAPoints
          teamAStats.sessionsPlayed++
          teamAStats.totalPins += teamAScores.totalPins

          if (points.teamAPoints > points.teamBPoints) teamAStats.wins++
          else if (points.teamAPoints < points.teamBPoints) teamAStats.losses++
          else teamAStats.ties++
        }

        // Update team B stats
        const teamBStats = teamStats.get(teamBScores.teamId)
        if (teamBStats) {
          teamBStats.totalPoints += points.teamBPoints
          teamBStats.sessionsPlayed++
          teamBStats.totalPins += teamBScores.totalPins

          if (points.teamBPoints > points.teamAPoints) teamBStats.wins++
          else if (points.teamBPoints < points.teamAPoints) teamBStats.losses++
          else teamBStats.ties++
        }
      } catch (error) {
        console.error('Error calculating session points:', error)
        continue
      }
    }

    // Calculate averages and sort by total points
    const standings = Array.from(teamStats.values())
      .map((stats) => ({
        ...stats,
        averagePins:
          stats.sessionsPlayed > 0
            ? Math.round(stats.totalPins / stats.sessionsPlayed)
            : 0,
      }))
      .sort((a, b) => {
        // Sort by total points (descending), then by total pins (descending)
        if (b.totalPoints !== a.totalPoints) {
          return b.totalPoints - a.totalPoints
        }
        return b.totalPins - a.totalPins
      })

    return successResponse({
      tournamentId: tournament.id,
      tournamentName: tournament.name,
      standings,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
