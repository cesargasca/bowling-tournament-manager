import { NextRequest } from 'next/server'
import { parse } from 'csv-parse/sync'
import prisma from '@/lib/prisma'
import { successResponse, handleApiError, errorResponse } from '@/lib/utils/api'

interface SessionRow {
  session: string
  date: string
  laneAssignments: Record<string, string> // laneNumber -> teamName
}

interface ParsedCSVData {
  sessions: SessionRow[]
}

/**
 * Parse session CSV data
 * Expected format:
 * Session,Date,Lane17,Lane18,Lane19,...,Lane34
 * 1a,Nov 11,TEAM1,TEAM2,TEAM3,...
 */
function parseSessionCSV(csvContent: string): ParsedCSVData {
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  })

  const sessions: SessionRow[] = []

  for (const record of records) {
    const session = record.Session || record.session
    const date = record.Date || record.date

    if (!session || !date) {
      throw new Error(`Missing session or date in row: ${JSON.stringify(record)}`)
    }

    const laneAssignments: Record<string, string> = {}

    // Extract lane assignments (Lane17 through Lane34)
    for (let laneNum = 17; laneNum <= 34; laneNum++) {
      const laneKey = `Lane${laneNum}`
      const teamName = record[laneKey]

      if (teamName && teamName.trim()) {
        laneAssignments[laneNum.toString()] = teamName.trim()
      }
    }

    sessions.push({
      session,
      date,
      laneAssignments,
    })
  }

  return { sessions }
}

/**
 * Parse date string (e.g., "Nov 11", "Jan 20") into a Date object
 * Uses the tournament's year context or current year
 */
function parseSessionDate(dateStr: string, baseYear?: number): Date {
  const monthMap: Record<string, number> = {
    jan: 0, january: 0,
    feb: 1, february: 1,
    mar: 2, march: 2,
    apr: 3, april: 3,
    may: 4,
    jun: 5, june: 5,
    jul: 6, july: 6,
    aug: 7, august: 7,
    sep: 8, september: 8,
    oct: 9, october: 9,
    nov: 10, november: 10,
    dec: 11, december: 11,
  }

  const parts = dateStr.trim().split(/\s+/)
  if (parts.length < 2) {
    throw new Error(`Invalid date format: ${dateStr}. Expected format: "Nov 11" or "November 11"`)
  }

  const monthStr = parts[0].toLowerCase()
  const day = parseInt(parts[1], 10)

  const month = monthMap[monthStr]
  if (month === undefined) {
    throw new Error(`Invalid month: ${parts[0]}`)
  }

  if (isNaN(day) || day < 1 || day > 31) {
    throw new Error(`Invalid day: ${parts[1]}`)
  }

  // Use provided year or current year
  const year = baseYear || new Date().getFullYear()

  return new Date(year, month, day)
}

