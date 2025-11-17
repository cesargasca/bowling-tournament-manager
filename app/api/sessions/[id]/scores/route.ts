import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleApiError, validateRequest } from '@/lib/utils/api'
import { scoreEntrySchema } from '@/lib/validations'

// POST /api/sessions/[id]/scores - Save/update scores for a session
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const sessionId = parseInt(id)

  const validation = await validateRequest(request, scoreEntrySchema)
  if (!validation.success) return validation.response

  try {
    // Verify session exists
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { lane: true },
    })

    if (!session) {
      return errorResponse('Session not found', 404)
    }

    // Use transaction to save all scores
    const result = await prisma.$transaction(async (tx) => {
      const savedScores = []

      for (const score of validation.data.scores) {
        // Verify team player exists
        const teamPlayer = await tx.teamPlayer.findUnique({
          where: { id: score.teamPlayerId },
          include: { team: true },
        })

        if (!teamPlayer) {
          throw new Error(`Team player ${score.teamPlayerId} not found`)
        }

        // Upsert team player session
        const teamPlayerSession = await tx.teamPlayerSession.upsert({
          where: {
            teamPlayerId_sessionId: {
              teamPlayerId: score.teamPlayerId,
              sessionId,
            },
          },
          create: {
            teamPlayerId: score.teamPlayerId,
            sessionId,
            laneId: session.laneId,
            line1: score.line1,
            line2: score.line2,
            line3: score.line3,
            handicap: score.handicap,
            assistance: score.assistance,
            payment: score.payment,
          },
          update: {
            line1: score.line1,
            line2: score.line2,
            line3: score.line3,
            handicap: score.handicap,
            assistance: score.assistance,
            payment: score.payment,
          },
        })

        savedScores.push(teamPlayerSession)
      }

      return savedScores
    })

    return successResponse(result, 'Scores saved successfully')
  } catch (error) {
    return handleApiError(error)
  }
}

// GET /api/sessions/[id]/scores - Get scores for a session
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const sessionId = parseInt(id)

    const scores = await prisma.teamPlayerSession.findMany({
      where: { sessionId },
      include: {
        teamPlayer: {
          include: {
            player: true,
            team: true,
          },
        },
        lane: true,
      },
      orderBy: [
        { teamPlayer: { teamId: 'asc' } },
        { teamPlayer: { player: { name: 'asc' } } },
      ],
    })

    return successResponse(scores)
  } catch (error) {
    return handleApiError(error)
  }
}
