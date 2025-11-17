import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleApiError, validateRequest } from '@/lib/utils/api'
import { updateTeamSchema } from '@/lib/validations'

// GET /api/teams/[id] - Get team details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const team = await prisma.team.findUnique({
      where: { id: parseInt(id) },
      include: {
        tournament: true,
        teamPlayers: {
          include: {
            player: true,
          },
        },
      },
    })

    if (!team) {
      return errorResponse('Team not found', 404)
    }

    return successResponse(team)
  } catch (error) {
    return handleApiError(error)
  }
}

// PUT /api/teams/[id] - Update team
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const validation = await validateRequest(request, updateTeamSchema)
  if (!validation.success) return validation.response

  try {
    const team = await prisma.team.update({
      where: { id: parseInt(id) },
      data: validation.data,
      include: {
        teamPlayers: {
          include: {
            player: true,
          },
        },
      },
    })

    return successResponse(team, 'Team updated successfully')
  } catch (error) {
    return handleApiError(error)
  }
}

// DELETE /api/teams/[id] - Delete team
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.team.delete({
      where: { id: parseInt(id) },
    })

    return successResponse(null, 'Team deleted successfully')
  } catch (error) {
    return handleApiError(error)
  }
}
