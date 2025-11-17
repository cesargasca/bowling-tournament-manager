import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api';
import { calculateSessionPoints, calculateLineScores } from '@/lib/services/scoring';

interface TeamStanding {
  teamId: number;
  teamName: string;
  totalPoints: number;
  sessionsPlayed: number;
  wins: number;
  losses: number;
  ties: number;
  totalPins: number;
  averagePins: number;
}

interface PlayerStanding {
  playerId: number;
  playerName: string;
  teamName: string;
  gamesPlayed: number;
  totalPins: number;
  average: number;
  highGame: number;
  lowGame: number;
  attendanceRate: number;
  paymentRate: number;
}

// GET /api/tournaments/[id]/details - Get tournament details with team and player standings
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tournamentId = parseInt(id);

    // Get tournament with all related data
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
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
          orderBy: {
            sessionDate: 'desc',
          },
        },
      },
    });

    if (!tournament) {
      return errorResponse('Tournament not found', 404);
    }

    // Initialize team statistics
    const teamStats: Map<number, TeamStanding> = new Map();
    tournament.teams.forEach((team) => {
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
      });
    });

    // Initialize player statistics
    const playerStats: Map<number, PlayerStanding> = new Map();

    // Calculate team standings from session results
    for (const session of tournament.sessions) {
      const laneId = session.laneId;
      const opponentLaneId = session.lane.opponentLaneId;

      if (!opponentLaneId) continue;

      // Get sessions for both lanes
      const teamAPlayerSessions = session.teamPlayerSessions.filter(
        (tps) => tps.laneId === laneId
      );
      const teamBPlayerSessions = session.teamPlayerSessions.filter(
        (tps) => tps.laneId === opponentLaneId
      );

      if (teamAPlayerSessions.length === 0 || teamBPlayerSessions.length === 0) {
        continue;
      }

      try {
        // Calculate scores and points for team standings
        const teamAScores = calculateLineScores(teamAPlayerSessions as any);
        const teamBScores = calculateLineScores(teamBPlayerSessions as any);
        const points = calculateSessionPoints(teamAScores, teamBScores);

        // Update team A stats
        const teamAStats = teamStats.get(teamAScores.teamId);
        if (teamAStats) {
          teamAStats.totalPoints += points.teamAPoints;
          teamAStats.sessionsPlayed++;
          teamAStats.totalPins += teamAScores.totalPins;

          if (points.teamAPoints > points.teamBPoints) teamAStats.wins++;
          else if (points.teamAPoints < points.teamBPoints) teamAStats.losses++;
          else teamAStats.ties++;
        }

        // Update team B stats
        const teamBStats = teamStats.get(teamBScores.teamId);
        if (teamBStats) {
          teamBStats.totalPoints += points.teamBPoints;
          teamBStats.sessionsPlayed++;
          teamBStats.totalPins += teamBScores.totalPins;

          if (points.teamBPoints > points.teamAPoints) teamBStats.wins++;
          else if (points.teamBPoints < points.teamAPoints) teamBStats.losses++;
          else teamBStats.ties++;
        }
      } catch (error) {
        console.error('Error calculating session points:', error);
        continue;
      }

      // Calculate individual player statistics (without handicap)
      const allPlayerSessions = [...teamAPlayerSessions, ...teamBPlayerSessions];
      for (const tps of allPlayerSessions) {
        const playerId = tps.teamPlayer.playerId;
        const playerName = tps.teamPlayer.player.name;
        const teamName = tps.teamPlayer.team.name;

        if (!playerStats.has(playerId)) {
          playerStats.set(playerId, {
            playerId,
            playerName,
            teamName,
            gamesPlayed: 0,
            totalPins: 0,
            average: 0,
            highGame: 0,
            lowGame: 999,
            attendanceRate: 0,
            paymentRate: 0,
          });
        }

        const stats = playerStats.get(playerId)!;

        // Add games (3 lines per session = 3 games)
        const games = [tps.line1, tps.line2, tps.line3];
        stats.gamesPlayed += 3;
        stats.totalPins += tps.line1 + tps.line2 + tps.line3;

        // Update high/low game
        for (const game of games) {
          if (game > stats.highGame) stats.highGame = game;
          if (game < stats.lowGame) stats.lowGame = game;
        }
      }
    }

    // Calculate player averages and attendance/payment rates
    const playerStandingsArray: PlayerStanding[] = [];
    for (const [playerId, stats] of playerStats) {
      // Calculate average (total pins / total games)
      stats.average = stats.gamesPlayed > 0
        ? Math.round(stats.totalPins / stats.gamesPlayed)
        : 0;

      // Get all sessions for this player to calculate attendance/payment rates
      const playerSessions = tournament.sessions
        .flatMap(s => s.teamPlayerSessions)
        .filter(tps => tps.teamPlayer.playerId === playerId);

      const totalSessions = playerSessions.length;
      if (totalSessions > 0) {
        const attendedSessions = playerSessions.filter(tps => tps.assistance).length;
        const paidSessions = playerSessions.filter(tps => tps.payment).length;

        stats.attendanceRate = Math.round((attendedSessions / totalSessions) * 100);
        stats.paymentRate = Math.round((paidSessions / totalSessions) * 100);
      }

      // Fix lowGame if it's still 999 (no games played)
      if (stats.lowGame === 999) stats.lowGame = 0;

      playerStandingsArray.push(stats);
    }

    // Sort team standings by total points, then by total pins
    const teamStandings = Array.from(teamStats.values())
      .map((stats) => ({
        ...stats,
        averagePins:
          stats.sessionsPlayed > 0
            ? Math.round(stats.totalPins / stats.sessionsPlayed)
            : 0,
      }))
      .sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) {
          return b.totalPoints - a.totalPoints;
        }
        return b.totalPins - a.totalPins;
      });

    // Sort player standings by average
    const playerStandings = playerStandingsArray.sort((a, b) => {
      if (b.average !== a.average) {
        return b.average - a.average;
      }
      return b.totalPins - a.totalPins;
    });

    return successResponse({
      tournament: {
        id: tournament.id,
        name: tournament.name,
        bowlingAlley: tournament.bowling.name,
        teamsCount: tournament.teams.length,
        sessionsCount: tournament.sessions.length,
        playersCount: tournament.teams.reduce(
          (sum, team) => sum + team.teamPlayers.length,
          0
        ),
      },
      teamStandings,
      playerStandings,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
