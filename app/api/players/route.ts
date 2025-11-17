import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, handleApiError, validateRequest } from '@/lib/utils/api'
import { createPlayerSchema } from '@/lib/validations'

// GET /api/players - List all players
export async function GET() {
  try {
    const players = await prisma.player.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { teamPlayers: true },
        },
      },
    })

    return successResponse(players)
  } catch (error) {
    return handleApiError(error)
  }
}

// POST /api/players - Create a new player
export async function POST(request: NextRequest) {
  const validation = await validateRequest(request, createPlayerSchema)
  if (!validation.success) return validation.response

  try {
    const player = await prisma.player.create({
      data: validation.data,
    })

    return successResponse(player, 'Player created successfully')
  } catch (error) {
    return handleApiError(error)
  }
}
