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

  const getLaneCount = (lanes?: Lane[]) => {
    if (!lanes || lanes.length === 0) return 0;
    return lanes.length;
  };

  const getLanePairCount = (lanes?: Lane[]) => {
    if (!lanes || lanes.length === 0) return 0;
    return Math.floor(lanes.length / 2);
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

        {/* Bowling Alleys Count */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
            All Bowling Alleys
          </h2>
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            {bowlingAlleys.length} bowling alley{bowlingAlleys.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Bowling Alleys Grid */}
        {bowlingAlleys.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-12 text-center">
            <p className="text-zinc-600 dark:text-zinc-400 text-lg">No bowling alleys yet</p>
            <button
              onClick={() => router.push('/bowling/create')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create First Bowling Alley
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bowlingAlleys.map((bowling) => (
              <div
                key={bowling.id}
                onClick={() => router.push(`/bowling/${bowling.id}`)}
                className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-5 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer"
              >
                {/* Bowling Alley Header */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-xl">🎳</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 truncate">
                      {bowling.name}
                    </h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-500">
                      {getLaneRangeDisplay(bowling.lanes)}
                    </p>
                  </div>
                </div>

                {/* Bowling Alley Details */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span className="text-zinc-600 dark:text-zinc-400">
                      {getLaneCount(bowling.lanes)} total lanes
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-zinc-600 dark:text-zinc-400">
                      Added {new Date(bowling.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Bowling Alley Stats */}
                <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {getLanePairCount(bowling.lanes)}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-500">Pairs</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {bowling._count.tournaments}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-500">Tournaments</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/bowling/${bowling.id}`);
                    }}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                  >
                    View Details →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
