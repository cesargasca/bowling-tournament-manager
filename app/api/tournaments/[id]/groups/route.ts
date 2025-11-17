import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api';

// GET /api/tournaments/[id]/groups - Get all groups for a tournament
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tournamentId = parseInt(id);

    const groups = await prisma.tournamentGroup.findMany({
      where: { tournamentId },
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
      },
      orderBy: { displayOrder: 'asc' },
    });

    return successResponse(groups);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/tournaments/[id]/groups - Create a new group
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tournamentId = parseInt(id);
    const body = await request.json();

    const { name, displayOrder = 0 } = body;

    if (!name) {
      return errorResponse('Group name is required', 400);
    }

    const group = await prisma.tournamentGroup.create({
      data: {
        tournamentId,
        name,
        displayOrder,
      },
      include: {
        teams: true,
      },
    });

    return successResponse(group);
  } catch (error) {
    return handleApiError(error);
  }
}
