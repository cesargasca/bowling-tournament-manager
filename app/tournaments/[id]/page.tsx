'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface TournamentDetails {
  tournament: {
    id: number;
    name: string;
    bowlingAlley: string;
    teamsCount: number;
    sessionsCount: number;
    playersCount: number;
  };
  teamStandings: Array<{
    teamId: number;
    teamName: string;
    totalPoints: number;
    sessionsPlayed: number;
    wins: number;
    losses: number;
    ties: number;
    totalPins: number;
    averagePins: number;
  }>;
  playerStandings: Array<{
    playerId: number;
    playerName: string;
    teamName: string;
    gamesPlayed: number;
    totalPins: number;
    average: number;
    highGame: number;
    lowGame: number;
    attendanceRate: number;
    paymentRate: number;
  }>;
}

export default function TournamentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tournamentId = params.id as string;

  const [data, setData] = useState<TournamentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'teams' | 'players'>('teams');

  useEffect(() => {
    fetchTournamentDetails();
  }, [tournamentId]);

  const fetchTournamentDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tournaments/${tournamentId}/details`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to load tournament details');
      }
    } catch (err) {
      setError('Network error - failed to fetch tournament details');
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
          <p className="mt-4 text-zinc-600 dark:text-zinc-400">Loading tournament details...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 dark:text-red-400 text-lg font-semibold mb-4">
            {error || 'Failed to load tournament details'}
          </div>
          <div className="flex gap-4 justify-center">
            <button
              onClick={fetchTournamentDetails}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-zinc-600 text-white rounded-lg hover:bg-zinc-700 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => router.push('/')}
            className="mb-4 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-2"
          >
            <span>←</span> Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            {data.tournament.name}
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            {data.tournament.bowlingAlley}
          </p>

          {/* Stats */}
          <div className="mt-4 flex gap-6 text-sm">
            <div>
              <span className="text-zinc-600 dark:text-zinc-400">Teams:</span>{' '}
              <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                {data.tournament.teamsCount}
              </span>
            </div>
            <div>
              <span className="text-zinc-600 dark:text-zinc-400">Players:</span>{' '}
              <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                {data.tournament.playersCount}
              </span>
            </div>
            <div>
              <span className="text-zinc-600 dark:text-zinc-400">Sessions:</span>{' '}
              <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                {data.tournament.sessionsCount}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="mb-6 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('teams')}
              className={`pb-4 px-2 font-semibold transition-colors ${
                activeTab === 'teams'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50'
              }`}
            >
              Team Standings
            </button>
            <button
              onClick={() => setActiveTab('players')}
              className={`pb-4 px-2 font-semibold transition-colors ${
                activeTab === 'players'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50'
              }`}
            >
              Player Standings
            </button>
          </div>
        </div>

        {/* Team Standings */}
        {activeTab === 'teams' && (
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                Team Standings (by Points)
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                Teams ranked by total points, then by total pins
              </p>
            </div>
            {data.teamStandings.length === 0 ? (
              <div className="px-6 py-8 text-center text-zinc-600 dark:text-zinc-400">
                No team standings available yet
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                    <tr>
                      <th className="text-left py-3 px-6 text-zinc-700 dark:text-zinc-300 font-semibold">
                        Rank
                      </th>
                      <th className="text-left py-3 px-6 text-zinc-700 dark:text-zinc-300 font-semibold">
                        Team
                      </th>
                      <th className="text-center py-3 px-6 text-zinc-700 dark:text-zinc-300 font-semibold">
                        Points
                      </th>
                      <th className="text-center py-3 px-6 text-zinc-700 dark:text-zinc-300 font-semibold">
                        Sessions
                      </th>
                      <th className="text-center py-3 px-6 text-zinc-700 dark:text-zinc-300 font-semibold">
                        W-L-T
                      </th>
                      <th className="text-center py-3 px-6 text-zinc-700 dark:text-zinc-300 font-semibold">
                        Total Pins
                      </th>
                      <th className="text-center py-3 px-6 text-zinc-700 dark:text-zinc-300 font-semibold">
                        Avg Pins
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.teamStandings.map((team, index) => (
                      <tr
                        key={team.teamId}
                        className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                                index === 0
                                  ? 'bg-yellow-500 text-white'
                                  : index === 1
                                  ? 'bg-zinc-400 text-white'
                                  : index === 2
                                  ? 'bg-orange-600 text-white'
                                  : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                              }`}
                            >
                              {index + 1}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-zinc-900 dark:text-zinc-50 font-medium">
                          {team.teamName}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                            {team.totalPoints}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center text-zinc-900 dark:text-zinc-50">
                          {team.sessionsPlayed}
                        </td>
                        <td className="py-4 px-6 text-center text-zinc-600 dark:text-zinc-400">
                          {team.wins}-{team.losses}-{team.ties}
                        </td>
                        <td className="py-4 px-6 text-center text-zinc-900 dark:text-zinc-50">
                          {team.totalPins.toLocaleString()}
                        </td>
                        <td className="py-4 px-6 text-center text-zinc-900 dark:text-zinc-50">
                          {team.averagePins}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Player Standings */}
        {activeTab === 'players' && (
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                Player Standings (by Average)
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                Players ranked by game average (total pins / total lines, without handicap)
              </p>
            </div>
            {data.playerStandings.length === 0 ? (
              <div className="px-6 py-8 text-center text-zinc-600 dark:text-zinc-400">
                No player standings available yet
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                    <tr>
                      <th className="text-left py-3 px-6 text-zinc-700 dark:text-zinc-300 font-semibold">
                        Rank
                      </th>
                      <th className="text-left py-3 px-6 text-zinc-700 dark:text-zinc-300 font-semibold">
                        Player
                      </th>
                      <th className="text-left py-3 px-6 text-zinc-700 dark:text-zinc-300 font-semibold">
                        Team
                      </th>
                      <th className="text-center py-3 px-6 text-zinc-700 dark:text-zinc-300 font-semibold">
                        Average
                      </th>
                      <th className="text-center py-3 px-6 text-zinc-700 dark:text-zinc-300 font-semibold">
                        Games
                      </th>
                      <th className="text-center py-3 px-6 text-zinc-700 dark:text-zinc-300 font-semibold">
                        Total Pins
                      </th>
                      <th className="text-center py-3 px-6 text-zinc-700 dark:text-zinc-300 font-semibold">
                        High/Low
                      </th>
                      <th className="text-center py-3 px-6 text-zinc-700 dark:text-zinc-300 font-semibold">
                        Attendance
                      </th>
                      <th className="text-center py-3 px-6 text-zinc-700 dark:text-zinc-300 font-semibold">
                        Payment
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.playerStandings.map((player, index) => (
                      <tr
                        key={player.playerId}
                        className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                                index === 0
                                  ? 'bg-yellow-500 text-white'
                                  : index === 1
                                  ? 'bg-zinc-400 text-white'
                                  : index === 2
                                  ? 'bg-orange-600 text-white'
                                  : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                              }`}
                            >
                              {index + 1}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-zinc-900 dark:text-zinc-50 font-medium">
                          {player.playerName}
                        </td>
                        <td className="py-4 px-6 text-zinc-600 dark:text-zinc-400">
                          {player.teamName}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                            {player.average}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center text-zinc-900 dark:text-zinc-50">
                          {player.gamesPlayed}
                        </td>
                        <td className="py-4 px-6 text-center text-zinc-900 dark:text-zinc-50">
                          {player.totalPins.toLocaleString()}
                        </td>
                        <td className="py-4 px-6 text-center text-zinc-600 dark:text-zinc-400">
                          {player.highGame}/{player.lowGame}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              player.attendanceRate >= 80
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : player.attendanceRate >= 60
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            }`}
                          >
                            {player.attendanceRate}%
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              player.paymentRate >= 80
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : player.paymentRate >= 60
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            }`}
                          >
                            {player.paymentRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
