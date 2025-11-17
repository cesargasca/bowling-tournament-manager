import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, handleApiError, validateRequest } from '@/lib/utils/api'
import { createSessionSchema } from '@/lib/validations'

// GET /api/sessions - List all sessions
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const tournamentId = searchParams.get('tournamentId')
    const laneId = searchParams.get('laneId')

    const where: any = {}
    if (tournamentId) where.tournamentId = parseInt(tournamentId)
    if (laneId) where.laneId = parseInt(laneId)

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
        lane: true,
        _count: {
          select: {
            teamPlayerSessions: true,
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
        lane: true,
      },
    })

    return successResponse(session, 'Session created successfully')
  } catch (error) {
    return handleApiError(error)
  }
}
