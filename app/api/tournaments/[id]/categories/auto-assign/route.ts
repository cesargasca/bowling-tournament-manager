import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api';

// POST /api/tournaments/[id]/categories/auto-assign - Auto-assign players to categories based on current averages
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tournamentId = parseInt(id);

    // Get all categories for this tournament
    const categories = await prisma.playerCategory.findMany({
      where: { tournamentId },
      orderBy: { minAverage: 'desc' }, // Start with highest categories first
    });

    if (categories.length === 0) {
      return errorResponse('No categories found. Create categories first.', 400);
    }

    // Get tournament with all sessions and scores
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
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
            teamPlayerSessions: {
              include: {
                teamPlayer: true,
              },
            },
          },
        },
      },
    });

    if (!tournament) {
      return errorResponse('Tournament not found', 404);
    }

    // Calculate current averages for all players
    const playerAverages = new Map<number, number>();

    for (const session of tournament.sessions) {
      for (const tps of session.teamPlayerSessions) {
        const playerId = tps.teamPlayer.playerId;
        const totalPins = tps.line1 + tps.line2 + tps.line3;

        if (!playerAverages.has(playerId)) {
          playerAverages.set(playerId, { totalPins: 0, totalGames: 0 });
        }

        const stats = playerAverages.get(playerId)!;
        stats.totalPins += totalPins;
        stats.totalGames += 3; // 3 games per session
      }
    }

    // Calculate averages
    const playerAveragesMap = new Map<number, number>();
    for (const [playerId, stats] of playerAverages) {
      if (stats.totalGames > 0) {
        playerAveragesMap.set(playerId, Math.round(stats.totalPins / stats.totalGames));
      }
    }

    // Get all players in tournament
    const allPlayerIds = new Set<number>();
    tournament.teams.forEach(team => {
      team.teamPlayers.forEach(tp => {
        allPlayerIds.add(tp.playerId);
      });
    });

    // Get existing assignments
    const existingAssignments = await prisma.playerTournamentCategory.findMany({
      where: {
        tournamentId,
        playerId: { in: Array.from(allPlayerIds) },
      },
    });

    const assignedPlayerIds = new Set(existingAssignments.map(a => a.playerId));

    // Auto-assign unassigned players based on their current average
    const assignments = [];
    for (const playerId of allPlayerIds) {
      // Skip if already assigned
      if (assignedPlayerIds.has(playerId)) {
        continue;
      }

      const average = playerAveragesMap.get(playerId) || 0;

      // Find appropriate category based on average
      let assignedCategory = null;
      for (const category of categories) {
        const meetsMin = category.minAverage === null || average >= category.minAverage;
        const meetsMax = category.maxAverage === null || average <= category.maxAverage;

        if (meetsMin && meetsMax) {
          assignedCategory = category;
          break;
        }
      }

      // If no category matches, assign to the lowest category (or first category without ranges)
      if (!assignedCategory) {
        assignedCategory = categories.find(c => c.minAverage === null && c.maxAverage === null) || categories[categories.length - 1];
      }

      if (assignedCategory) {
        assignments.push({
          playerId,
          tournamentId,
          categoryId: assignedCategory.id,
          isManual: false, // Auto-assigned
        });
      }
    }

    // Bulk create assignments
    if (assignments.length > 0) {
      await prisma.playerTournamentCategory.createMany({
        data: assignments,
        skipDuplicates: true,
      });
    }

    return successResponse({
      message: `Auto-assigned ${assignments.length} players to categories`,
      assignedCount: assignments.length,
      alreadyAssignedCount: assignedPlayerIds.size,
      totalPlayers: allPlayerIds.size,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
