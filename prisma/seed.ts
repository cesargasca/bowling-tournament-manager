import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting seed...')

  // Clean existing data
  await prisma.playerTournamentCategory.deleteMany()
  await prisma.sessionMatchup.deleteMany()
  await prisma.teamPlayerSession.deleteMany()
  await prisma.session.deleteMany()
  await prisma.teamPlayer.deleteMany()
  await prisma.team.deleteMany()
  await prisma.tournamentGroup.deleteMany()
  await prisma.playerCategory.deleteMany()
  await prisma.player.deleteMany()
  await prisma.lane.deleteMany()
  await prisma.tournament.deleteMany()
  await prisma.bowling.deleteMany()

  console.log('Cleaned existing data')

  // Create Bol Insurgentes bowling alley
  const bolInsurgentes = await prisma.bowling.create({
    data: {
      name: 'Bol Insurgentes',
    },
  })

  console.log('Created bowling alley: Bol Insurgentes')

  // Create lanes 17-34 with opponent pairs
  const lanes = []
  for (let i = 17; i <= 34; i += 2) {
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

  console.log('Created lanes 17-34 with opponent pairings (9 pairs, 18 total lanes)')

  // Create Super Bowl tournament
  const superBowl = await prisma.tournament.create({
    data: {
      name: 'Super Bowl',
      bowlingId: bolInsurgentes.id,
      teamSize: 4,
      substituteCount: 0,
    },
  })

  console.log('Created tournament: Super Bowl')

  // Create groups
  const groupPrimera = await prisma.tournamentGroup.create({
    data: {
      tournamentId: superBowl.id,
      name: 'Primera',
      displayOrder: 1,
    },
  })

  const groupSegunda = await prisma.tournamentGroup.create({
    data: {
      tournamentId: superBowl.id,
      name: 'Segunda',
      displayOrder: 2,
    },
  })

  console.log('Created groups: Primera and Segunda')

  // Create categories
  const categoryA = await prisma.playerCategory.create({
    data: {
      tournamentId: superBowl.id,
      name: 'Category A',
      minAverage: null,
      maxAverage: 20,
      displayOrder: 1,
    },
  })

  const categoryB = await prisma.playerCategory.create({
    data: {
      tournamentId: superBowl.id,
      name: 'Category B',
      minAverage: 21,
      maxAverage: 35,
      displayOrder: 2,
    },
  })

  const categoryC = await prisma.playerCategory.create({
    data: {
      tournamentId: superBowl.id,
      name: 'Category C',
      minAverage: 36,
      maxAverage: null,
      displayOrder: 3,
    },
  })

  console.log('Created categories: A, B, C')

  // CSV Data
  const csvData = [
    { team: 'LO PLATICAMOS', group: 'Primera', player: 'Roberto Gasca', email: '', phone: '', handicap: 19, category: 'B', substitute: false },
    { team: 'SUPERSONICOS', group: 'Primera', player: 'Hugo Gonzalez', email: '', phone: '', handicap: 18, category: 'B', substitute: false },
    { team: 'MIGHTY DUCKS', group: 'Segunda', player: 'Ricardo Cuevas Sr', email: '', phone: '', handicap: 20, category: 'B', substitute: false },
    { team: 'LOS CAPIBARA', group: 'Segunda', player: 'Manuel Gallardo', email: '', phone: '', handicap: 27, category: 'B', substitute: false },
    { team: 'PECHOCHOS', group: 'Segunda', player: 'Alejandro Gomez', email: '', phone: '', handicap: 20, category: 'B', substitute: false },
    { team: 'LOS 300', group: 'Primera', player: 'Adrian "Pippen" Amador', email: '', phone: '', handicap: 20, category: 'B', substitute: false },
    { team: 'CORSARIOS', group: 'Primera', player: 'Gabriel Camarena', email: '', phone: '', handicap: 30, category: 'B', substitute: false },
    { team: 'LINUX', group: 'Segunda', player: 'Brenda Espinosa', email: '', phone: '', handicap: 24, category: 'B', substitute: false },
    { team: 'ASES Y REINAS', group: 'Primera', player: 'Isaias Gaona', email: '', phone: '', handicap: 29, category: 'B', substitute: false },
    { team: 'PECHOCHOS', group: 'Segunda', player: 'Farid Fonseca', email: '', phone: '', handicap: 32, category: 'B', substitute: false },
    { team: 'LINUX', group: 'Segunda', player: 'Felix Iniesta Jr', email: '', phone: '', handicap: 28, category: 'B', substitute: false },
    { team: 'CORSARIOS', group: 'Primera', player: 'Ignacio Cedillo', email: '', phone: '', handicap: 23, category: 'B', substitute: false },
    { team: 'LO PLATICAMOS', group: 'Primera', player: 'Isaac Gasca', email: '', phone: '', handicap: 29, category: 'B', substitute: false },
    { team: 'CORSARIOS', group: 'Primera', player: 'Arturo Alvarez', email: '', phone: '', handicap: 30, category: 'B', substitute: false },
    { team: 'MIGHTY DUCKS', group: 'Segunda', player: 'Regina Cuevas', email: '', phone: '', handicap: 25, category: 'B', substitute: false },
    { team: 'LOS CAPIBARA', group: 'Segunda', player: 'Javo Viruega', email: '', phone: '', handicap: 18, category: 'B', substitute: false },
    { team: 'KRONOS', group: 'Primera', player: 'Carlos Duchanoy', email: '', phone: '', handicap: 45, category: 'B', substitute: false },
    { team: 'PECHOCHOS', group: 'Segunda', player: 'Jorge Torres', email: '', phone: '', handicap: 32, category: 'B', substitute: false },
    { team: 'CHEFCITOS', group: 'Segunda', player: 'Andrea Rendón', email: '', phone: '', handicap: 24, category: 'B', substitute: false },
    { team: 'CORSARIOS', group: 'Primera', player: 'Alex Camarena', email: '', phone: '', handicap: 27, category: 'B', substitute: false },
    { team: 'SPLIT HAPPENS', group: 'Segunda', player: 'Rodrigo Casas', email: '', phone: '', handicap: 26, category: 'B', substitute: false },
    { team: 'GUATEQUE', group: 'Primera', player: 'Daniel Calvo', email: '', phone: '', handicap: 21, category: 'B', substitute: false },
    { team: 'LOS CAPIBARA', group: 'Segunda', player: 'Memo Viruega Jr', email: '', phone: '', handicap: 15, category: 'B', substitute: false },
    { team: 'COYOTES', group: 'Segunda', player: 'Alfonso Zamudio', email: '', phone: '', handicap: 29, category: 'B', substitute: false },
    { team: 'LOS INTOCABLES', group: 'Primera', player: 'Jose Luis Lizziy', email: '', phone: '', handicap: 0, category: 'A', substitute: false },
    { team: 'LOS 300', group: 'Primera', player: 'Marco Camargo', email: '', phone: '', handicap: 12, category: 'A', substitute: false },
    { team: 'CHEFCITOS', group: 'Segunda', player: 'Jorge Garcia', email: '', phone: '', handicap: 0, category: 'A', substitute: false },
    { team: 'SPACE SOLUTIONS', group: 'Primera', player: 'Arturo Galán', email: '', phone: '', handicap: 6, category: 'A', substitute: false },
    { team: 'CHEFCITOS', group: 'Segunda', player: 'Raul Arevalo', email: '', phone: '', handicap: 15, category: 'A', substitute: false },
    { team: 'CHEFCITOS', group: 'Segunda', player: 'Memo Arellano Jr', email: '', phone: '', handicap: 2, category: 'A', substitute: false },
    { team: 'LINUX', group: 'Segunda', player: 'Diego Bishop', email: '', phone: '', handicap: 0, category: 'A', substitute: false },
    { team: 'LOS CAPIBARA', group: 'Segunda', player: 'Memo Viruega Sr', email: '', phone: '', handicap: 18, category: 'A', substitute: false },
    { team: 'KRONOS', group: 'Primera', player: 'Oscar Torres', email: '', phone: '', handicap: 16, category: 'A', substitute: false },
    { team: 'LOS INTOCABLES', group: 'Primera', player: 'Efren Lizziy', email: '', phone: '', handicap: 16, category: 'A', substitute: false },
    { team: 'LOS INTOCABLES', group: 'Primera', player: 'Noe Gonzalez', email: '', phone: '', handicap: 13, category: 'A', substitute: false },
    { team: 'LINUX', group: 'Segunda', player: 'Mario Espina', email: '', phone: '', handicap: 7, category: 'A', substitute: false },
    { team: 'LOS 300', group: 'Primera', player: 'Beto Calvo', email: '', phone: '', handicap: 14, category: 'A', substitute: false },
    { team: 'MIGHTY DUCKS', group: 'Segunda', player: 'Ricardo Cuevas Jr', email: '', phone: '', handicap: 15, category: 'A', substitute: false },
    { team: 'COYOTES', group: 'Segunda', player: 'Francisco Leon', email: '', phone: '', handicap: 18, category: 'A', substitute: false },
    { team: 'MIGHTY DUCKS', group: 'Segunda', player: 'Gerardo Cuevas', email: '', phone: '', handicap: 9, category: 'A', substitute: false },
    { team: 'KRONOS', group: 'Primera', player: 'Jorge Gutierrez', email: '', phone: '', handicap: 19, category: 'A', substitute: false },
    { team: 'LO PLATICAMOS', group: 'Primera', player: 'Fernando Arellano', email: '', phone: '', handicap: 17, category: 'A', substitute: false },
    { team: 'SPACE SOLUTIONS', group: 'Primera', player: 'Mario Quintero', email: '', phone: '', handicap: 0, category: 'A', substitute: false },
    { team: 'KRONOS', group: 'Primera', player: 'Jose Benito Chacón', email: '', phone: '', handicap: 19, category: 'A', substitute: false },
    { team: 'SPACE SOLUTIONS', group: 'Primera', player: 'Pedro Jalili', email: '', phone: '', handicap: 31, category: 'A', substitute: false },
    { team: 'ASES Y REINAS', group: 'Primera', player: 'Memo Arellano Sr', email: '', phone: '', handicap: 31, category: 'A', substitute: false },
    { team: 'SUPERSONICOS', group: 'Primera', player: 'Alfredo Zahoul', email: '', phone: '', handicap: 32, category: 'C', substitute: false },
    { team: 'TROYANOS', group: 'Segunda', player: 'Laura Mora', email: '', phone: '', handicap: 37, category: 'C', substitute: false },
    { team: 'FANTASTIC FOUR', group: 'Segunda', player: 'Lupita Arellano', email: '', phone: '', handicap: 38, category: 'C', substitute: false },
    { team: 'ASES Y REINAS', group: 'Primera', player: 'Vero Lizziy', email: '', phone: '', handicap: 34, category: 'C', substitute: false },
    { team: 'ASES Y REINAS', group: 'Primera', player: 'Viridiana Ramirez', email: '', phone: '', handicap: 44, category: 'C', substitute: false },
    { team: 'SPACE SOLUTIONS', group: 'Primera', player: 'Arturo Sanchez', email: '', phone: '', handicap: 55, category: 'C', substitute: false },
    { team: 'PECHOCHOS', group: 'Segunda', player: 'Ramon Espinosa', email: '', phone: '', handicap: 31, category: 'C', substitute: false },
    { team: 'SPLIT HAPPENS', group: 'Segunda', player: 'Bibiana Ortega', email: '', phone: '', handicap: 54, category: 'C', substitute: false },
    { team: 'LOS 300', group: 'Primera', player: 'Ingrid de la Rosa', email: '', phone: '', handicap: 37, category: 'C', substitute: false },
    { team: 'TROYANOS', group: 'Segunda', player: 'Luz Maria Ibarra', email: '', phone: '', handicap: 48, category: 'C', substitute: false },
    { team: 'SPLIT HAPPENS', group: 'Segunda', player: 'Carlos Perez', email: '', phone: '', handicap: 51, category: 'C', substitute: false },
    { team: 'FANTASTIC FOUR', group: 'Segunda', player: 'Jose Alvarado', email: '', phone: '', handicap: 42, category: 'C', substitute: false },
    { team: 'SPLIT HAPPENS', group: 'Segunda', player: 'Juan Piñon', email: '', phone: '', handicap: 32, category: 'C', substitute: false },
    { team: 'FANTASTIC FOUR', group: 'Segunda', player: 'Vicky Sierra', email: '', phone: '', handicap: 61, category: 'C', substitute: false },
    { team: 'GUATEQUE', group: 'Primera', player: 'Cacayo Aguirre', email: '', phone: '', handicap: 44, category: 'C', substitute: false },
    { team: 'TROYANOS', group: 'Segunda', player: 'Victor Beracha', email: '', phone: '', handicap: 55, category: 'C', substitute: false },
    { team: 'SUPERSONICOS', group: 'Primera', player: 'Abraham Olvera', email: '', phone: '', handicap: 46, category: 'C', substitute: false },
    { team: 'TROYANOS', group: 'Segunda', player: 'Becky Gordon', email: '', phone: '', handicap: 62, category: 'C', substitute: false },
    { team: 'LO PLATICAMOS', group: 'Primera', player: 'Cesar Gasca', email: '', phone: '', handicap: 45, category: 'C', substitute: false },
    { team: 'SUPERSONICOS', group: 'Primera', player: 'Alejandro Rico', email: '', phone: '', handicap: 43, category: 'C', substitute: false },
    { team: 'FANTASTIC FOUR', group: 'Segunda', player: 'Blanca Araoz', email: '', phone: '', handicap: 62, category: 'C', substitute: false },
  ]

  // Create players
  const playerMap = new Map()
  for (const row of csvData) {
    if (!playerMap.has(row.player)) {
      const player = await prisma.player.create({
        data: {
          name: row.player,
          email: row.email || null,
          phone: row.phone || null,
          initialHandicap: row.handicap,
        },
      })
      playerMap.set(row.player, { ...player, category: row.category })
    }
  }

  console.log(`Created ${playerMap.size} unique players`)

  // Group data by team
  const teamData = new Map()
  for (const row of csvData) {
    if (!teamData.has(row.team)) {
      teamData.set(row.team, {
        name: row.team,
        group: row.group,
        players: [],
      })
    }
    teamData.get(row.team)!.players.push({
      name: row.player,
      category: row.category,
      substitute: row.substitute,
    })
  }

  console.log(`Found ${teamData.size} unique teams`)

  // Create teams and assign players
  let laneIndex = 0
  for (const [teamName, teamInfo] of teamData) {
    const group = teamInfo.group === 'Primera' ? groupPrimera : groupSegunda
    const team = await prisma.team.create({
      data: {
        name: teamName,
        tournamentId: superBowl.id,
        groupId: group.id,
        laneId: laneIndex < lanes.length ? lanes[laneIndex].id : null,
      },
    })

    laneIndex++

    // Assign players to team
    for (const playerInfo of teamInfo.players) {
      const player = playerMap.get(playerInfo.name)
      if (player) {
        await prisma.teamPlayer.create({
          data: {
            teamId: team.id,
            playerId: player.id,
            isReplacement: playerInfo.substitute,
            handicap: player.initialHandicap,
          },
        })
      }
    }
  }

  console.log('Created teams and assigned players')

  // Assign players to categories
  for (const [playerName, playerData] of playerMap) {
    const category =
      playerData.category === 'A'
        ? categoryA
        : playerData.category === 'B'
        ? categoryB
        : categoryC

    await prisma.playerTournamentCategory.create({
      data: {
        playerId: playerData.id,
        tournamentId: superBowl.id,
        categoryId: category.id,
        isManual: true,
      },
    })
  }

  console.log('Assigned all players to their categories')

  console.log('\n=== Seed completed successfully! ===')
  console.log('Created:')
  console.log('- 1 bowling alley (Bol Insurgentes)')
  console.log('- 18 lanes (lanes 17-34, 9 pairs)')
  console.log('- 1 tournament (Super Bowl)')
  console.log('- 2 groups (Primera, Segunda)')
  console.log('- 3 categories (A, B, C)')
  console.log(`- ${playerMap.size} players`)
  console.log(`- ${teamData.size} teams`)
}

main()
  .catch((e) => {
    console.error('Error during seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
