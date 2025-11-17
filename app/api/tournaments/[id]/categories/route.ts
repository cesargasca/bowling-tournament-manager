import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api';

// GET /api/tournaments/[id]/categories - Get all player categories for a tournament
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tournamentId = parseInt(id);

    const categories = await prisma.playerCategory.findMany({
      where: { tournamentId },
      include: {
        playerTournamentCategory: {
          include: {
            player: true,
          },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });

    return successResponse(categories);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/tournaments/[id]/categories - Create a new player category
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tournamentId = parseInt(id);
    const body = await request.json();

    const { name, minAverage, maxAverage, displayOrder = 0 } = body;

    if (!name) {
      return errorResponse('Category name is required', 400);
    }

    const category = await prisma.playerCategory.create({
      data: {
        tournamentId,
        name,
        minAverage: minAverage ? parseInt(minAverage) : null,
        maxAverage: maxAverage ? parseInt(maxAverage) : null,
        displayOrder,
      },
      include: {
        playerTournamentCategory: true,
      },
    });

    return successResponse(category);
  } catch (error) {
    return handleApiError(error);
  }
}
