import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleApiError, validateRequest } from '@/lib/utils/api'
import { updateLaneSchema } from '@/lib/validations'

// GET /api/lanes/[id] - Get lane details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const lane = await prisma.lane.findUnique({
      where: { id: parseInt(id) },
      include: {
        opponentLane: true,
        opposingLane: true,
      },
    })

    if (!lane) {
      return errorResponse('Lane not found', 404)
    }

    return successResponse(lane)
  } catch (error) {
    return handleApiError(error)
  }
}

// PUT /api/lanes/[id] - Update lane
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const validation = await validateRequest(request, updateLaneSchema)
  if (!validation.success) return validation.response

  try {
    const lane = await prisma.lane.update({
      where: { id: parseInt(id) },
      data: validation.data,
      include: {
        opponentLane: true,
      },
    })

    return successResponse(lane, 'Lane updated successfully')
  } catch (error) {
    return handleApiError(error)
  }
}

// DELETE /api/lanes/[id] - Delete lane
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.lane.delete({
      where: { id: parseInt(id) },
    })

    return successResponse(null, 'Lane deleted successfully')
  } catch (error) {
    return handleApiError(error)
  }
}
