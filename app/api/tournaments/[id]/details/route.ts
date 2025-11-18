import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api';
import { calculateSessionPoints, calculateLineScores } from '@/lib/services/scoring';

interface TeamStanding {
  teamId: number;
  teamName: string;
  groupId: number | null;
  groupName: string | null;
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
  categoryId: number | null;
  categoryName: string | null;
  isManualCategory: boolean;
  gamesPlayed: number;
  totalPins: number;
  average: number;
  highGame: number;
  lowGame: number;
  attendanceRate: number;
  paymentRate: number;
}

interface GroupedStandings {
  groupId: number | null;
  groupName: string;
  teams: TeamStanding[];
}

interface CategorizedStandings {
  categoryId: number | null;
  categoryName: string;
  minAverage: number | null;
  maxAverage: number | null;
  players: PlayerStanding[];
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
        groups: {
          orderBy: { displayOrder: 'asc' },
        },
        playerCategories: {
          orderBy: { displayOrder: 'asc' },
        },
        teams: {
          include: {
            group: true,
            teamPlayers: {
              include: {
                player: true,
              },
            },
          },
        },
        sessions: {
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

    // Get player category assignments
    const playerCategories = await prisma.playerTournamentCategory.findMany({
      where: { tournamentId },
      include: {
        category: true,
        player: true,
      },
    });

    const playerCategoryMap = new Map(
      playerCategories.map(pc => [
        pc.playerId,
        { categoryId: pc.categoryId, categoryName: pc.category.name, isManual: pc.isManual },
      ])
    );

    // Initialize team statistics
    const teamStats: Map<number, TeamStanding> = new Map();
    tournament.teams.forEach((team) => {
      teamStats.set(team.id, {
        teamId: team.id,
        teamName: team.name,
        groupId: team.groupId,
        groupName: team.group?.name || null,
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
      // Process each matchup in the session
      for (const matchup of session.sessionMatchups) {
        if (!matchup.lane.opponentLane) continue;
        if (!matchup.teamA || !matchup.teamB) continue;

        const laneId = matchup.laneId;
        const opponentLaneId = matchup.lane.opponentLane.id;

        // Get player sessions for both teams in this matchup
        const teamAPlayerSessions = session.teamPlayerSessions.filter(
          (tps) => tps.laneId === laneId && tps.teamPlayer.teamId === matchup.teamAId
        );
        const teamBPlayerSessions = session.teamPlayerSessions.filter(
          (tps) => tps.laneId === opponentLaneId && tps.teamPlayer.teamId === matchup.teamBId
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

          // Calculate individual player statistics (without handicap)
          const allPlayerSessions = [...teamAPlayerSessions, ...teamBPlayerSessions];
          for (const tps of allPlayerSessions) {
            const playerId = tps.teamPlayer.playerId;
            const playerName = tps.teamPlayer.player.name;
            const teamName = tps.teamPlayer.team.name;

            if (!playerStats.has(playerId)) {
              const categoryInfo = playerCategoryMap.get(playerId);
              playerStats.set(playerId, {
                playerId,
                playerName,
                teamName,
                categoryId: categoryInfo?.categoryId || null,
                categoryName: categoryInfo?.categoryName || null,
                isManualCategory: categoryInfo?.isManual || false,
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

            // Only count if player actually played (not absent with 0,0,0)
            const totalScore = tps.line1 + tps.line2 + tps.line3;
            if (totalScore > 0) {
              // Add games (3 lines per session = 3 games)
              const games = [tps.line1, tps.line2, tps.line3];
              stats.gamesPlayed += 3;
              stats.totalPins += totalScore;

              // Update high/low game
              for (const game of games) {
                if (game > stats.highGame) stats.highGame = game;
                if (game > 0 && game < stats.lowGame) stats.lowGame = game;
              }
            }
          }
        } catch (error) {
          console.error('Error calculating matchup points:', error);
          continue;
        }
      } // End of matchup loop
    } // End of session loop

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

    // Calculate averages for teams
    teamStats.forEach(stats => {
      stats.averagePins = stats.sessionsPlayed > 0
        ? Math.round(stats.totalPins / stats.sessionsPlayed)
        : 0;
    });

    // Group team standings by group
    const groupedStandings: GroupedStandings[] = [];

    // Add standings for each group
    tournament.groups.forEach(group => {
      const groupTeams = Array.from(teamStats.values())
        .filter(team => team.groupId === group.id)
        .sort((a, b) => {
          if (b.totalPoints !== a.totalPoints) {
            return b.totalPoints - a.totalPoints;
          }
          return b.totalPins - a.totalPins;
        });

      groupedStandings.push({
        groupId: group.id,
        groupName: group.name,
        teams: groupTeams,
      });
    });

    // Add ungrouped teams
    const ungroupedTeams = Array.from(teamStats.values())
      .filter(team => team.groupId === null)
      .sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) {
          return b.totalPoints - a.totalPoints;
        }
        return b.totalPins - a.totalPins;
      });

    if (ungroupedTeams.length > 0) {
      groupedStandings.push({
        groupId: null,
        groupName: 'Ungrouped',
        teams: ungroupedTeams,
      });
    }

    // Group player standings by category
    const categorizedStandings: CategorizedStandings[] = [];

    // Add standings for each category
    tournament.playerCategories.forEach(category => {
      const categoryPlayers = playerStandingsArray
        .filter(player => player.categoryId === category.id)
        .sort((a, b) => {
          if (b.average !== a.average) {
            return b.average - a.average;
          }
          return b.totalPins - a.totalPins;
        });

      categorizedStandings.push({
        categoryId: category.id,
        categoryName: category.name,
        minAverage: category.minAverage,
        maxAverage: category.maxAverage,
        players: categoryPlayers,
      });
    });

    // Add uncategorized players
    const uncategorizedPlayers = playerStandingsArray
      .filter(player => player.categoryId === null)
      .sort((a, b) => {
        if (b.average !== a.average) {
          return b.average - a.average;
        }
        return b.totalPins - a.totalPins;
      });

    if (uncategorizedPlayers.length > 0) {
      categorizedStandings.push({
        categoryId: null,
        categoryName: 'Uncategorized',
        minAverage: null,
        maxAverage: null,
        players: uncategorizedPlayers,
      });
    }

    return successResponse({
      tournament: {
        id: tournament.id,
        name: tournament.name,
        bowlingAlley: tournament.bowling.name,
        teamSize: tournament.teamSize,
        teamsCount: tournament.teams.length,
        sessionsCount: tournament.sessions.length,
        playersCount: tournament.teams.reduce(
          (sum, team) => sum + team.teamPlayers.length,
          0
        ),
      },
      groups: tournament.groups,
      categories: tournament.playerCategories,
      groupedStandings,
      categorizedStandings,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
