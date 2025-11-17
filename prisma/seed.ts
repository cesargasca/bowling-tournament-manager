import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting seed...')

  // Clean existing data
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
    },
  })

  const winterTournament = await prisma.tournament.create({
    data: {
      name: 'Winter League 2024',
      bowlingId: luckyLanes.id,
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

  const players = []
  for (const name of playerNames) {
    const player = await prisma.player.create({
      data: { name },
    })
    players.push(player)
  }

  console.log('Created 72 players')

  // Create 18 teams for Fall Championship
  const teams = []
  for (let i = 0; i < 18; i++) {
    const lane = lanes[i]
    const team = await prisma.team.create({
      data: {
        name: `Team ${i + 1}`,
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

  // Create 3 sample sessions
  const today = new Date()
  const sessions = []

  for (let week = 0; week < 3; week++) {
    const sessionDate = new Date(today)
    sessionDate.setDate(today.getDate() + week * 7)

    // Create sessions for each lane pair
    for (let i = 0; i < lanes.length; i += 2) {
      const lane = lanes[i]
      const session = await prisma.session.create({
        data: {
          tournamentId: fallTournament.id,
          laneId: lane.id,
          sessionDate,
        },
      })

      sessions.push(session)

      // Add sample scores for week 0 only
      if (week === 0) {
        const team = teams[i]
        const teamPlayers = await prisma.teamPlayer.findMany({
          where: { teamId: team.id },
          include: { player: true },
        })

        // Add scores for all 4 players
        for (const tp of teamPlayers) {
          const line1 = Math.floor(Math.random() * 100) + 100 // 100-200
          const line2 = Math.floor(Math.random() * 100) + 100
          const line3 = Math.floor(Math.random() * 100) + 100
          const handicap = Math.floor(Math.random() * 30) + 10 // 10-40

          await prisma.teamPlayerSession.create({
            data: {
              teamPlayerId: tp.id,
              sessionId: session.id,
              laneId: lane.id,
              line1,
              line2,
              line3,
              handicap,
              assistance: true,
              payment: Math.random() > 0.2, // 80% paid
            },
          })
        }

        // Add scores for opponent team
        if (i + 1 < teams.length) {
          const opponentTeam = teams[i + 1]
          const opponentTeamPlayers = await prisma.teamPlayer.findMany({
            where: { teamId: opponentTeam.id },
            include: { player: true },
          })

          const opponentLane = lanes[i + 1]

          for (const tp of opponentTeamPlayers) {
            const line1 = Math.floor(Math.random() * 100) + 100
            const line2 = Math.floor(Math.random() * 100) + 100
            const line3 = Math.floor(Math.random() * 100) + 100
            const handicap = Math.floor(Math.random() * 30) + 10

            await prisma.teamPlayerSession.create({
              data: {
                teamPlayerId: tp.id,
                sessionId: session.id,
                laneId: opponentLane.id,
                line1,
                line2,
                line3,
                handicap,
                assistance: Math.random() > 0.25, // 75% attended
                payment: Math.random() > 0.2,
              },
            })
          }
        }
      }
    }
  }

  console.log('Created 3 sessions with scores for week 1')

  console.log('Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('Error during seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
