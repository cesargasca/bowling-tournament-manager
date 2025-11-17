import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, handleApiError, validateRequest } from '@/lib/utils/api'
import { createSessionSchema } from '@/lib/validations'

// GET /api/sessions - List all sessions
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const tournamentId = searchParams.get('tournamentId')

    const where: any = {}
    if (tournamentId) where.tournamentId = parseInt(tournamentId)

    const sessions = await prisma.session.findMany({
      where,
      orderBy: { sessionDate: 'desc' },
      include: {
        tournament: {
          select: {
            id: true,
            name: true,
          },
        },
        sessionMatchups: {
          include: {
            lane: true,
            teamA: true,
            teamB: true,
          },
        },
        _count: {
          select: {
            teamPlayerSessions: true,
            sessionMatchups: true,
          },
        },
      },
    })

    return successResponse(sessions)
  } catch (error) {
    return handleApiError(error)
  }
}

// POST /api/sessions - Create a new session
export async function POST(request: NextRequest) {
  const validation = await validateRequest(request, createSessionSchema)
  if (!validation.success) return validation.response

  try {
    const session = await prisma.session.create({
      data: {
        ...validation.data,
        sessionDate: new Date(validation.data.sessionDate),
      },
      include: {
        tournament: true,
        sessionMatchups: {
          include: {
            lane: true,
            teamA: true,
            teamB: true,
          },
        },
      },
    })

    return successResponse(session, 'Session created successfully')
  } catch (error) {
    return handleApiError(error)
  }
}
