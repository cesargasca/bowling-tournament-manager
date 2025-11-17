# Bowling Tournament Management System

A full-stack bowling tournament management application built with Next.js 16, Prisma ORM, and TypeScript.

## Features

- **Bowling Alley Management**: Create and manage bowling alleys with lane configurations
- **Tournament Management**: Organize tournaments with multiple teams and sessions
- **Team & Player Management**: Manage teams (4 players each) and player rosters
- **Session Scheduling**: Create and schedule bowling sessions
- **Score Entry**: Comprehensive score entry interface with real-time calculations
- **6-Point Scoring System**:
  - Line 1, 2, 3 winners (1 point each)
  - Total pins winner (1 point)
  - Assistance point (3+ players present)
  - Payment point (all 4 players paid)
- **Tournament Standings**: Real-time leaderboard with team statistics
- **Player Statistics**: Track individual player performance and averages

## Technology Stack

- **Framework**: Next.js 16 (App Router)
- **Database ORM**: Prisma
- **Database**: PostgreSQL 16 (via Docker)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Form Handling**: React Hook Form with Zod validation
- **State Management**: Zustand
- **Containerization**: Docker & Docker Compose

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Docker & Docker Compose

### Quick Start

The fastest way to get started:

```bash
# 1. Clone and install
git clone <repository-url>
cd bowling-tournament-manager
npm install

# 2. Copy environment variables
cp .env.example .env

# 3. One command setup (starts Docker, creates DB, seeds data)
npm run setup

# 4. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Manual Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd bowling-tournament-manager
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env if needed (default values work with Docker setup)
```

4. **Start PostgreSQL database with Docker**
```bash
npm run docker:up
```

This will start a PostgreSQL 16 container with:
- Host: localhost
- Port: 5432
- Database: bowling_tournament
- User: bowling_user
- Password: bowling_password

5. **Push database schema**
```bash
npm run db:push
```

6. **Seed the database with sample data**
```bash
npm run db:seed
```

7. **Start the development server**
```bash
npm run dev
```

8. **Open your browser**

