import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Helper function to generate realistic bowling scores
function generateBowlingScore(skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'absent') {
  if (skillLevel === 'absent') {
    return { line1: 0, line2: 0, line3: 0, handicap: 0 }
  }

  const baseScores = {
    beginner: { min: 80, max: 140, avgHandicap: 35 },
    intermediate: { min: 120, max: 180, avgHandicap: 20 },
    advanced: { min: 160, max: 220, avgHandicap: 5 },
  }

  const base = baseScores[skillLevel]
  const variance = 25 // Additional variance per game

  const line1 = Math.floor(Math.random() * (base.max - base.min + variance)) + base.min - variance / 2
  const line2 = Math.floor(Math.random() * (base.max - base.min + variance)) + base.min - variance / 2
  const line3 = Math.floor(Math.random() * (base.max - base.min + variance)) + base.min - variance / 2

  // Clamp scores between 0 and 300
  const clamp = (val: number) => Math.max(0, Math.min(300, val))

  return {
    line1: clamp(line1),
    line2: clamp(line2),
    line3: clamp(line3),
    handicap: Math.floor(Math.random() * 15) + (base.avgHandicap - 7), // ±7 variance
  }
}

async function main() {
  console.log('Starting seed...')

  // Clean existing data
  await prisma.sessionMatchup.deleteMany()
  await prisma.teamPlayerSession.deleteMany()
  await prisma.session.deleteMany()
  await prisma.teamPlayer.deleteMany()
  await prisma.team.deleteMany()
  await prisma.player.deleteMany()
  await prisma.lane.deleteMany()
  await prisma.tournament.deleteMany()
  await prisma.bowling.deleteMany()

  console.log('Cleaned existing data')

  // Create bowling alleys
  const strikeZone = await prisma.bowling.create({
    data: {
      name: 'Strike Zone Bowling',
    },
  })

  const luckyLanes = await prisma.bowling.create({
    data: {
      name: 'Lucky Lanes',
    },
  })

  console.log('Created bowling alleys')

  // Create lanes for Strike Zone (18 lanes with opponent pairs)
  const lanes = []
  for (let i = 1; i <= 18; i += 2) {
    // Create lane i
    const lane1 = await prisma.lane.create({
      data: {
        laneNumber: i,
      },
    })

    // Create lane i+1 and set opponents
    const lane2 = await prisma.lane.create({
      data: {
        laneNumber: i + 1,
        opponentLaneId: lane1.id,
      },
    })

    // Update lane1 to point to lane2
    await prisma.lane.update({
      where: { id: lane1.id },
      data: { opponentLaneId: lane2.id },
    })

    lanes.push(lane1, lane2)
  }

  console.log('Created 18 lanes with opponent pairings')

  // Create tournaments
  const fallTournament = await prisma.tournament.create({
    data: {
      name: 'Fall Championship 2024',
      bowlingId: strikeZone.id,
      teamSize: 4, // Teams of 4 players
    },
  })

  const winterTournament = await prisma.tournament.create({
    data: {
      name: 'Winter League 2024',
      bowlingId: luckyLanes.id,
      teamSize: 3, // Teams of 3 players (different configuration)
    },
  })

  console.log('Created tournaments')

  // Create 72 players (4 per team × 18 teams)
  const playerNames = [
    'John Smith', 'Jane Doe', 'Mike Johnson', 'Sarah Williams',
    'Robert Brown', 'Emily Jones', 'David Garcia', 'Lisa Martinez',
    'William Rodriguez', 'Jennifer Lopez', 'James Anderson', 'Mary Taylor',
    'Michael Thomas', 'Patricia Hernandez', 'Richard Moore', 'Linda Martin',
    'Charles Jackson', 'Barbara White', 'Joseph Lee', 'Elizabeth Harris',
    'Thomas Clark', 'Susan Lewis', 'Christopher Walker', 'Jessica Hall',
    'Daniel Allen', 'Nancy Young', 'Matthew King', 'Karen Wright',
    'Anthony Scott', 'Betty Green', 'Mark Adams', 'Dorothy Baker',
    'Donald Nelson', 'Sandra Carter', 'Steven Mitchell', 'Ashley Perez',
    'Paul Roberts', 'Kimberly Turner', 'Andrew Phillips', 'Donna Campbell',
    'Joshua Parker', 'Carol Evans', 'Kenneth Edwards', 'Michelle Collins',
    'Kevin Stewart', 'Emily Morris', 'Brian Rogers', 'Amanda Reed',
    'George Cook', 'Melissa Bailey', 'Edward Rivera', 'Deborah Cooper',
    'Ronald Richardson', 'Stephanie Cox', 'Timothy Howard', 'Rebecca Ward',
    'Jason Torres', 'Laura Peterson', 'Jeffrey Gray', 'Sharon Ramirez',
    'Ryan James', 'Cynthia Watson', 'Jacob Brooks', 'Kathleen Kelly',
    'Gary Sanders', 'Amy Price', 'Nicholas Bennett', 'Angela Wood',
    'Eric Ross', 'Shirley Henderson', 'Stephen Coleman', 'Brenda Jenkins',
  ]

  // Assign skill levels to players
  const skillLevels: Array<'beginner' | 'intermediate' | 'advanced'> = []
  for (let i = 0; i < playerNames.length; i++) {
    if (i % 3 === 0) skillLevels.push('advanced')
    else if (i % 3 === 1) skillLevels.push('intermediate')
    else skillLevels.push('beginner')
  }

  const players = []
  for (let i = 0; i < playerNames.length; i++) {
    const player = await prisma.player.create({
      data: { name: playerNames[i] },
    })
    players.push({ ...player, skillLevel: skillLevels[i] })
  }

  console.log('Created 72 players with varying skill levels')

  // Create 18 teams for Fall Championship
  const teams = []
  for (let i = 0; i < 18; i++) {
    const lane = lanes[i]
    const team = await prisma.team.create({
      data: {
        name: `Team ${String.fromCharCode(65 + i)}`, // Team A, Team B, etc.
        tournamentId: fallTournament.id,
        laneId: lane.id,
      },
    })

    // Assign 4 players to this team
    const teamPlayerIds = players.slice(i * 4, i * 4 + 4)
    for (const player of teamPlayerIds) {
      await prisma.teamPlayer.create({
        data: {
          teamId: team.id,
          playerId: player.id,
          isReplacement: false,
        },
      })
    }

    teams.push(team)
  }

  console.log('Created 18 teams with player assignments')

  // Create 5 sessions (game days) with matchups
  const today = new Date()
  const sessions = []

  for (let week = 0; week < 5; week++) {
    const sessionDate = new Date(today)
    sessionDate.setDate(today.getDate() - (14 - week * 7)) // Sessions from 2 weeks ago to 2 weeks ahead

    const session = await prisma.session.create({
      data: {
        tournamentId: fallTournament.id,
        sessionDate,
      },
    })

    sessions.push(session)

    // Create matchups for this session (9 matchups for 18 lanes)
    for (let i = 0; i < lanes.length; i += 2) {
      const lane = lanes[i]
      const opponentLane = lanes[i + 1]

      // Create matchup
      const matchup = await prisma.sessionMatchup.create({
        data: {
          sessionId: session.id,
          laneId: lane.id,
          teamAId: teams[i].id,
          teamBId: teams[i + 1].id,
        },
      })

      // Add scores for both teams (only for past and current sessions)
      if (week <= 2) {
        // Team A players
        const teamAPlayers = await prisma.teamPlayer.findMany({
          where: { teamId: teams[i].id },
          include: { player: true },
        })

        for (const tp of teamAPlayers) {
          const playerData = players.find((p) => p.id === tp.playerId)!
          // 10% chance player is absent
          const isAbsent = Math.random() < 0.1
          const scores = generateBowlingScore(isAbsent ? 'absent' : playerData.skillLevel)

          await prisma.teamPlayerSession.create({
            data: {
              teamPlayerId: tp.id,
              sessionId: session.id,
              laneId: lane.id,
              line1: scores.line1,
              line2: scores.line2,
              line3: scores.line3,
              handicap: scores.handicap,
              assistance: !isAbsent,
              payment: isAbsent ? false : Math.random() > 0.15, // 85% payment rate
            },
          })
        }

        // Team B players
        const teamBPlayers = await prisma.teamPlayer.findMany({
          where: { teamId: teams[i + 1].id },
          include: { player: true },
        })

        for (const tp of teamBPlayers) {
          const playerData = players.find((p) => p.id === tp.playerId)!
          // 10% chance player is absent
          const isAbsent = Math.random() < 0.1
          const scores = generateBowlingScore(isAbsent ? 'absent' : playerData.skillLevel)

          await prisma.teamPlayerSession.create({
            data: {
              teamPlayerId: tp.id,
              sessionId: session.id,
              laneId: opponentLane.id,
              line1: scores.line1,
              line2: scores.line2,
              line3: scores.line3,
              handicap: scores.handicap,
              assistance: !isAbsent,
              payment: isAbsent ? false : Math.random() > 0.15,
            },
          })
        }
      }
    }

    console.log(`Created session ${week + 1}/5 with matchups ${week <= 2 ? 'and scores' : '(no scores yet)'}`)
  }

  console.log('Seed completed successfully!')
  console.log('Created:')
  console.log('- 2 bowling alleys')
  console.log('- 18 lanes (9 pairs)')
  console.log('- 2 tournaments')
  console.log('- 72 players (varying skill levels)')
  console.log('- 18 teams')
  console.log('- 5 sessions (3 with scores, 2 upcoming)')
  console.log('- ~10% absence rate for realistic data')
}

main()
  .catch((e) => {
    console.error('Error during seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
