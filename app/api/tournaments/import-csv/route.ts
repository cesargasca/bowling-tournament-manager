import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api'

interface CSVRow {
  teamName: string
  group?: string
  playerName: string
  email?: string
  phone?: string
  handicap?: string
  category?: string
  substitute?: string
}

// POST /api/tournaments/import-csv - Import teams and players from CSV
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tournamentId, csvData } = body

    if (!tournamentId) {
      return errorResponse('Tournament ID is required', 400)
    }

    if (!csvData || !Array.isArray(csvData) || csvData.length === 0) {
      return errorResponse('CSV data is required', 400)
    }

    // Verify tournament exists
    const tournament = await prisma.tournament.findUnique({
      where: { id: parseInt(tournamentId) },
      include: {
        _count: {
          select: {
            teams: true,
          },
        },
      },
    })

    if (!tournament) {
      return errorResponse('Tournament not found', 404)
    }

    // Check if tournament already has teams
    if (tournament._count.teams > 0) {
      return errorResponse(
        'Tournament already has teams. CSV import is only available during tournament creation.',
        400
      )
    }

    // Helper function to check if player is a substitute
    const isSubstitute = (value?: string): boolean => {
      if (!value) return false
      const normalized = value.trim().toLowerCase()
      return normalized === 's' || normalized === 'substitute' || normalized === 'yes' || normalized === 'true' || normalized === '1'
    }

    // Group players by team
    const teamMap = new Map<string, { group?: string; players: CSVRow[]; substitutes: CSVRow[] }>()

    for (const row of csvData) {
      if (!row.teamName || !row.playerName) {
        continue // Skip invalid rows
      }

      if (!teamMap.has(row.teamName)) {
        teamMap.set(row.teamName, { group: row.group, players: [], substitutes: [] })
      }

      const teamData = teamMap.get(row.teamName)!
      if (isSubstitute(row.substitute)) {
        teamData.substitutes.push(row)
      } else {
        teamData.players.push(row)
      }
    }

    // Validate substitute counts don't exceed tournament configuration
    const invalidTeams: string[] = []
    for (const [teamName, data] of teamMap.entries()) {
      const substitutePlayerCount = data.substitutes.length

      if (substitutePlayerCount > tournament.substituteCount) {
        invalidTeams.push(`${teamName} (has ${substitutePlayerCount} substitutes, maximum allowed is ${tournament.substituteCount})`)
      }
    }

    if (invalidTeams.length > 0) {
      return errorResponse(
        `Teams exceed substitute limits: ${invalidTeams.join(', ')}`,
        400
      )
    }

    // Process the import in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const createdTeams: any[] = []
      const createdPlayers: any[] = []
      const existingPlayers: any[] = []
      const createdGroups: any[] = []
      const createdCategories: any[] = []

      // Create/find groups and categories first
      const groupCache = new Map<string, number>()
      const categoryCache = new Map<string, number>()

      // Process groups
      const uniqueGroups = new Set<string>()
      for (const [, data] of teamMap.entries()) {
        if (data.group) {
          uniqueGroups.add(data.group)
        }
      }

      for (const groupName of uniqueGroups) {
        let group = await tx.tournamentGroup.findFirst({
          where: {
            tournamentId: parseInt(tournamentId),
            name: groupName,
          },
        })

        if (!group) {
          group = await tx.tournamentGroup.create({
            data: {
              tournamentId: parseInt(tournamentId),
              name: groupName,
            },
          })
          createdGroups.push(group)
        }

        groupCache.set(groupName, group.id)
      }

      // Process categories
      const uniqueCategories = new Set<string>()
      for (const [, data] of teamMap.entries()) {
        for (const player of data.players) {
          if (player.category) {
            uniqueCategories.add(player.category)
          }
        }
      }

      for (const categoryName of uniqueCategories) {
        let category = await tx.playerCategory.findFirst({
          where: {
            tournamentId: parseInt(tournamentId),
            name: categoryName,
          },
        })

        if (!category) {
          category = await tx.playerCategory.create({
            data: {
              tournamentId: parseInt(tournamentId),
              name: categoryName,
            },
          })
          createdCategories.push(category)
        }

        categoryCache.set(categoryName, category.id)
      }

      // Process teams and players
      for (const [teamName, data] of teamMap.entries()) {
        // Create the team
        const team = await tx.team.create({
          data: {
            name: teamName,
            tournamentId: parseInt(tournamentId),
            groupId: data.group ? groupCache.get(data.group) : null,
          },
        })

        createdTeams.push(team)

        // Helper function to process a player
        const processPlayer = async (playerData: CSVRow, isSubstitute: boolean) => {
          const playerName = playerData.playerName.trim()
          const email = playerData.email?.trim() || null
          const phone = playerData.phone?.trim() || null
          const handicap = playerData.handicap
            ? parseInt(playerData.handicap)
            : 0

          // Check if player exists by name
          let player = await tx.player.findFirst({
            where: { name: playerName },
          })

          if (player) {
            existingPlayers.push(player)

            // Update player info if new data provided
            if (email || phone || handicap) {
              player = await tx.player.update({
                where: { id: player.id },
                data: {
                  ...(email && { email }),
                  ...(phone && { phone }),
                  ...(handicap && { initialHandicap: handicap }),
                },
              })
            }
          } else {
            // Create new player
            player = await tx.player.create({
              data: {
                name: playerName,
                email,
                phone,
                initialHandicap: handicap,
              },
            })
            createdPlayers.push(player)
          }

          // Add player to team
          await tx.teamPlayer.create({
            data: {
              teamId: team.id,
              playerId: player.id,
              isReplacement: isSubstitute,
            },
          })

          // Assign player to category if provided
          if (playerData.category && categoryCache.has(playerData.category)) {
            const categoryId = categoryCache.get(playerData.category)!

            // Check if assignment already exists
            const existingAssignment = await tx.playerTournamentCategory.findUnique({
              where: {
                playerId_tournamentId: {
                  playerId: player.id,
                  tournamentId: parseInt(tournamentId),
                },
              },
            })

            if (!existingAssignment) {
              await tx.playerTournamentCategory.create({
                data: {
                  playerId: player.id,
                  tournamentId: parseInt(tournamentId),
                  categoryId,
                  isManual: true,
                },
              })
            }
          }
        }

        // Process regular players
        for (const playerData of data.players) {
          await processPlayer(playerData, false)
        }

        // Process substitute players
        for (const playerData of data.substitutes) {
          await processPlayer(playerData, true)
        }
      }

      return {
        teamsCreated: createdTeams.length,
        playersCreated: createdPlayers.length,
        playersReused: existingPlayers.length,
        groupsCreated: createdGroups.length,
        categoriesCreated: createdCategories.length,
        teams: createdTeams,
        groups: createdGroups,
        categories: createdCategories,
      }
    })

    return successResponse(result, 'CSV imported successfully')
  } catch (error) {
    console.error('CSV import error:', error)
    return handleApiError(error)
  }
}
