import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleApiError, validateRequest } from '@/lib/utils/api'
import { updateTeamSchema } from '@/lib/validations'

// GET /api/teams/[id] - Get team details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const team = await prisma.team.findUnique({
      where: { id: parseInt(id) },
      include: {
        tournament: {
          select: {
            id: true,
            name: true,
            teamSize: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
          },
        },
        teamPlayers: {
          include: {
            player: true,
          },
          orderBy: {
            player: {
              name: 'asc',
            },
          },
        },
      },
    })

    if (!team) {
      return errorResponse('Team not found', 404)
    }

    return successResponse(team)
  } catch (error) {
    return handleApiError(error)
  }
}

// PUT /api/teams/[id] - Update team
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const validation = await validateRequest(request, updateTeamSchema)
  if (!validation.success) return validation.response

  try {
    const teamId = parseInt(id)
    const { playerIds, ...updateData } = validation.data

    const team = await prisma.$transaction(async (tx) => {
      // Get the team's tournament info
      const currentTeam = await tx.team.findUnique({
        where: { id: teamId },
        select: {
          tournamentId: true,
          tournament: {
            select: {
              teamSize: true,
              name: true,
            },
          },
        },
      })

      if (!currentTeam) {
        throw new Error('Team not found')
      }

      // If playerIds are provided, update team players
      if (playerIds !== undefined) {
        // Validate team size matches tournament requirement
        if (playerIds.length !== currentTeam.tournament.teamSize) {
          throw new Error(
            `Team must have exactly ${currentTeam.tournament.teamSize} player${currentTeam.tournament.teamSize !== 1 ? 's' : ''} for this tournament`
          )
        }

        // Check if any of the new players are in other teams in this tournament
        if (playerIds.length > 0) {
          const existingTeamPlayers = await tx.teamPlayer.findMany({
            where: {
              playerId: { in: playerIds },
              team: {
                tournamentId: currentTeam.tournamentId,
              },
              teamId: { not: teamId }, // Exclude current team
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
              `Cannot update team: ${conflictDetails}. A player can only be in one team per tournament.`
            )
          }
        }

        // Delete all existing team players
        await tx.teamPlayer.deleteMany({
          where: { teamId },
        })

        // Create new team players
        if (playerIds.length > 0) {
          await tx.teamPlayer.createMany({
            data: playerIds.map((playerId) => ({
              teamId,
              playerId,
              isReplacement: false,
            })),
          })
        }
      }

      // Update team data (name, laneId, groupId, etc.)
      return tx.team.update({
        where: { id: teamId },
        data: updateData,
        include: {
          teamPlayers: {
            include: {
              player: true,
            },
            orderBy: {
              player: {
                name: 'asc',
              },
            },
          },
          tournament: {
            select: {
              id: true,
              name: true,
            },
          },
          group: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })
    })

    return successResponse(team, 'Team updated successfully')
  } catch (error) {
    return handleApiError(error)
  }
}

// DELETE /api/teams/[id] - Delete team
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.team.delete({
      where: { id: parseInt(id) },
    })

    return successResponse(null, 'Team deleted successfully')
  } catch (error) {
    return handleApiError(error)
  }
}
