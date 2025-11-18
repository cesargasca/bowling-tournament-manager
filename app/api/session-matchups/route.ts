import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, handleApiError, validateRequest } from '@/lib/utils/api'
import { createSessionMatchupSchema } from '@/lib/validations'

// GET /api/session-matchups - List all session matchups
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const sessionId = searchParams.get('sessionId')

    const where: any = {}
    if (sessionId) where.sessionId = parseInt(sessionId)

    const matchups = await prisma.sessionMatchup.findMany({
      where,
      orderBy: { laneId: 'asc' },
      include: {
        session: {
          select: {
            id: true,
            sessionDate: true,
            tournament: {
              select: {
                id: true,
                name: true,
              },
            },
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

    return successResponse(matchups)
  } catch (error) {
    return handleApiError(error)
  }
}

// POST /api/session-matchups - Create a new session matchup
export async function POST(request: NextRequest) {
  const validation = await validateRequest(request, createSessionMatchupSchema)
  if (!validation.success) return validation.response

  try {
    const matchup = await prisma.sessionMatchup.create({
      data: validation.data,
      include: {
        session: true,
        lane: true,
        teamA: true,
        teamB: true,
      },
    })

    return successResponse(matchup, 'Session matchup created successfully')
  } catch (error) {
    return handleApiError(error)
  }
}
