import { TeamPlayerSessionWithDetails, LineScore, SessionPoints, SessionResult } from '@/types'

/**
 * Calculate handicap for a player
 * Formula: (basis - average) * (percentage / 100)
 * Example: (200 - 150) * 0.9 = 45
 */
export function calculateHandicap(
  average: number,
  basis: number = 200,
  percentage: number = 90
): number {
  if (average >= basis) return 0
  const handicap = Math.round((basis - average) * (percentage / 100))
  return Math.max(0, handicap)
}

/**
 * Calculate team totals for each line and overall
 */
export function calculateLineScores(
  teamPlayerSessions: TeamPlayerSessionWithDetails[]
): LineScore {
  if (teamPlayerSessions.length === 0) {
    throw new Error('No team player sessions provided')
  }

  const teamId = teamPlayerSessions[0].teamPlayer.teamId
  const teamName = teamPlayerSessions[0].teamPlayer.team.name

  let line1Total = 0
  let line2Total = 0
  let line3Total = 0
  let totalHandicap = 0
  let playersPresent = 0
  let playersPaid = 0

  for (const tps of teamPlayerSessions) {
    // Add pins
    line1Total += tps.line1
    line2Total += tps.line2
    line3Total += tps.line3

    // Add handicap (handicap is applied to each line, so multiply by 3)
    totalHandicap += tps.handicap * 3

    // Count attendance
    if (tps.assistance) {
      playersPresent++
    }

    // Count payment
    if (tps.payment) {
      playersPaid++
    }
  }

  const totalPins = line1Total + line2Total + line3Total
  const grandTotal = totalPins + totalHandicap

  return {
    teamId,
    teamName,
    line1Total: line1Total + teamPlayerSessions.reduce((sum, tps) => sum + tps.handicap, 0),
    line2Total: line2Total + teamPlayerSessions.reduce((sum, tps) => sum + tps.handicap, 0),
    line3Total: line3Total + teamPlayerSessions.reduce((sum, tps) => sum + tps.handicap, 0),
    totalPins,
    totalHandicap,
    grandTotal,
    playersPresent,
    playersPaid,
  }
}

/**
 * Determine the winner of a single line
 * Returns teamId of winner, or null if tie
 */
function determineLineWinner(
  teamATotal: number,
  teamBTotal: number,
  teamAId: number,
  teamBId: number
): number | null {
  if (teamATotal > teamBTotal) return teamAId
  if (teamBTotal > teamATotal) return teamBId
  return null // tie
}

/**
 * Calculate session points based on the 6-point system
 *
 * Points distribution:
 * 1. Line 1 Winner (1 point)
 * 2. Line 2 Winner (1 point)
 * 3. Line 3 Winner (1 point)
 * 4. Total Pins Winner (1 point)
 * 5. Assistance Point (1 point) - Team with at least 3 of 4 players present
 * 6. Payment Point (1 point) - Team with all 4 players paid
 */
