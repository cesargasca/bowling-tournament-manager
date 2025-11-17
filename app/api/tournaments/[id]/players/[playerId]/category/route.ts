import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api';

// PUT /api/tournaments/[id]/players/[playerId]/category - Assign player to a category
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; playerId: string }> }
) {
  try {
    const { id, playerId } = await params;
    const tournamentId = parseInt(id);
    const playerIdNum = parseInt(playerId);
    const body = await request.json();

    const { categoryId, isManual = true } = body;

    if (!categoryId) {
      return errorResponse('Category ID is required', 400);
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

    // Upsert player tournament category
    const playerCategory = await prisma.playerTournamentCategory.upsert({
      where: {
        playerId_tournamentId: {
          playerId: playerIdNum,
          tournamentId,
        },
      },
      update: {
        categoryId: categoryIdNum,
        isManual,
      },
      create: {
        playerId: playerIdNum,
        tournamentId,
        categoryId: categoryIdNum,
        isManual,
      },
      include: {
        player: true,
        category: true,
      },
    });

    return successResponse(playerCategory);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/tournaments/[id]/players/[playerId]/category - Remove player from category
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; playerId: string }> }
) {
  try {
    const { id, playerId } = await params;
    const tournamentId = parseInt(id);
    const playerIdNum = parseInt(playerId);

    await prisma.playerTournamentCategory.delete({
      where: {
        playerId_tournamentId: {
          playerId: playerIdNum,
          tournamentId,
        },
      },
    });

    return successResponse({ message: 'Player removed from category' });
  } catch (error) {
    return handleApiError(error);
  }
}
