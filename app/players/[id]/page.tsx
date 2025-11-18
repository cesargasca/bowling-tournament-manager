'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface PlayerHistory {
  player: {
    id: number;
    name: string;
  };
  summary: {
    totalSessions: number;
    totalGames: number;
    totalPins: number;
    average: number;
    highGame: number;
    lowGame: number;
    paidSessions: number;
    unpaidSessions: number;
    paymentRate: number;
  };
  sessions: Array<{
    sessionId: number;
    sessionDate: string;
    tournament: {
      id: number;
      name: string;
      bowlingAlley: string;
    };
    team: {
      id: number;
      name: string;
    };
    opponentTeam: {
      id: number;
      name: string;
    } | null;
    lane: {
      id: number;
      laneNumber: number;
      opponentLaneNumber: number | undefined;
    };
    scores: {
      line1: number;
      line2: number;
      line3: number;
      rawTotal: number;
      handicap: number;
      totalWithHandicap: number;
    };
    assistance: boolean;
    payment: boolean;
    createdAt: string;
  }>;
}

export default function PlayerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const playerId = params.id as string;

  const [data, setData] = useState<PlayerHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTournament, setSelectedTournament] = useState<string>('all');

  useEffect(() => {
    fetchPlayerHistory();
  }, [playerId, selectedTournament]);

  const fetchPlayerHistory = async () => {
    try {
      setLoading(true);
      const url =
        selectedTournament === 'all'
          ? `/api/players/${playerId}/history`
          : `/api/players/${playerId}/history?tournamentId=${selectedTournament}`;

      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to load player history');
      }
    } catch (err) {
      setError('Network error - failed to fetch player history');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-zinc-600 dark:text-zinc-400">Loading player history...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 dark:text-red-400 text-lg font-semibold mb-4">
            {error || 'Player not found'}
          </div>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Get unique tournaments from sessions
  const tournaments = Array.from(
    new Set(data.sessions.map((s) => JSON.stringify({ id: s.tournament.id, name: s.tournament.name })))
  ).map((t) => JSON.parse(t));

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => router.back()}
            className="mb-4 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-2"
          >
            <span>←</span> Back
          </button>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">{data.player.name}</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">Player History & Statistics</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
            <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Average</div>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {data.summary.average}
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
              {data.summary.totalGames} games
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
            <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Total Pins</div>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              {data.summary.totalPins.toLocaleString()}
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
              {data.summary.totalSessions} sessions
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
            <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">High Game</div>
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {data.summary.highGame}
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
              Low: {data.summary.lowGame}
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
            <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Payment Rate</div>
            <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
              {data.summary.paymentRate}%
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
              {data.summary.paidSessions}/{data.summary.totalSessions} paid
            </div>
          </div>
        </div>

        {/* Filter */}
        {tournaments.length > 1 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Filter by Tournament
            </label>
            <select
              value={selectedTournament}
              onChange={(e) => setSelectedTournament(e.target.value)}
              className="px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50"
            >
              <option value="all">All Tournaments</option>
              {tournaments.map((t: any) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Session History */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Session History</h2>
          </div>

          {data.sessions.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-zinc-600 dark:text-zinc-400 text-lg">No session history found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                  <tr>
                    <th className="text-left py-3 px-6 text-zinc-700 dark:text-zinc-300 font-semibold">
                      Date
                    </th>
                    <th className="text-left py-3 px-6 text-zinc-700 dark:text-zinc-300 font-semibold">
                      Tournament
                    </th>
                    <th className="text-left py-3 px-6 text-zinc-700 dark:text-zinc-300 font-semibold">
                      Team
                    </th>
                    <th className="text-left py-3 px-6 text-zinc-700 dark:text-zinc-300 font-semibold">
                      Opponent
                    </th>
                    <th className="text-center py-3 px-6 text-zinc-700 dark:text-zinc-300 font-semibold">
                      Lane
                    </th>
                    <th className="text-center py-3 px-6 text-zinc-700 dark:text-zinc-300 font-semibold">
                      L1
                    </th>
                    <th className="text-center py-3 px-6 text-zinc-700 dark:text-zinc-300 font-semibold">
                      L2
                    </th>
                    <th className="text-center py-3 px-6 text-zinc-700 dark:text-zinc-300 font-semibold">
                      L3
                    </th>
                    <th className="text-center py-3 px-6 text-zinc-700 dark:text-zinc-300 font-semibold">
                      Raw Total
                    </th>
                    <th className="text-center py-3 px-6 text-zinc-700 dark:text-zinc-300 font-semibold">
                      HC
                    </th>
                    <th className="text-center py-3 px-6 text-zinc-700 dark:text-zinc-300 font-semibold">
                      w/ HC
                    </th>
                    <th className="text-center py-3 px-6 text-zinc-700 dark:text-zinc-300 font-semibold">
                      Paid
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.sessions.map((session, index) => (
                    <tr
                      key={index}
                      className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                      <td className="py-4 px-6 text-zinc-900 dark:text-zinc-50 font-medium">
                        {new Date(session.sessionDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-zinc-900 dark:text-zinc-50">{session.tournament.name}</div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-500">
                          {session.tournament.bowlingAlley}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-zinc-600 dark:text-zinc-400">
                        {session.team.name}
                      </td>
                      <td className="py-4 px-6 text-zinc-600 dark:text-zinc-400">
                        {session.opponentTeam?.name || '-'}
                      </td>
                      <td className="py-4 px-6 text-center text-zinc-600 dark:text-zinc-400">
                        {session.lane.laneNumber}
                        {session.lane.opponentLaneNumber && ` vs ${session.lane.opponentLaneNumber}`}
                      </td>
                      <td className="py-4 px-6 text-center text-zinc-900 dark:text-zinc-50 font-mono">
                        {session.scores.line1}
                      </td>
                      <td className="py-4 px-6 text-center text-zinc-900 dark:text-zinc-50 font-mono">
                        {session.scores.line2}
                      </td>
                      <td className="py-4 px-6 text-center text-zinc-900 dark:text-zinc-50 font-mono">
                        {session.scores.line3}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">
                          {session.scores.rawTotal}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center text-zinc-600 dark:text-zinc-400 font-mono">
                        {session.scores.handicap > 0 ? `+${session.scores.handicap}` : session.scores.handicap}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className="font-bold text-green-600 dark:text-green-400 font-mono">
                          {session.scores.totalWithHandicap}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        {session.payment ? (
                          <span className="text-green-600 dark:text-green-400">✓</span>
                        ) : (
                          <span className="text-red-600 dark:text-red-400">✗</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
