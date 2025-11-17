import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api';

// PUT /api/teams/bulk-update-group - Bulk update teams to a group
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { teamIds, groupId, tournamentId } = body;

    if (!teamIds || !Array.isArray(teamIds) || teamIds.length === 0) {
      return errorResponse('teamIds array is required and must not be empty', 400);
    }

    if (!tournamentId) {
      return errorResponse('tournamentId is required', 400);
    }

    // Verify all teams belong to the same tournament
    const teams = await prisma.team.findMany({
      where: {
        id: { in: teamIds.map((id: string) => parseInt(id)) },
        tournamentId: parseInt(tournamentId),
      },
    });

    if (teams.length !== teamIds.length) {
      return errorResponse('Some teams not found or do not belong to this tournament', 400);
    }

    // If groupId is provided, verify it exists and belongs to the tournament
    if (groupId !== null && groupId !== undefined && groupId !== '') {
      const group = await prisma.tournamentGroup.findUnique({
        where: { id: parseInt(groupId) },
      });

      if (!group) {
        return errorResponse('Group not found', 404);
      }

      if (group.tournamentId !== parseInt(tournamentId)) {
        return errorResponse('Group does not belong to this tournament', 400);
      }
    }

    // Bulk update teams
    await prisma.team.updateMany({
      where: {
        id: { in: teamIds.map((id: string) => parseInt(id)) },
      },
      data: {
        groupId: groupId && groupId !== '' ? parseInt(groupId) : null,
      },
    });

    return successResponse({
      message: `Successfully updated ${teamIds.length} team${teamIds.length !== 1 ? 's' : ''}`,
      updatedCount: teamIds.length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