Navigate to [http://localhost:3000](http://localhost:3000)

## Database Schema

The application uses the following main entities:

- **Bowling**: Bowling alleys
- **Tournament**: Tournaments held at bowling alleys
- **Team**: Teams competing in tournaments (4 players each)
- **Player**: Individual players
- **TeamPlayer**: Junction table for team-player relationships
- **Session**: Bowling sessions for tournaments
- **Lane**: Bowling lanes with opponent pairings
- **TeamPlayerSession**: Individual player scores per session

## Docker Setup

The application uses Docker Compose to run PostgreSQL in a container. This ensures consistency across development environments.

### Docker Configuration

The `docker-compose.yml` file defines:
- **PostgreSQL 16 Alpine** - Lightweight PostgreSQL image
- **Persistent Volume** - Data persists between container restarts
- **Health Check** - Ensures database is ready before connections
- **Port Mapping** - Database accessible on localhost:5432

### Managing the Database Container

```bash
# Start the database
npm run docker:up

# Check database logs
npm run docker:logs

# Stop the database
npm run docker:down

# Stop and remove volumes (⚠️ deletes all data)
docker-compose down -v
```

### Database Credentials

Default credentials (defined in `docker-compose.yml`):
- **Host**: localhost
- **Port**: 5432
- **Database**: bowling_tournament
- **User**: bowling_user
- **Password**: bowling_password

For production, update these credentials and use environment variables.

### Accessing the Database

You can access the database using:
1. **Prisma Studio**: `npm run db:studio` (GUI interface)
2. **psql CLI**: `docker exec -it bowling-tournament-db psql -U bowling_user -d bowling_tournament`
3. **Any PostgreSQL client** using the credentials above

## API Routes

### Bowling Alleys
- `GET /api/bowling-alleys` - List all
- `POST /api/bowling-alleys` - Create
- `GET /api/bowling-alleys/[id]` - Get details
- `PUT /api/bowling-alleys/[id]` - Update
- `DELETE /api/bowling-alleys/[id]` - Delete

### Tournaments
- `GET /api/tournaments` - List all
- `POST /api/tournaments` - Create
- `GET /api/tournaments/[id]` - Get details
- `PUT /api/tournaments/[id]` - Update
- `DELETE /api/tournaments/[id]` - Delete
- `GET /api/tournaments/[id]/standings` - Get standings

### Teams
- `GET /api/teams` - List all
- `POST /api/teams` - Create with players
- `GET /api/teams/[id]` - Get details
- `PUT /api/teams/[id]` - Update
- `DELETE /api/teams/[id]` - Delete

### Players
- `GET /api/players` - List all
- `POST /api/players` - Create
- `GET /api/players/[id]` - Get details
- `PUT /api/players/[id]` - Update
- `DELETE /api/players/[id]` - Delete

### Sessions
- `GET /api/sessions` - List all
- `POST /api/sessions` - Create
- `GET /api/sessions/[id]` - Get details
- `DELETE /api/sessions/[id]` - Delete
- `POST /api/sessions/[id]/scores` - Save scores
- `GET /api/sessions/[id]/scores` - Get scores
- `GET /api/sessions/[id]/results` - Get calculated results

### Lanes
- `GET /api/lanes` - List all
- `POST /api/lanes` - Create with opponent pairing
- `GET /api/lanes/[id]` - Get details
- `PUT /api/lanes/[id]` - Update
- `DELETE /api/lanes/[id]` - Delete

## Scoring System

The application implements a 6-point scoring system per session:

1. **Line 1 Winner** (1 point): Team with highest score (pins + handicap) in game 1
2. **Line 2 Winner** (1 point): Team with highest score (pins + handicap) in game 2
3. **Line 3 Winner** (1 point): Team with highest score (pins + handicap) in game 3
4. **Total Pins Winner** (1 point): Team with highest sum of all 3 games + total handicap
5. **Assistance Point** (1 point): Team with at least 3 of 4 players present
6. **Payment Point** (1 point): Team with all 4 players who paid

## Project Structure

```
bowling-tournament-manager/
├── app/
│   ├── api/                    # API routes
│   │   ├── bowling-alleys/
│   │   ├── tournaments/
│   │   ├── teams/
│   │   ├── players/
│   │   ├── sessions/
│   │   └── lanes/
│   ├── (pages)/                # UI pages (to be implemented)
│   ├── layout.tsx
│   └── page.tsx
├── lib/
│   ├── prisma.ts               # Prisma client
│   ├── validations/            # Zod schemas
│   ├── services/               # Business logic
│   │   └── scoring.ts          # Scoring calculations
│   └── utils/
│       └── api.ts              # API utilities
├── components/
│   ├── ui/                     # UI components
│   ├── forms/                  # Form components
│   ├── tables/                 # Table components
│   └── layouts/                # Layout components
├── types/
│   └── index.ts                # TypeScript types
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── seed.ts                 # Seed data
└── package.json
```

## Available Scripts

### Development
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

### Docker Commands
- `npm run docker:up` - Start PostgreSQL container
- `npm run docker:down` - Stop PostgreSQL container
- `npm run docker:logs` - View PostgreSQL logs

### Database Commands
- `npm run db:push` - Push Prisma schema to database
- `npm run db:migrate` - Create and run migrations
- `npm run db:seed` - Seed database with sample data
- `npm run db:studio` - Open Prisma Studio (database GUI)
- `npm run db:reset` - Reset database and re-run migrations
- `npm run db:generate` - Generate Prisma Client

### Quick Setup
- `npm run setup` - Complete setup (Docker + DB + Seed)

## Sample Data

Running the seed script creates:
- 2 bowling alleys
- 18 lanes with opponent pairings
- 2 tournaments
- 18 teams
- 72 players (4 per team)
- 3 sessions with scores for the first session

## Development Status

### ✅ Completed
- Project initialization with Next.js 16, TypeScript, Tailwind CSS
- Prisma schema with all entities
- Complete API routes for all entities
- Zod validation schemas
- Scoring calculation service (6-point system)
- Seed data script
- TypeScript types and interfaces

### 🚧 In Progress
- Frontend UI pages
- Score entry interface
- Tournament standings display

### 📋 TODO
- Dashboard with statistics
- Bowling alley management pages
- Tournament management pages
- Team management pages
- Player management pages
- Session management pages
- shadcn/ui component library integration

## License

MIT
