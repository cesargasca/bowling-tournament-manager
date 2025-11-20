'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Lane {
  id: number
  laneNumber: number
  opponentLaneId: number | null
}

interface Bowling {
  id: number
  name: string
  createdAt: string
  _count: {
    tournaments: number
  }
  lanes?: Lane[]
}

export default function BowlingPage() {
  const router = useRouter()
  const [bowlingAlleys, setBowlingAlleys] = useState<Bowling[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    startLane: 1,
    endLane: 10,
  })
  const [error, setError] = useState('')

  useEffect(() => {
    fetchBowlingAlleys()
  }, [])

  const fetchBowlingAlleys = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/bowling')
      if (!response.ok) throw new Error('Failed to fetch bowling alleys')
      const data = await response.json()
      setBowlingAlleys(data.data || [])
    } catch (error) {
      console.error('Error fetching bowling alleys:', error)
      setError('Failed to load bowling alleys')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    // Validation
    if (!formData.name.trim()) {
      setError('Alley name is required')
      setSaving(false)
      return
    }

    if (formData.startLane <= 0 || formData.endLane <= 0) {
      setError('Lane numbers must be positive')
      setSaving(false)
      return
    }

    if (formData.startLane >= formData.endLane) {
      setError('End lane must be greater than start lane')
      setSaving(false)
      return
    }

    if ((formData.endLane - formData.startLane + 1) % 2 !== 0) {
      setError('Lane range must have an even number of lanes for proper pairing')
      setSaving(false)
      return
    }

    try {
      const response = await fetch('/api/bowling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to create bowling alley')
      }

      // Reset form and refresh list
      setFormData({ name: '', startLane: 1, endLane: 10 })
      setShowForm(false)
      await fetchBowlingAlleys()
    } catch (error) {
      console.error('Error creating bowling alley:', error)
      setError(error instanceof Error ? error.message : 'Failed to create bowling alley')
    } finally {
      setSaving(false)
    }
  }

  const deleteBowling = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This will also delete all associated tournaments.`)) {
      return
    }

    try {
      const response = await fetch(`/api/bowling/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to delete bowling alley')
      }

      await fetchBowlingAlleys()
    } catch (error) {
      console.error('Error deleting bowling alley:', error)
      alert(error instanceof Error ? error.message : 'Failed to delete bowling alley')
    }
  }

  const getLaneRangeDisplay = (lanes?: Lane[]) => {
    if (!lanes || lanes.length === 0) return 'No lanes'
    const laneNumbers = lanes.map(l => l.laneNumber).sort((a, b) => a - b)
    return `Lanes ${laneNumbers[0]}-${laneNumbers[laneNumbers.length - 1]} (${lanes.length} lanes)`
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-500 dark:text-gray-400">Loading bowling alleys...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Bowling Alleys</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-lg font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700"
        >
          {showForm ? 'Cancel' : 'Create Bowling Alley'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Create New Bowling Alley</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Alley Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Bol Insurgentes"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="startLane" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Start Lane Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="startLane"
                  min="1"
                  value={formData.startLane}
                  onChange={(e) => setFormData({ ...formData, startLane: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="endLane" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  End Lane Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="endLane"
                  min="2"
                  value={formData.endLane}
                  onChange={(e) => setFormData({ ...formData, endLane: parseInt(e.target.value) || 10 })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-sm text-blue-800 dark:text-blue-300">
              <p className="font-medium mb-1">Lane Pairing Info:</p>
              <p>Total lanes: {Math.max(0, formData.endLane - formData.startLane + 1)}</p>
              <p>Lane pairs: {Math.floor(Math.max(0, formData.endLane - formData.startLane + 1) / 2)}</p>
              {(formData.endLane - formData.startLane + 1) % 2 !== 0 && formData.endLane > formData.startLane && (
                <p className="text-red-600 dark:text-red-400 mt-1">⚠️ Odd number of lanes - must be even for proper pairing</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-lg font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {saving ? 'Creating...' : 'Create Bowling Alley'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setError('')
                  setFormData({ name: '', startLane: 1, endLane: 10 })
                }}
                className="px-4 py-2 rounded-lg font-medium transition-colors bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-zinc-700"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {bowlingAlleys.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🎳</div>
          <p className="text-xl text-gray-500 dark:text-gray-400 mb-2">No bowling alleys yet</p>
          <p className="text-gray-400 dark:text-gray-500">Create your first bowling alley to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bowlingAlleys.map((bowling) => (
            <div
              key={bowling.id}
              className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 p-6 hover:border-blue-500 hover:shadow-lg transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                    {bowling.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {getLaneRangeDisplay(bowling.lanes)}
                  </p>
                </div>
                <div className="text-3xl">🎳</div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Tournaments</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {bowling._count.tournaments}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Created</span>
                  <span className="text-gray-900 dark:text-white">
                    {new Date(bowling.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => router.push(`/bowling/${bowling.id}`)}
                  className="flex-1 px-3 py-2 text-sm rounded-lg font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700"
                >
                  View Details
                </button>
                <button
                  onClick={() => deleteBowling(bowling.id, bowling.name)}
                  className="px-3 py-2 text-sm rounded-lg font-medium transition-colors bg-red-600 text-white hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
