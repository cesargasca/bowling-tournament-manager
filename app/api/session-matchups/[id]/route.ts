import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, handleApiError, validateRequest } from '@/lib/utils/api'
import { updateSessionMatchupSchema } from '@/lib/validations'

// GET /api/session-matchups/[id] - Get a specific session matchup
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const matchup = await prisma.sessionMatchup.findUnique({
      where: { id: parseInt(id) },
      include: {
        session: {
          include: {
            tournament: true,
          },
        },
        lane: true,
        teamA: {
          include: {
            teamPlayers: {
              include: {
                player: true,
              },
            },
          },
        },
        teamB: {
          include: {
            teamPlayers: {
              include: {
                player: true,
              },
            },
          },
        },
      },
    })

    if (!matchup) {
      return new Response(
        JSON.stringify({ error: 'Session matchup not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return successResponse(matchup)
  } catch (error) {
    return handleApiError(error)
  }
}

// PATCH /api/session-matchups/[id] - Update a session matchup
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const validation = await validateRequest(request, updateSessionMatchupSchema)
  if (!validation.success) return validation.response

  try {
    const { id } = await params
    const matchup = await prisma.sessionMatchup.update({
      where: { id: parseInt(id) },
      data: validation.data,
      include: {
        session: true,
        lane: true,
        teamA: true,
        teamB: true,
      },
    })

    return successResponse(matchup, 'Session matchup updated successfully')
  } catch (error) {
    return handleApiError(error)
  }
}

// DELETE /api/session-matchups/[id] - Delete a session matchup
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.sessionMatchup.delete({
      where: { id: parseInt(id) },
    })

    return successResponse(null, 'Session matchup deleted successfully')
  } catch (error) {
    return handleApiError(error)
  }
}
