import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api';

// PUT /api/tournaments/[id]/categories/[categoryId] - Update a category
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; categoryId: string }> }
) {
  try {
    const { categoryId } = await params;
    const categoryIdNum = parseInt(categoryId);
    const body = await request.json();

    const { name, minAverage, maxAverage, displayOrder } = body;

    const category = await prisma.playerCategory.update({
      where: { id: categoryIdNum },
      data: {
        ...(name && { name }),
        ...(minAverage !== undefined && { minAverage: minAverage ? parseInt(minAverage) : null }),
        ...(maxAverage !== undefined && { maxAverage: maxAverage ? parseInt(maxAverage) : null }),
        ...(displayOrder !== undefined && { displayOrder }),
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

// DELETE /api/tournaments/[id]/categories/[categoryId] - Delete a category
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; categoryId: string }> }
) {
  try {
    const { categoryId } = await params;
    const categoryIdNum = parseInt(categoryId);

    // Check if category has players
    const category = await prisma.playerCategory.findUnique({
      where: { id: categoryIdNum },
      include: { playerTournamentCategory: true },
    });

    if (!category) {
      return errorResponse('Category not found', 404);
    }

    if (category.playerTournamentCategory.length > 0) {
      return errorResponse(
        'Cannot delete category with assigned players. Please move players to another category first.',
        400
      );
    }

    await prisma.playerCategory.delete({
      where: { id: categoryIdNum },
    });

    return successResponse({ message: 'Category deleted successfully' });
  } catch (error) {
    return handleApiError(error);
  }
}
