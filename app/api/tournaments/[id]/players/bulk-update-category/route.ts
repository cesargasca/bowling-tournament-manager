import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api';

// PUT /api/tournaments/[id]/players/bulk-update-category - Bulk update players to a category
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tournamentId = parseInt(id);
    const body = await request.json();
    const { playerIds, categoryId } = body;

    if (!playerIds || !Array.isArray(playerIds) || playerIds.length === 0) {
      return errorResponse('playerIds array is required and must not be empty', 400);
    }

    if (!categoryId) {
      return errorResponse('categoryId is required', 400);
    }

    const categoryIdNum = parseInt(categoryId);

    // Verify category exists and belongs to tournament
    const category = await prisma.playerCategory.findUnique({
      where: { id: categoryIdNum },
    });

    if (!category) {
      return errorResponse('Category not found', 404);
    }

    if (category.tournamentId !== tournamentId) {
      return errorResponse('Category does not belong to this tournament', 400);
    }

    // Get existing assignments
    const existingAssignments = await prisma.playerTournamentCategory.findMany({
      where: {
        tournamentId,
        playerId: { in: playerIds.map((id: string) => parseInt(id)) },
      },
    });

    const existingPlayerIds = new Set(existingAssignments.map(a => a.playerId));

    // Update existing assignments
    if (existingAssignments.length > 0) {
      await prisma.playerTournamentCategory.updateMany({
        where: {
          tournamentId,
          playerId: { in: existingAssignments.map(a => a.playerId) },
        },
        data: {
          categoryId: categoryIdNum,
          isManual: true,
        },
      });
    }

    // Create new assignments for players not yet assigned
    const newAssignments = playerIds
      .map((id: string) => parseInt(id))
      .filter(playerId => !existingPlayerIds.has(playerId))
      .map(playerId => ({
        playerId,
        tournamentId,
        categoryId: categoryIdNum,
        isManual: true,
      }));

    if (newAssignments.length > 0) {
      await prisma.playerTournamentCategory.createMany({
        data: newAssignments,
        skipDuplicates: true,
      });
    }

    return successResponse({
      message: `Successfully updated ${playerIds.length} player${playerIds.length !== 1 ? 's' : ''}`,
      updatedCount: existingAssignments.length,
      createdCount: newAssignments.length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