// POST /api/tournaments/[id]/import-session-csv - Import session schedule from CSV
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tournamentId = parseInt(params.id, 10)

    if (isNaN(tournamentId)) {
      return errorResponse('Invalid tournament ID', 400)
    }

    // Verify tournament exists
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    })

    if (!tournament) {
      return errorResponse('Tournament not found', 404)
    }

    // Get form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const yearStr = formData.get('year') as string | null

    if (!file) {
      return errorResponse('No file provided', 400)
    }

    // Read CSV content
    const csvContent = await file.text()

    if (!csvContent || csvContent.trim().length === 0) {
      return errorResponse('CSV file is empty', 400)
    }

    // Parse CSV
    let parsedData: ParsedCSVData
    try {
      parsedData = parseSessionCSV(csvContent)
    } catch (parseError) {
      return errorResponse(
        `CSV parsing error: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
        400
      )
    }

    if (parsedData.sessions.length === 0) {
      return errorResponse('No sessions found in CSV', 400)
    }

    // Parse year if provided
    const baseYear = yearStr ? parseInt(yearStr, 10) : undefined
    if (yearStr && (isNaN(baseYear!) || baseYear! < 2000 || baseYear! > 2100)) {
      return errorResponse('Invalid year provided', 400)
    }

    // Get all teams for this tournament
    const teams = await prisma.team.findMany({
      where: { tournamentId },
      select: { id: true, name: true },
    })

    const teamMap = new Map(teams.map(t => [t.name.toUpperCase(), t]))

    // Get all lanes
    const lanes = await prisma.lane.findMany({
      select: { id: true, laneNumber: true, opponentLaneId: true },
    })

    const laneByNumber = new Map(lanes.map(l => [l.laneNumber, l]))

    // Process sessions in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const createdSessions = []
      const errors = []

      for (const sessionRow of parsedData.sessions) {
        try {
          // Parse date
          let sessionDate: Date
          try {
            sessionDate = parseSessionDate(sessionRow.date, baseYear)
          } catch (dateError) {
            errors.push({
              session: sessionRow.session,
              error: `Date parsing error: ${dateError instanceof Error ? dateError.message : 'Unknown error'}`,
            })
            continue
          }

          // Create session
          const session = await tx.session.create({
            data: {
              tournamentId,
              sessionDate,
            },
          })

          // Create matchups for each lane pair
          const matchupsCreated = []
          const processedLanes = new Set<number>()

          for (const [laneNumStr, teamName] of Object.entries(sessionRow.laneAssignments)) {
            const laneNum = parseInt(laneNumStr, 10)

            // Skip if already processed (we process pairs)
            if (processedLanes.has(laneNum)) {
              continue
            }

            const lane = laneByNumber.get(laneNum)
            if (!lane) {
              errors.push({
                session: sessionRow.session,
                error: `Lane ${laneNum} not found in database`,
              })
              continue
            }

            // Get team A
            const teamA = teamMap.get(teamName.toUpperCase())
            if (!teamA) {
              errors.push({
                session: sessionRow.session,
                error: `Team "${teamName}" not found for lane ${laneNum}`,
              })
              continue
            }

            // Get opponent lane
            if (!lane.opponentLaneId) {
              errors.push({
                session: sessionRow.session,
                error: `Lane ${laneNum} has no opponent lane configured`,
              })
              continue
            }

            const opponentLane = lanes.find(l => l.id === lane.opponentLaneId)
            if (!opponentLane) {
              errors.push({
                session: sessionRow.session,
                error: `Opponent lane for ${laneNum} not found`,
              })
              continue
            }

            // Get team B from opponent lane
            const opponentTeamName = sessionRow.laneAssignments[opponentLane.laneNumber.toString()]
            const teamB = opponentTeamName ? teamMap.get(opponentTeamName.toUpperCase()) : null

            // Create matchup (teamB can be null if lane is empty)
            await tx.sessionMatchup.create({
              data: {
                sessionId: session.id,
                laneId: lane.id,
                teamAId: teamA.id,
                teamBId: teamB?.id || null,
              },
            })

            matchupsCreated.push({
              lane: laneNum,
              teamA: teamName,
              teamB: opponentTeamName || 'BYE',
            })

            // Mark both lanes as processed
            processedLanes.add(laneNum)
            processedLanes.add(opponentLane.laneNumber)
          }

          createdSessions.push({
            session: sessionRow.session,
            date: sessionDate.toISOString().split('T')[0],
            matchupsCount: matchupsCreated.length,
            matchups: matchupsCreated,
          })
        } catch (sessionError) {
          errors.push({
            session: sessionRow.session,
            error: sessionError instanceof Error ? sessionError.message : 'Unknown error',
          })
        }
      }

      return { createdSessions, errors }
    })

    return successResponse({
      message: `Successfully imported ${result.createdSessions.length} sessions`,
      sessions: result.createdSessions,
      errors: result.errors.length > 0 ? result.errors : undefined,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
