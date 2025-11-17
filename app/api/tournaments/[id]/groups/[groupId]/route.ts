import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api';

// PUT /api/tournaments/[id]/groups/[groupId] - Update a group
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; groupId: string }> }
) {
  try {
    const { groupId } = await params;
    const groupIdNum = parseInt(groupId);
    const body = await request.json();

    const { name, displayOrder } = body;

    const group = await prisma.tournamentGroup.update({
      where: { id: groupIdNum },
      data: {
        ...(name && { name }),
        ...(displayOrder !== undefined && { displayOrder }),
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

// DELETE /api/tournaments/[id]/groups/[groupId] - Delete a group
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; groupId: string }> }
) {
  try {
    const { groupId } = await params;
    const groupIdNum = parseInt(groupId);

    // Check if group has teams
    const group = await prisma.tournamentGroup.findUnique({
      where: { id: groupIdNum },
      include: { teams: true },
    });

    if (!group) {
      return errorResponse('Group not found', 404);
    }

    if (group.teams.length > 0) {
      return errorResponse(
        'Cannot delete group with teams. Please move teams to another group first.',
        400
      );
    }

    await prisma.tournamentGroup.delete({
      where: { id: groupIdNum },
    });

    return successResponse({ message: 'Group deleted successfully' });
  } catch (error) {
    return handleApiError(error);
  }
}
