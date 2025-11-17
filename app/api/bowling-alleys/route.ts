import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleApiError, validateRequest } from '@/lib/utils/api'
import { createBowlingSchema } from '@/lib/validations'

// GET /api/bowling-alleys - List all bowling alleys
export async function GET() {
  try {
    const bowlingAlleys = await prisma.bowling.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { tournaments: true },
        },
      },
    })

    return successResponse(bowlingAlleys)
  } catch (error) {
    return handleApiError(error)
  }
}

// POST /api/bowling-alleys - Create a new bowling alley
export async function POST(request: NextRequest) {
  const validation = await validateRequest(request, createBowlingSchema)
  if (!validation.success) return validation.response

  try {
    const bowlingAlley = await prisma.bowling.create({
      data: validation.data,
    })

    return successResponse(bowlingAlley, 'Bowling alley created successfully')
  } catch (error) {
    return handleApiError(error)
  }
}
