// Core entity types based on Prisma schema

export type Bowling = {
  id: number
  name: string
  createdAt: Date
  updatedAt: Date
}

export type Tournament = {
  id: number
  name: string
  bowlingId: number
  createdAt: Date
  updatedAt: Date
}

export type Team = {
  id: number
  tournamentId: number
  name: string
  laneId?: number | null
  createdAt: Date
  updatedAt: Date
}

export type Player = {
  id: number
  name: string
  createdAt: Date
  updatedAt: Date
}

export type TeamPlayer = {
  id: number
  teamId: number
  playerId: number
  isReplacement: boolean
  createdAt: Date
  updatedAt: Date
}

export type Session = {
  id: number
  tournamentId: number
  laneId: number
  sessionDate: Date
  createdAt: Date
  updatedAt: Date
}

export type Lane = {
  id: number
  laneNumber: number
  opponentLaneId?: number | null
  createdAt: Date
  updatedAt: Date
}

export type TeamPlayerSession = {
  id: number
  teamPlayerId: number
  sessionId: number
  laneId: number
  line1: number
  line2: number
  line3: number
  payment: boolean
  handicap: number
  assistance: boolean
  createdAt: Date
  updatedAt: Date
}

// Extended types with relations

export type TournamentWithRelations = Tournament & {
  bowling: Bowling
  teams?: Team[]
  sessions?: Session[]
}

export type TeamWithPlayers = Team & {
  teamPlayers: (TeamPlayer & {
    player: Player
  })[]
}

export type TeamWithTournament = Team & {
  tournament: Tournament
}

export type SessionWithDetails = Session & {
  tournament: Tournament
  lane: Lane
  teamPlayerSessions?: TeamPlayerSessionWithDetails[]
}

export type TeamPlayerSessionWithDetails = TeamPlayerSession & {
  teamPlayer: TeamPlayer & {
    player: Player
    team: Team
  }
}

// Scoring types

export type LineScore = {
  teamId: number
  teamName: string
  line1Total: number
  line2Total: number
  line3Total: number
  totalPins: number
  totalHandicap: number
  grandTotal: number
  playersPresent: number
  playersPaid: number
}

export type SessionPoints = {
  line1Winner: number | null // teamId
  line2Winner: number | null
  line3Winner: number | null
  totalPinsWinner: number | null
  assistanceWinner: number | null
  paymentWinner: number | null
  teamAPoints: number
  teamBPoints: number
}

export type SessionResult = {
  sessionId: number
  sessionDate: Date
  laneNumber: number
  opponentLaneNumber: number
  teamA: LineScore
  teamB: LineScore
  points: SessionPoints
}

// Statistics types

export type PlayerStatistics = {
  playerId: number
  playerName: string
  gamesPlayed: number
  totalPins: number
  average: number
  highGame: number
  lowGame: number
  attendanceRate: number
  paymentRate: number
}

export type TeamStatistics = {
  teamId: number
  teamName: string
  totalPoints: number
  sessionsPlayed: number
  wins: number
  losses: number
  ties: number
  totalPins: number
  averagePins: number
}

export type TournamentStandings = {
  tournamentId: number
  tournamentName: string
  teams: TeamStatistics[]
}

// API response types

export type ApiResponse<T> = {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export type PaginatedResponse<T> = {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    totalPages: number
    totalCount: number
  }
}

// Form input types

export type CreateBowlingInput = {
  name: string
}

export type UpdateBowlingInput = {
  name: string
}

export type CreateTournamentInput = {
  name: string
  bowlingId: number
}

export type CreateTeamInput = {
  name: string
  tournamentId: number
  laneId?: number
  playerIds: number[] // 4 players
}

export type CreatePlayerInput = {
  name: string
}

export type CreateSessionInput = {
  tournamentId: number
  laneId: number
  sessionDate: string | Date
}

export type CreateLaneInput = {
  laneNumber: number
  opponentLaneId?: number
}

export type ScoreEntryInput = {
  sessionId: number
  scores: {
    teamPlayerId: number
    playerId: number
    line1: number
    line2: number
    line3: number
    handicap: number
    assistance: boolean
    payment: boolean
  }[]
}
