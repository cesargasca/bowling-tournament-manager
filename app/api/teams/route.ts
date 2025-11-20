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
            teamSize: true,
            substituteCount: true,
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

    // Add warnings for each team
    const teamsWithWarnings = teams.map((team) => {
      const warnings: string[] = []
      const regularPlayers = team.teamPlayers.filter(tp => !tp.isReplacement)
      const substitutes = team.teamPlayers.filter(tp => tp.isReplacement)
      const regularPlayerCount = regularPlayers.length
      const substituteCount = substitutes.length
      const expectedPlayerCount = team.tournament.teamSize
      const expectedSubstituteCount = team.tournament.substituteCount || 0

      if (regularPlayerCount > expectedPlayerCount) {
        warnings.push(
          `Team has ${regularPlayerCount} regular players, which is more than the expected ${expectedPlayerCount}.`
        )
      } else if (regularPlayerCount < expectedPlayerCount) {
        warnings.push(
          `Team has ${regularPlayerCount} regular players, which is less than the expected ${expectedPlayerCount}.`
        )
      }

      if (substituteCount > expectedSubstituteCount) {
        warnings.push(
          `Team has ${substituteCount} substitutes, which is more than the expected ${expectedSubstituteCount}.`
        )
      }

      return { ...team, warnings }
    })

    return successResponse(teamsWithWarnings)
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
      // Check if any player is already in another team in this tournament
      const existingTeamPlayers = await tx.teamPlayer.findMany({
        where: {
          playerId: { in: playerIds },
          team: {
            tournamentId: teamData.tournamentId,
          },
        },
        include: {
          player: true,
          team: {
            select: {
              name: true,
            },
          },
        },
      })

      if (existingTeamPlayers.length > 0) {
        const conflictDetails = existingTeamPlayers
          .map((tp) => `${tp.player.name} is already in team "${tp.team.name}"`)
          .join(', ')
        throw new Error(
          `Cannot create team: ${conflictDetails}. A player can only be in one team per tournament.`
        )
      }

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
          tournament: {
            select: {
              id: true,
              name: true,
              teamSize: true,
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
