import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleApiError, validateRequest } from '@/lib/utils/api'
import { updateBowlingSchema } from '@/lib/validations'

// GET /api/bowling-alleys/[id] - Get a specific bowling alley
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const bowlingAlley = await prisma.bowling.findUnique({
      where: { id: parseInt(id) },
      include: {
        tournaments: {
          select: {
            id: true,
            name: true,
            createdAt: true,
          },
        },
      },
    })

    if (!bowlingAlley) {
      return errorResponse('Bowling alley not found', 404)
    }

    return successResponse(bowlingAlley)
  } catch (error) {
    return handleApiError(error)
  }
}

// PUT /api/bowling-alleys/[id] - Update a bowling alley
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const validation = await validateRequest(request, updateBowlingSchema)
  if (!validation.success) return validation.response

  try {
    const bowlingAlley = await prisma.bowling.update({
      where: { id: parseInt(id) },
      data: validation.data,
    })

    return successResponse(bowlingAlley, 'Bowling alley updated successfully')
  } catch (error) {
    return handleApiError(error)
  }
}

// DELETE /api/bowling-alleys/[id] - Delete a bowling alley
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check if bowling alley has tournaments
    const bowlingAlley = await prisma.bowling.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: { select: { tournaments: true } },
      },
    })

    if (!bowlingAlley) {
      return errorResponse('Bowling alley not found', 404)
    }

    if (bowlingAlley._count.tournaments > 0) {
      return errorResponse(
        'Cannot delete bowling alley with existing tournaments',
        400
      )
    }

    await prisma.bowling.delete({
      where: { id: parseInt(id) },
    })

    return successResponse(null, 'Bowling alley deleted successfully')
  } catch (error) {
    return handleApiError(error)
  }
}
