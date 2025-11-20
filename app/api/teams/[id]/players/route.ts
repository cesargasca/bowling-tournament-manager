import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api'
import { z } from 'zod'

const manageTeamPlayersSchema = z.object({
  addPlayers: z.array(
    z.object({
      playerId: z.number().int().positive(),
      isReplacement: z.boolean().default(false),
    })
  ).optional().default([]),
  removePlayerIds: z.array(z.number().int().positive()).optional().default([]),
})

// POST /api/teams/[id]/players - Add or remove players from a team
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const teamId = parseInt(id)
    const body = await request.json()

    const validation = manageTeamPlayersSchema.safeParse(body)
    if (!validation.success) {
      return errorResponse(validation.error.errors[0].message, 400)
    }

    const { addPlayers, removePlayerIds } = validation.data

    // Get the team to find its tournament
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { tournamentId: true },
    })

    if (!team) {
      return errorResponse('Team not found', 404)
    }

    // Perform operations in a transaction
    const updatedTeam = await prisma.$transaction(async (tx) => {
      // If adding players, check they're not already in another team in this tournament
      if (addPlayers.length > 0) {
        const playerIds = addPlayers.map(p => p.playerId)
        const existingTeamPlayers = await tx.teamPlayer.findMany({
          where: {
            playerId: { in: playerIds },
            team: {
              tournamentId: team.tournamentId,
            },
          },
          include: {
            player: true,
            team: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        })

        // Filter out conflicts from the current team (in case of duplicate request)
        const conflicts = existingTeamPlayers.filter((tp) => tp.teamId !== teamId)

        if (conflicts.length > 0) {
          const conflictDetails = conflicts
            .map((tp) => `${tp.player.name} is already in team "${tp.team.name}"`)
            .join(', ')
          throw new Error(
            `Cannot add players: ${conflictDetails}. A player can only be in one team per tournament.`
          )
        }

        // Add new players with their initial handicaps
        for (const player of addPlayers) {
          // Get the player's initial handicap
          const playerData = await tx.player.findUnique({
            where: { id: player.playerId },
            select: { initialHandicap: true },
          })

          await tx.teamPlayer.upsert({
            where: {
              teamId_playerId: {
                teamId,
                playerId: player.playerId,
              },
            },
            create: {
              teamId,
              playerId: player.playerId,
              isReplacement: player.isReplacement,
              handicap: playerData?.initialHandicap ?? 0,
            },
            update: {}, // Don't update if already exists
          })
        }
      }

      // Remove players
      if (removePlayerIds.length > 0) {
        await tx.teamPlayer.deleteMany({
          where: {
            teamId,
            playerId: { in: removePlayerIds },
          },
        })
      }

      // Return updated team with players
      return tx.team.findUnique({
        where: { id: teamId },
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
        },
      })
    })

    return successResponse(updatedTeam, 'Team players updated successfully')
  } catch (error) {
    return handleApiError(error)
  }
}
