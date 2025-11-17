import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleApiError, validateRequest } from '@/lib/utils/api'
import { updatePlayerSchema } from '@/lib/validations'

// GET /api/players/[id] - Get player details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const player = await prisma.player.findUnique({
      where: { id: parseInt(id) },
      include: {
        teamPlayers: {
          include: {
            team: {
              include: {
                tournament: true,
              },
            },
          },
        },
      },
    })

    if (!player) {
      return errorResponse('Player not found', 404)
    }

    return successResponse(player)
  } catch (error) {
    return handleApiError(error)
  }
}

// PUT /api/players/[id] - Update player
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const validation = await validateRequest(request, updatePlayerSchema)
  if (!validation.success) return validation.response

  try {
    const player = await prisma.player.update({
      where: { id: parseInt(id) },
      data: validation.data,
    })

    return successResponse(player, 'Player updated successfully')
  } catch (error) {
    return handleApiError(error)
  }
}

// DELETE /api/players/[id] - Delete player
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.player.delete({
      where: { id: parseInt(id) },
    })

    return successResponse(null, 'Player deleted successfully')
  } catch (error) {
    return handleApiError(error)
  }
}
