'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Lane {
  id: number;
  laneNumber: number;
  opponentLaneId: number | null;
}

interface Bowling {
  id: number;
  name: string;
  createdAt: string;
  _count: {
    tournaments: number;
  };
  lanes?: Lane[];
}

export default function BowlingPage() {
  const router = useRouter();

  const [bowlingAlleys, setBowlingAlleys] = useState<Bowling[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBowlingAlleys();
  }, []);

  const fetchBowlingAlleys = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/bowling');
      const result = await response.json();

      if (result.success) {
        setBowlingAlleys(result.data);
      } else {
        setError(result.error || 'Failed to load bowling alleys');
      }
    } catch (err) {
      setError('Network error - failed to fetch bowling alleys');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getLaneRangeDisplay = (lanes?: Lane[]) => {
    if (!lanes || lanes.length === 0) return 'No lanes';
    const laneNumbers = lanes.map(l => l.laneNumber).sort((a, b) => a - b);
    return `Lanes ${laneNumbers[0]}-${laneNumbers[laneNumbers.length - 1]}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-zinc-600 dark:text-zinc-400">Loading bowling alleys...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-start">
            <div>
              <button
                onClick={() => router.push('/')}
                className="mb-4 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-2"
              >
                <span>←</span> Back to Dashboard
              </button>
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">Bowling Alleys</h1>
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                Manage all bowling alleys in the system
              </p>
            </div>

            <button
              onClick={() => router.push('/bowling/create')}
              className="px-4 py-2 rounded-lg font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700"
            >
              Create Bowling Alley
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Bowling Alleys List */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">All Bowling Alleys</h2>
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                {bowlingAlleys.length} bowling alley{bowlingAlleys.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {bowlingAlleys.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-zinc-600 dark:text-zinc-400 text-lg">No bowling alleys yet</p>
              <button
                onClick={() => router.push('/bowling/create')}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create First Bowling Alley
              </button>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {bowlingAlleys.map((bowling) => (
                <div
                  key={bowling.id}
                  className="px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <button
                        onClick={() => router.push(`/bowling/${bowling.id}`)}
                        className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left"
                      >
                        {bowling.name}
                      </button>
                      <div className="mt-1 flex items-center gap-4 text-sm text-zinc-600 dark:text-zinc-400">
                        <span>🎳 {getLaneRangeDisplay(bowling.lanes)}</span>
                        <span>🏆 {bowling._count.tournaments} tournaments</span>
                        <span>
                          Added {new Date(bowling.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => router.push(`/bowling/${bowling.id}`)}
                        className="px-3 py-1 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors"
                      >
                        View Details →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
