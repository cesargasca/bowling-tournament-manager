import { z } from 'zod'

// Bowling validations
export const createBowlingSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
})

export const updateBowlingSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
})

// Tournament validations
export const createTournamentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
  bowlingId: z.number().int().positive('Bowling alley is required'),
})

export const updateTournamentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
  bowlingId: z.number().int().positive('Bowling alley is required'),
})

// Team validations
export const createTeamSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
  tournamentId: z.number().int().positive('Tournament is required'),
  laneId: z.number().int().positive().optional(),
  playerIds: z
    .array(z.number().int().positive())
    .length(4, 'Team must have exactly 4 players'),
})

export const updateTeamSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
  laneId: z.number().int().positive().optional().nullable(),
})

// Player validations
export const createPlayerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
})

export const updatePlayerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
})

// Session validations
export const createSessionSchema = z.object({
  tournamentId: z.number().int().positive('Tournament is required'),
  laneId: z.number().int().positive('Lane is required'),
  sessionDate: z.string().or(z.date()),
})

export const updateSessionSchema = z.object({
  sessionDate: z.string().or(z.date()),
})

// Lane validations
export const createLaneSchema = z.object({
  laneNumber: z.number().int().positive('Lane number is required'),
  opponentLaneId: z.number().int().positive().optional(),
})

export const updateLaneSchema = z.object({
  laneNumber: z.number().int().positive().optional(),
  opponentLaneId: z.number().int().positive().optional().nullable(),
})

// Score entry validations
export const scoreEntrySchema = z.object({
  sessionId: z.number().int().positive('Session is required'),
  scores: z.array(
    z.object({
      teamPlayerId: z.number().int().positive(),
      playerId: z.number().int().positive(),
      line1: z.number().int().min(0).max(300, 'Line 1 score must be between 0 and 300'),
      line2: z.number().int().min(0).max(300, 'Line 2 score must be between 0 and 300'),
      line3: z.number().int().min(0).max(300, 'Line 3 score must be between 0 and 300'),
      handicap: z.number().int().min(0).max(100, 'Handicap must be between 0 and 100'),
      assistance: z.boolean(),
      payment: z.boolean(),
    })
  ),
})

// Team player validations
export const addTeamPlayerSchema = z.object({
  teamId: z.number().int().positive(),
  playerId: z.number().int().positive(),
  isReplacement: z.boolean().default(false),
})

// Handicap calculation input
export const calculateHandicapSchema = z.object({
  average: z.number().min(0).max(300),
  basis: z.number().min(0).max(300).default(200), // e.g., 200
  percentage: z.number().min(0).max(100).default(90), // e.g., 90%
})

// Query parameter validations
export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
})

export const tournamentQuerySchema = paginationSchema.extend({
  bowlingId: z.number().int().positive().optional(),
})

export const teamQuerySchema = paginationSchema.extend({
  tournamentId: z.number().int().positive().optional(),
})

export const sessionQuerySchema = paginationSchema.extend({
  tournamentId: z.number().int().positive().optional(),
  laneId: z.number().int().positive().optional(),
})

// Type exports for use in components
export type CreateBowlingInput = z.infer<typeof createBowlingSchema>
export type UpdateBowlingInput = z.infer<typeof updateBowlingSchema>
export type CreateTournamentInput = z.infer<typeof createTournamentSchema>
export type UpdateTournamentInput = z.infer<typeof updateTournamentSchema>
export type CreateTeamInput = z.infer<typeof createTeamSchema>
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>
export type CreatePlayerInput = z.infer<typeof createPlayerSchema>
export type UpdatePlayerInput = z.infer<typeof updatePlayerSchema>
export type CreateSessionInput = z.infer<typeof createSessionSchema>
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>
export type CreateLaneInput = z.infer<typeof createLaneSchema>
export type UpdateLaneInput = z.infer<typeof updateLaneSchema>
export type ScoreEntryInput = z.infer<typeof scoreEntrySchema>
export type AddTeamPlayerInput = z.infer<typeof addTeamPlayerSchema>
export type CalculateHandicapInput = z.infer<typeof calculateHandicapSchema>
