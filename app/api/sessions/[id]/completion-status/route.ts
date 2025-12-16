import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, handleApiError } from '@/lib/utils/api'

// GET /api/sessions/[id]/completion-status - Check if session can be edited
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const sessionId = parseInt(id)

    // Get the current session
    const currentSession = await prisma.session.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        sessionDate: true,
        tournamentId: true,
      },
    })

    if (!currentSession) {
      return Response.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      )
    }

    // Get all sessions in this tournament ordered by date
    const allSessions = await prisma.session.findMany({
      where: {
        tournamentId: currentSession.tournamentId,
      },
      orderBy: {
        sessionDate: 'asc',
      },
      select: {
        id: true,
        sessionDate: true,
        completed: true,
      },
    })

    // Find current session index
    const currentIndex = allSessions.findIndex(s => s.id === sessionId)

    if (currentIndex === -1) {
      return Response.json(
        { success: false, error: 'Session not found in list' },
        { status: 404 }
      )
    }

    // If this is the first session, it can always be edited
    if (currentIndex === 0) {
      return successResponse({
        canEdit: true,
        reason: 'First session in tournament',
        previousSessionComplete: null,
      })
    }

    // Check if previous session is marked as complete
    const previousSession = allSessions[currentIndex - 1]
    const isComplete = previousSession.completed

    return successResponse({
      canEdit: isComplete,
      reason: isComplete
        ? 'Previous session is complete'
        : `Previous session (${new Date(previousSession.sessionDate).toLocaleDateString()}) must be marked as complete before editing this session`,
      previousSessionComplete: isComplete,
      previousSessionId: previousSession.id,
      previousSessionDate: previousSession.sessionDate,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
