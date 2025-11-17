import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'

export type ApiResponse<T> = {
  success: boolean
  data?: T
  error?: string
  message?: string
}

/**
 * Create a successful API response
 */
export function successResponse<T>(data: T, message?: string) {
  return NextResponse.json<ApiResponse<T>>(
    {
      success: true,
      data,
      message,
    },
    { status: 200 }
  )
}

/**
 * Create an error API response
 */
export function errorResponse(error: string, status: number = 400) {
  return NextResponse.json<ApiResponse<never>>(
    {
      success: false,
      error,
    },
    { status }
  )
}

/**
 * Create a validation error response
 */
export function validationErrorResponse(errors: Record<string, string[]>) {
  return NextResponse.json(
    {
      success: false,
      error: 'Validation failed',
      errors,
    },
    { status: 400 }
  )
}

/**
 * Handle errors and return appropriate response
 */
export function handleApiError(error: unknown): NextResponse {
  console.error('API Error:', error)

  // Zod validation error
  if (error instanceof ZodError) {
    const errors: Record<string, string[]> = {}
    error.errors.forEach((err) => {
      const path = err.path.join('.')
      if (!errors[path]) errors[path] = []
      errors[path].push(err.message)
    })
    return validationErrorResponse(errors)
  }

  // Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return errorResponse('A record with this value already exists', 409)
      case 'P2025':
        return errorResponse('Record not found', 404)
      case 'P2003':
        return errorResponse('Referenced record does not exist', 400)
      case 'P2014':
        return errorResponse('Invalid relation', 400)
      default:
        return errorResponse('Database error occurred', 500)
    }
  }

  // Generic errors
  if (error instanceof Error) {
    return errorResponse(error.message, 500)
  }

  return errorResponse('An unexpected error occurred', 500)
}

/**
 * Parse request body and validate with Zod schema
 */
export async function validateRequest<T>(
  request: Request,
  schema: { parse: (data: unknown) => T }
): Promise<{ success: true; data: T } | { success: false; response: NextResponse }> {
  try {
    const body = await request.json()
    const data = schema.parse(body)
    return { success: true, data }
  } catch (error) {
    return { success: false, response: handleApiError(error) }
  }
}

/**
 * Extract and validate query parameters
 */
export function validateQueryParams<T>(
  searchParams: URLSearchParams,
  schema: { parse: (data: unknown) => T }
): { success: true; data: T } | { success: false; response: NextResponse } {
  try {
    const params: Record<string, string | number> = {}
    searchParams.forEach((value, key) => {
      // Try to parse as number if possible
      const numValue = Number(value)
      params[key] = isNaN(numValue) ? value : numValue
    })
    const data = schema.parse(params)
    return { success: true, data }
  } catch (error) {
    return { success: false, response: handleApiError(error) }
  }
}

/**
 * Create pagination metadata
 */
export function createPagination(
  page: number,
  pageSize: number,
  totalCount: number
) {
  const totalPages = Math.ceil(totalCount / pageSize)
  return {
    page,
    pageSize,
    totalPages,
    totalCount,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  }
}

/**
 * Calculate pagination offset
 */
export function getPaginationOffset(page: number, pageSize: number): number {
  return (page - 1) * pageSize
}
