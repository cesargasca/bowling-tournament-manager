import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/utils/api';

export async function GET() {
  try {
    // Get all tournaments with related data
    const tournaments = await prisma.tournament.findMany({
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
          orderBy: {
            sessionDate: 'desc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Get total counts
    const [
      totalPlayers,
      totalTeams,
      totalSessions,
      totalBowlingAlleys,
    ] = await Promise.all([
      prisma.player.count(),
      prisma.team.count(),
      prisma.session.count(),
      prisma.bowling.count(),
    ]);

    // Get payment statistics from TeamPlayerSession
    const allSessionScores = await prisma.teamPlayerSession.findMany({
      include: {
        teamPlayer: {
          include: {
            player: true,
            team: true,
          },
        },
        session: {
          include: {
            tournament: true,
          },
        },
      },
    });

    // Calculate payment statistics
    const totalScoreEntries = allSessionScores.length;
    const paidEntries = allSessionScores.filter((s) => s.payment).length;
    const unpaidEntries = totalScoreEntries - paidEntries;
    const paymentRate = totalScoreEntries > 0
      ? ((paidEntries / totalScoreEntries) * 100).toFixed(1)
      : '0.0';

    // Get assistance statistics
    const assistanceEntries = allSessionScores.filter((s) => s.assistance).length;
    const assistanceRate = totalScoreEntries > 0
      ? ((assistanceEntries / totalScoreEntries) * 100).toFixed(1)
      : '0.0';

    // Get recent sessions
    const recentSessions = await prisma.session.findMany({
      take: 5,
      orderBy: {
        sessionDate: 'desc',
      },
      include: {
        tournament: {
          include: {
            bowling: true,
          },
        },
        lane: true,
      },
    });

    // Get players with most games played
    const playerGames = allSessionScores.reduce((acc, score) => {
      const playerId = score.teamPlayer.playerId;
      const playerName = score.teamPlayer.player.name;

      if (!acc[playerId]) {
        acc[playerId] = {
          id: playerId,
          name: playerName,
          gamesPlayed: 0,
          totalPins: 0,
          paid: 0,
          unpaid: 0,
        };
      }

      acc[playerId].gamesPlayed += 3; // 3 lines per session
      acc[playerId].totalPins += (score.line1 || 0) + (score.line2 || 0) + (score.line3 || 0);

      if (score.payment) {
        acc[playerId].paid += 1;
      } else {
        acc[playerId].unpaid += 1;
      }

      return acc;
    }, {} as Record<string, any>);

    const topPlayers = Object.values(playerGames)
      .sort((a: any, b: any) => b.gamesPlayed - a.gamesPlayed)
      .slice(0, 10);

    // Get teams with payment issues (players who haven't paid)
    const teamsWithPaymentIssues = allSessionScores
      .filter((s) => !s.payment)
      .reduce((acc, score) => {
        const teamId = score.teamPlayer.teamId;
        const teamName = score.teamPlayer.team.name;
        const playerName = score.teamPlayer.player.name;

        if (!acc[teamId]) {
          acc[teamId] = {
            id: teamId,
            name: teamName,
            unpaidPlayers: [],
            unpaidCount: 0,
          };
        }

        if (!acc[teamId].unpaidPlayers.includes(playerName)) {
          acc[teamId].unpaidPlayers.push(playerName);
          acc[teamId].unpaidCount += 1;
        }

        return acc;
      }, {} as Record<string, any>);

    const dashboardData = {
      overview: {
        totalTournaments: tournaments.length,
        totalPlayers,
        totalTeams,
        totalSessions,
        totalBowlingAlleys,
      },
      tournaments: tournaments.map((t) => ({
        id: t.id,
        name: t.name,
        bowlingAlley: t.bowling.name,
        teamsCount: t.teams.length,
        sessionsCount: t.sessions.length,
        playersCount: t.teams.reduce((sum, team) => sum + team.teamPlayers.length, 0),
        createdAt: t.createdAt,
      })),
      payments: {
        totalEntries: totalScoreEntries,
        paid: paidEntries,
        unpaid: unpaidEntries,
        paymentRate: parseFloat(paymentRate),
        teamsWithIssues: Object.values(teamsWithPaymentIssues)
          .sort((a: any, b: any) => b.unpaidCount - a.unpaidCount)
          .slice(0, 10),
      },
      attendance: {
        totalEntries: totalScoreEntries,
        withAssistance: assistanceEntries,
        assistanceRate: parseFloat(assistanceRate),
      },
      recentSessions: recentSessions.map((s) => ({
        id: s.id,
        tournament: s.tournament.name,
        bowlingAlley: s.tournament.bowling.name,
        sessionDate: s.sessionDate,
        laneNumber: s.lane?.laneNumber,
        createdAt: s.createdAt,
      })),
      topPlayers: topPlayers.map((p: any) => ({
        id: p.id,
        name: p.name,
        gamesPlayed: p.gamesPlayed,
        averagePins: p.gamesPlayed > 0 ? Math.round(p.totalPins / p.gamesPlayed) : 0,
        paidSessions: p.paid,
        unpaidSessions: p.unpaid,
        paymentRate: p.paid + p.unpaid > 0
          ? parseFloat(((p.paid / (p.paid + p.unpaid)) * 100).toFixed(1))
          : 0,
      })),
    };

    return successResponse(dashboardData);
  } catch (error) {
    console.error('Dashboard API Error:', error);
    return errorResponse('Failed to fetch dashboard data', 500);
  }
}
