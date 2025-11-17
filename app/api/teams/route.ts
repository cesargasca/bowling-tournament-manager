import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, handleApiError, validateRequest } from '@/lib/utils/api'
import { createTeamSchema } from '@/lib/validations'

// GET /api/teams - List all teams
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const tournamentId = searchParams.get('tournamentId')

    const where = tournamentId
      ? { tournamentId: parseInt(tournamentId) }
      : {}

    const teams = await prisma.team.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        tournament: {
          select: {
            id: true,
            name: true,
          },
        },
        teamPlayers: {
          include: {
            player: true,
          },
        },
        _count: {
          select: {
            teamPlayers: true,
          },
        },
      },
    })

    return successResponse(teams)
  } catch (error) {
    return handleApiError(error)
  }
}

// POST /api/teams - Create a new team
export async function POST(request: NextRequest) {
  const validation = await validateRequest(request, createTeamSchema)
  if (!validation.success) return validation.response

  try {
    const { playerIds, ...teamData } = validation.data

    // Create team with team players in a transaction
    const team = await prisma.$transaction(async (tx) => {
      // Create the team
      const newTeam = await tx.team.create({
        data: teamData,
      })

      // Create team players
      await tx.teamPlayer.createMany({
        data: playerIds.map((playerId) => ({
          teamId: newTeam.id,
          playerId,
          isReplacement: false,
        })),
      })

      // Return team with players
      return tx.team.findUnique({
        where: { id: newTeam.id },
        include: {
          teamPlayers: {
            include: {
              player: true,
            },
          },
        },
      })
    })

    return successResponse(team, 'Team created successfully')
  } catch (error) {
    return handleApiError(error)
  }
}
