import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, handleApiError, validateRequest } from '@/lib/utils/api'
import { createTournamentSchema } from '@/lib/validations'

// GET /api/tournaments - List all tournaments
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const bowlingId = searchParams.get('bowlingId')

    const where = bowlingId
      ? { bowlingId: parseInt(bowlingId) }
      : {}

    const tournaments = await prisma.tournament.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        bowling: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            teams: true,
            sessions: true,
          },
        },
      },
    })

    return successResponse(tournaments)
  } catch (error) {
    return handleApiError(error)
  }
}

// POST /api/tournaments - Create a new tournament
export async function POST(request: NextRequest) {
  const validation = await validateRequest(request, createTournamentSchema)
  if (!validation.success) return validation.response

  try {
    const tournament = await prisma.tournament.create({
      data: validation.data,
      include: {
        bowling: true,
      },
    })

    return successResponse(tournament, 'Tournament created successfully')
  } catch (error) {
    return handleApiError(error)
  }
}
