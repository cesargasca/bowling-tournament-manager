import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api'

// GET /api/players/[id]/history - Get player's session history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const playerId = parseInt(id)
    const searchParams = request.nextUrl.searchParams
    const tournamentId = searchParams.get('tournamentId')

    // Verify player exists
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      select: {
        id: true,
        name: true,
      },
    })

    if (!player) {
      return errorResponse('Player not found', 404)
    }

    // Build where clause for filtering
    const where: any = {
      teamPlayer: {
        playerId,
      },
    }

    if (tournamentId) {
      where.session = {
        tournamentId: parseInt(tournamentId),
      }
    }

    // Get all team player sessions for this player
    const teamPlayerSessions = await prisma.teamPlayerSession.findMany({
      where,
      orderBy: {
        session: {
          sessionDate: 'desc',
        },
      },
      include: {
        session: {
          include: {
            tournament: {
              select: {
                id: true,
                name: true,
                bowling: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
        teamPlayer: {
          include: {
            team: {
              select: {
                id: true,
                name: true,
              },
            },
            player: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        lane: {
          include: {
            opponentLane: true,
          },
        },
      },
    })

    // For each session, find the opponent team
    const sessionHistory = await Promise.all(
      teamPlayerSessions.map(async (tps) => {
        const playerTeamId = tps.teamPlayer.teamId
        const playerLaneId = tps.laneId
        const opponentLaneId = tps.lane.opponentLane?.id

        let opponentTeam = null

        if (opponentLaneId) {
          // Find team player sessions on opponent lane for the same session
          const opponentSessions = await prisma.teamPlayerSession.findMany({
            where: {
              sessionId: tps.sessionId,
              laneId: opponentLaneId,
            },
            include: {
              teamPlayer: {
                include: {
                  team: true,
                },
              },
            },
            take: 1,
          })

          if (opponentSessions.length > 0) {
            opponentTeam = {
              id: opponentSessions[0].teamPlayer.team.id,
              name: opponentSessions[0].teamPlayer.team.name,
            }
          }
        }

        // Calculate totals
        const rawTotal = tps.line1 + tps.line2 + tps.line3
        const totalWithHandicap = rawTotal + tps.handicap

        return {
          sessionId: tps.session.id,
          sessionDate: tps.session.sessionDate,
          tournament: {
            id: tps.session.tournament.id,
            name: tps.session.tournament.name,
            bowlingAlley: tps.session.tournament.bowling.name,
          },
          team: {
            id: tps.teamPlayer.team.id,
            name: tps.teamPlayer.team.name,
          },
          opponentTeam,
          lane: {
            id: tps.lane.id,
            laneNumber: tps.lane.laneNumber,
            opponentLaneNumber: tps.lane.opponentLane?.laneNumber,
          },
          scores: {
            line1: tps.line1,
            line2: tps.line2,
            line3: tps.line3,
            rawTotal,
            handicap: tps.handicap,
            totalWithHandicap,
          },
          assistance: tps.assistance,
          payment: tps.payment,
          createdAt: tps.createdAt,
        }
      })
    )

    // Calculate summary statistics
    const totalSessions = sessionHistory.length
    const totalGames = totalSessions * 3 // 3 lines per session
    const totalPins = sessionHistory.reduce((sum, s) => sum + s.scores.rawTotal, 0)
    const average = totalGames > 0 ? Math.round((totalPins / totalGames) * 10) / 10 : 0
    const highGame = sessionHistory.reduce(
      (max, s) => Math.max(max, s.scores.line1, s.scores.line2, s.scores.line3),
      0
    )
    const lowGame =
      sessionHistory.length > 0
        ? sessionHistory.reduce((min, s) => {
            const sessionLow = Math.min(s.scores.line1, s.scores.line2, s.scores.line3)
            return sessionLow > 0 ? Math.min(min, sessionLow) : min
          }, 999)
        : 0
    const paidSessions = sessionHistory.filter((s) => s.payment).length
    const paymentRate = totalSessions > 0 ? Math.round((paidSessions / totalSessions) * 100) : 0

    return successResponse({
      player: {
        id: player.id,
        name: player.name,
      },
      summary: {
        totalSessions,
        totalGames,
        totalPins,
        average,
        highGame,
        lowGame: lowGame === 999 ? 0 : lowGame,
        paidSessions,
        unpaidSessions: totalSessions - paidSessions,
        paymentRate,
      },
      sessions: sessionHistory,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
