import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api';

// PUT /api/teams/[id]/group - Assign team to a group
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const teamId = parseInt(id);
    const body = await request.json();

    const { groupId } = body;

    if (groupId !== null && groupId !== undefined) {
      // Verify group exists and belongs to same tournament
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        select: { tournamentId: true },
      });

      if (!team) {
        return errorResponse('Team not found', 404);
      }

      if (groupId) {
        const group = await prisma.tournamentGroup.findUnique({
          where: { id: parseInt(groupId) },
        });

        if (!group) {
          return errorResponse('Group not found', 404);
        }

        if (group.tournamentId !== team.tournamentId) {
          return errorResponse('Group does not belong to the same tournament', 400);
        }
      }
    }

    const updatedTeam = await prisma.team.update({
      where: { id: teamId },
      data: { groupId: groupId ? parseInt(groupId) : null },
      include: {
        group: true,
        tournament: true,
      },
    });

    return successResponse(updatedTeam);
  } catch (error) {
    return handleApiError(error);
  }
}
