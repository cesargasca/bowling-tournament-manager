'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Lane {
  id: number
  laneNumber: number
  opponentLaneId: number | null
  opponentLane: {
    id: number
    laneNumber: number
  } | null
}

interface Tournament {
  id: number
  name: string
  createdAt: string
  _count: {
    teams: number
    sessions: number
  }
}

interface BowlingDetail {
  id: number
  name: string
  createdAt: string
  tournaments: Tournament[]
  lanes: Lane[]
  _count: {
    tournaments: number
  }
}

export default function BowlingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [bowling, setBowling] = useState<BowlingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [saving, setSaving] = useState(false)
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null)

  useEffect(() => {
    params.then(setResolvedParams)
  }, [params])

  useEffect(() => {
    if (resolvedParams) {
      fetchBowlingDetail()
    }
  }, [resolvedParams])

  const fetchBowlingDetail = async () => {
    if (!resolvedParams) return

    try {
      setLoading(true)
      const response = await fetch(`/api/bowling/${resolvedParams.id}`)
      if (!response.ok) throw new Error('Failed to fetch bowling alley details')
      const data = await response.json()
      setBowling(data.data)
      setEditName(data.data.name)
    } catch (error) {
      console.error('Error fetching bowling alley:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!resolvedParams || !editName.trim()) return

    setSaving(true)
    try {
      const response = await fetch(`/api/bowling/${resolvedParams.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName }),
      })

      if (!response.ok) throw new Error('Failed to update bowling alley')

      await fetchBowlingDetail()
      setIsEditing(false)
    } catch (error) {
      console.error('Error updating bowling alley:', error)
      alert('Failed to update bowling alley')
    } finally {
      setSaving(false)
    }
  }

  const getLanePairs = (lanes: Lane[]) => {
    const pairs: Array<{ lane1: Lane; lane2: Lane }> = []
    const processed = new Set<number>()

    lanes.forEach(lane => {
      if (processed.has(lane.id)) return

      if (lane.opponentLane) {
        const opponent = lanes.find(l => l.id === lane.opponentLaneId)
        if (opponent && !processed.has(opponent.id)) {
          pairs.push({
            lane1: lane.laneNumber < opponent.laneNumber ? lane : opponent,
            lane2: lane.laneNumber < opponent.laneNumber ? opponent : lane,
          })
          processed.add(lane.id)
          processed.add(opponent.id)
        }
      }
    })

    return pairs.sort((a, b) => a.lane1.laneNumber - b.lane1.laneNumber)
  }

  if (loading || !bowling) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-500 dark:text-gray-400">Loading...</div>
        </div>
      </div>
    )
  }

  const lanePairs = getLanePairs(bowling.lanes)

  return (
    <div className="container mx-auto px-4 py-8">
      <button
        onClick={() => router.push('/bowling')}
        className="mb-6 text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-2"
      >
        ← Back to Bowling Alleys
      </button>

      {/* Bowling Alley Info */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 p-6 mb-8">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            {isEditing ? (
              <div className="flex gap-3 items-center">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="text-3xl font-bold px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false)
                    setEditName(bowling.name)
                  }}
                  className="px-4 py-2 rounded-lg font-medium transition-colors bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{bowling.name}</h1>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-3 py-1 text-sm rounded-lg font-medium transition-colors bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300"
                >
                  Edit Name
                </button>
              </div>
            )}
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              Created {new Date(bowling.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="text-5xl">🎳</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-50 dark:bg-zinc-800 rounded-lg p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Tournaments</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {bowling._count.tournaments}
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-zinc-800 rounded-lg p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Lanes</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {bowling.lanes.length}
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-zinc-800 rounded-lg p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Lane Pairs</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {lanePairs.length}
            </div>
          </div>
        </div>
      </div>

      {/* Lane Pairs */}
      {lanePairs.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Lane Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lanePairs.map((pair, index) => (
              <div
                key={index}
                className="bg-gray-50 dark:bg-zinc-800 rounded-lg p-4 border border-gray-200 dark:border-zinc-700"
              >
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Pair {index + 1}</div>
                <div className="flex items-center justify-center gap-3">
                  <div className="flex-1 text-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {pair.lane1.laneNumber}
                    </div>
                  </div>
                  <div className="text-gray-400">↔</div>
                  <div className="flex-1 text-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {pair.lane2.laneNumber}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tournaments */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Tournaments ({bowling.tournaments.length})
        </h2>

        {bowling.tournaments.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No tournaments yet
          </div>
        ) : (
          <div className="space-y-3">
            {bowling.tournaments.map((tournament) => (
              <div
                key={tournament.id}
                onClick={() => router.push(`/tournaments/${tournament.id}`)}
                className="bg-gray-50 dark:bg-zinc-800 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-zinc-700 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{tournament.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {tournament._count.teams} teams · {tournament._count.sessions} sessions
                    </p>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(tournament.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