export function calculateSessionPoints(
  teamAScores: LineScore,
  teamBScores: LineScore
): SessionPoints {
  const points: SessionPoints = {
    line1Winner: null,
    line2Winner: null,
    line3Winner: null,
    totalPinsWinner: null,
    assistanceWinner: null,
    paymentWinner: null,
    teamAPoints: 0,
    teamBPoints: 0,
  }

  // Point 1: Line 1 Winner
  points.line1Winner = determineLineWinner(
    teamAScores.line1Total,
    teamBScores.line1Total,
    teamAScores.teamId,
    teamBScores.teamId
  )
  if (points.line1Winner === teamAScores.teamId) points.teamAPoints++
  else if (points.line1Winner === teamBScores.teamId) points.teamBPoints++

  // Point 2: Line 2 Winner
  points.line2Winner = determineLineWinner(
    teamAScores.line2Total,
    teamBScores.line2Total,
    teamAScores.teamId,
    teamBScores.teamId
  )
  if (points.line2Winner === teamAScores.teamId) points.teamAPoints++
  else if (points.line2Winner === teamBScores.teamId) points.teamBPoints++

  // Point 3: Line 3 Winner
  points.line3Winner = determineLineWinner(
    teamAScores.line3Total,
    teamBScores.line3Total,
    teamAScores.teamId,
    teamBScores.teamId
  )
  if (points.line3Winner === teamAScores.teamId) points.teamAPoints++
  else if (points.line3Winner === teamBScores.teamId) points.teamBPoints++

  // Point 4: Total Pins Winner (total pins + total handicap)
  points.totalPinsWinner = determineLineWinner(
    teamAScores.grandTotal,
    teamBScores.grandTotal,
    teamAScores.teamId,
    teamBScores.teamId
  )
  if (points.totalPinsWinner === teamAScores.teamId) points.teamAPoints++
  else if (points.totalPinsWinner === teamBScores.teamId) points.teamBPoints++

  // Point 5: Assistance Point (at least 3 of 4 players present)
  const teamAHasAssistance = teamAScores.playersPresent >= 3
  const teamBHasAssistance = teamBScores.playersPresent >= 3

  if (teamAHasAssistance && !teamBHasAssistance) {
    points.assistanceWinner = teamAScores.teamId
    points.teamAPoints++
  } else if (teamBHasAssistance && !teamAHasAssistance) {
    points.assistanceWinner = teamBScores.teamId
    points.teamBPoints++
  }
  // If both or neither have assistance, no one gets the point

  // Point 6: Payment Point (all 4 players paid)
  const teamAHasPayment = teamAScores.playersPaid === 4
  const teamBHasPayment = teamBScores.playersPaid === 4

  if (teamAHasPayment && !teamBHasPayment) {
    points.paymentWinner = teamAScores.teamId
    points.teamAPoints++
  } else if (teamBHasPayment && !teamAHasPayment) {
    points.paymentWinner = teamBScores.teamId
    points.teamBPoints++
  }
  // If both or neither have payment, no one gets the point

  return points
}

/**
 * Calculate complete session results including scores and points
 *
 * @param sessionData - Session details with all team player sessions
 * @param teamAPlayerSessions - Team A player sessions (4 players from one lane)
 * @param teamBPlayerSessions - Team B player sessions (4 players from opponent lane)
 */
export function calculateSessionResult(
  sessionId: number,
  sessionDate: Date,
  laneNumber: number,
  opponentLaneNumber: number,
  teamAPlayerSessions: TeamPlayerSessionWithDetails[],
  teamBPlayerSessions: TeamPlayerSessionWithDetails[]
): SessionResult {
  // Validate input
  if (teamAPlayerSessions.length === 0 || teamBPlayerSessions.length === 0) {
    throw new Error('Both teams must have player sessions')
  }

  // Calculate line scores for each team
  const teamAScores = calculateLineScores(teamAPlayerSessions)
  const teamBScores = calculateLineScores(teamBPlayerSessions)

  // Calculate points
  const points = calculateSessionPoints(teamAScores, teamBScores)

  return {
    sessionId,
    sessionDate,
    laneNumber,
    opponentLaneNumber,
    teamA: teamAScores,
    teamB: teamBScores,
    points,
  }
}

/**
 * Calculate player average across multiple sessions
 */
export function calculatePlayerAverage(games: number[]): number {
  if (games.length === 0) return 0
  const total = games.reduce((sum, game) => sum + game, 0)
  return Math.round(total / games.length)
}

/**
 * Get player statistics from their session history
 */
export function calculatePlayerStatistics(
  playerId: number,
  playerName: string,
  sessions: TeamPlayerSessionWithDetails[]
): {
  gamesPlayed: number
  totalPins: number
  average: number
  highGame: number
  lowGame: number
  attendanceRate: number
  paymentRate: number
} {
  if (sessions.length === 0) {
    return {
      gamesPlayed: 0,
      totalPins: 0,
      average: 0,
      highGame: 0,
      lowGame: 0,
      attendanceRate: 0,
      paymentRate: 0,
    }
  }

  const allGames: number[] = []
  let totalPins = 0
  let attendanceCount = 0
  let paymentCount = 0

  for (const session of sessions) {
    const games = [session.line1, session.line2, session.line3]
    allGames.push(...games)
    totalPins += session.line1 + session.line2 + session.line3

    if (session.assistance) attendanceCount++
    if (session.payment) paymentCount++
  }

  const gamesPlayed = allGames.length
  const average = calculatePlayerAverage(allGames)
  const highGame = Math.max(...allGames)
  const lowGame = Math.min(...allGames)
  const attendanceRate = Math.round((attendanceCount / sessions.length) * 100)
  const paymentRate = Math.round((paymentCount / sessions.length) * 100)

  return {
    gamesPlayed,
    totalPins,
    average,
    highGame,
    lowGame,
    attendanceRate,
    paymentRate,
  }
}
