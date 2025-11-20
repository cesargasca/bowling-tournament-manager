import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, handleApiError, validateRequest } from '@/lib/utils/api'
import { updateTeamPlayerSchema } from '@/lib/validations'

// PUT /api/team-players/[id] - Update team player handicap
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const validation = await validateRequest(request, updateTeamPlayerSchema)
  if (!validation.success) return validation.response

  try {
    const teamPlayer = await prisma.teamPlayer.update({
      where: { id: parseInt(id) },
      data: { handicap: validation.data.handicap },
      include: {
        player: {
          select: {
            id: true,
            name: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
            tournament: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    })

    return successResponse(teamPlayer, 'Player handicap updated successfully')
  } catch (error) {
    return handleApiError(error)
  }
}
