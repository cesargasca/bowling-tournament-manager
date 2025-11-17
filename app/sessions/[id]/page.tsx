'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface Session {
  id: number;
  sessionDate: string;
  tournament: {
    id: number;
    name: string;
  };
  lane: {
    id: number;
    laneNumber: number;
    opponentLane: {
      id: number;
      laneNumber: number;
    } | null;
  };
  teamPlayerSessions: Array<{
    id: number;
    laneId: number;
    line1: number;
    line2: number;
    line3: number;
    payment: boolean;
    handicap: number;
    assistance: boolean;
    teamPlayer: {
      id: number;
      player: {
        id: number;
        name: string;
      };
      team: {
        id: number;
        name: string;
      };
    };
  }>;
}

interface Team {
  id: number;
  name: string;
  laneId: number | null;
  teamPlayers: Array<{
    id: number;
    playerId: number;
    player: {
      id: number;
      name: string;
    };
  }>;
}

interface ScoreEntry {
  teamPlayerId: number;
  playerId: number;
  playerName: string;
  line1: number;
  line2: number;
  line3: number;
  handicap: number;
  assistance: boolean;
  payment: boolean;
}

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [session, setSession] = useState<Session | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamAScores, setTeamAScores] = useState<ScoreEntry[]>([]);
  const [teamBScores, setTeamBScores] = useState<ScoreEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSessionData();
  }, [sessionId]);

  const fetchSessionData = async () => {
    try {
      setLoading(true);

      // Fetch session details
      const sessionResponse = await fetch(`/api/sessions/${sessionId}`);
      const sessionResult = await sessionResponse.json();

      if (!sessionResult.success) {
        setError(sessionResult.error || 'Failed to load session');
        return;
      }

      const sessionData = sessionResult.data;
      setSession(sessionData);

      // Fetch teams for this tournament
      const teamsResponse = await fetch(`/api/teams?tournamentId=${sessionData.tournament.id}`);
      const teamsResult = await teamsResponse.json();

      if (teamsResult.success) {
        setTeams(teamsResult.data);

        // Find teams assigned to the lanes
        const teamA = teamsResult.data.find((t: Team) => t.laneId === sessionData.lane.id);
        const teamB = teamsResult.data.find(
          (t: Team) => t.laneId === sessionData.lane.opponentLane?.id
        );

        // Initialize score entries
        if (teamA) {
          const teamAEntries = teamA.teamPlayers.map((tp: any) => {
            const existingScore = sessionData.teamPlayerSessions.find(
              (tps: any) => tps.teamPlayer.id === tp.id
            );

            return {
              teamPlayerId: tp.id,
              playerId: tp.playerId,
              playerName: tp.player.name,
              line1: existingScore?.line1 || 0,
              line2: existingScore?.line2 || 0,
              line3: existingScore?.line3 || 0,
              handicap: existingScore?.handicap || 0,
              assistance: existingScore?.assistance || false,
              payment: existingScore?.payment || false,
            };
          });
          setTeamAScores(teamAEntries);
        }

        if (teamB) {
          const teamBEntries = teamB.teamPlayers.map((tp: any) => {
            const existingScore = sessionData.teamPlayerSessions.find(
              (tps: any) => tps.teamPlayer.id === tp.id
            );

            return {
              teamPlayerId: tp.id,
              playerId: tp.playerId,
              playerName: tp.player.name,
              line1: existingScore?.line1 || 0,
              line2: existingScore?.line2 || 0,
              line3: existingScore?.line3 || 0,
              handicap: existingScore?.handicap || 0,
              assistance: existingScore?.assistance || false,
              payment: existingScore?.payment || false,
            };
          });
          setTeamBScores(teamBEntries);
        }
      }
    } catch (err) {
      setError('Network error - failed to fetch session data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateTeamAScore = (index: number, field: keyof ScoreEntry, value: any) => {
    const updated = [...teamAScores];
    (updated[index] as any)[field] = value;
    setTeamAScores(updated);
  };

  const updateTeamBScore = (index: number, field: keyof ScoreEntry, value: any) => {
    const updated = [...teamBScores];
    (updated[index] as any)[field] = value;
    setTeamBScores(updated);
  };

  const handleSaveScores = async () => {
    try {
      setSaving(true);

      const allScores = [...teamAScores, ...teamBScores];

      const response = await fetch(`/api/sessions/${sessionId}/scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: parseInt(sessionId),
          scores: allScores,
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert('Scores saved successfully!');
        fetchSessionData();
      } else {
        alert(result.error || 'Failed to save scores');
      }
    } catch (err) {
      console.error('Failed to save scores:', err);
      alert('Failed to save scores');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-zinc-600 dark:text-zinc-400">Loading session...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 dark:text-red-400 text-lg font-semibold mb-4">
            {error || 'Session not found'}
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

  const teamA = teams.find((t) => t.laneId === session.lane.id);
  const teamB = teams.find((t) => t.laneId === session.lane.opponentLane?.id);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => router.push(`/tournaments/${session.tournament.id}`)}
            className="mb-4 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-2"
          >
            <span>←</span> Back to Tournament
          </button>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            Session Score Entry
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            {session.tournament.name} •{' '}
            {new Date(session.sessionDate).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
            Lane {session.lane.laneNumber}
            {session.lane.opponentLane && ` vs Lane ${session.lane.opponentLane.laneNumber}`}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!teamA || !teamB ? (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900 rounded-lg p-6">
            <p className="text-yellow-800 dark:text-yellow-400">
              No teams assigned to these lanes. Please assign teams to Lane {session.lane.laneNumber}
              {session.lane.opponentLane && ` and Lane ${session.lane.opponentLane.laneNumber}`} to
              enter scores.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Team A Scores */}
            <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-blue-50 dark:bg-blue-950/20">
                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                  {teamA.name} <span className="text-sm font-normal text-zinc-600 dark:text-zinc-400">(Lane {session.lane.laneNumber})</span>
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                    <tr>
                      <th className="text-left py-3 px-6 text-zinc-700 dark:text-zinc-300 font-semibold">
                        Player
                      </th>
                      <th className="text-center py-3 px-6 text-zinc-700 dark:text-zinc-300 font-semibold">
                        Line 1
                      </th>
                      <th className="text-center py-3 px-6 text-zinc-700 dark:text-zinc-300 font-semibold">
                        Line 2
                      </th>
                      <th className="text-center py-3 px-6 text-zinc-700 dark:text-zinc-300 font-semibold">
                        Line 3
                      </th>
                      <th className="text-center py-3 px-6 text-zinc-700 dark:text-zinc-300 font-semibold">
                        Total
                      </th>
                      <th className="text-center py-3 px-6 text-zinc-700 dark:text-zinc-300 font-semibold">
                        Handicap
                      </th>
                      <th className="text-center py-3 px-6 text-zinc-700 dark:text-zinc-300 font-semibold">
                        Assistance
                      </th>
                      <th className="text-center py-3 px-6 text-zinc-700 dark:text-zinc-300 font-semibold">
                        Payment
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamAScores.map((score, index) => (
                      <tr key={index} className="border-b border-zinc-100 dark:border-zinc-800">
                        <td className="py-4 px-6 text-zinc-900 dark:text-zinc-50 font-medium">
                          {score.playerName}
                        </td>
                        <td className="py-4 px-6">
                          <input
                            type="number"
                            min="0"
                            max="300"
                            value={score.line1}
                            onChange={(e) =>
                              updateTeamAScore(index, 'line1', parseInt(e.target.value) || 0)
                            }
                            className="w-20 px-2 py-1 text-center border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50"
                          />
                        </td>
                        <td className="py-4 px-6">
                          <input
                            type="number"
                            min="0"
                            max="300"
                            value={score.line2}
                            onChange={(e) =>
                              updateTeamAScore(index, 'line2', parseInt(e.target.value) || 0)
                            }
                            className="w-20 px-2 py-1 text-center border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50"
                          />
                        </td>
                        <td className="py-4 px-6">
                          <input
                            type="number"
                            min="0"
                            max="300"
                            value={score.line3}
                            onChange={(e) =>
                              updateTeamAScore(index, 'line3', parseInt(e.target.value) || 0)
                            }
                            className="w-20 px-2 py-1 text-center border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50"
                          />
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                            {score.line1 + score.line2 + score.line3}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={score.handicap}
                            onChange={(e) =>
                              updateTeamAScore(index, 'handicap', parseInt(e.target.value) || 0)
                            }
                            className="w-20 px-2 py-1 text-center border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50"
                          />
                        </td>
                        <td className="py-4 px-6 text-center">
                          <input
                            type="checkbox"
                            checked={score.assistance}
                            onChange={(e) => updateTeamAScore(index, 'assistance', e.target.checked)}
                            className="w-4 h-4 text-blue-600 border-zinc-300 rounded focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-4 px-6 text-center">
                          <input
                            type="checkbox"
                            checked={score.payment}
                            onChange={(e) => updateTeamAScore(index, 'payment', e.target.checked)}
                            className="w-4 h-4 text-green-600 border-zinc-300 rounded focus:ring-green-500"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Team B Scores */}
            <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-green-50 dark:bg-green-950/20">
                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                  {teamB.name}{' '}
                  <span className="text-sm font-normal text-zinc-600 dark:text-zinc-400">
                    (Lane {session.lane.opponentLane?.laneNumber})
                  </span>
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                    <tr>
                      <th className="text-left py-3 px-6 text-zinc-700 dark:text-zinc-300 font-semibold">
                        Player
                      </th>
                      <th className="text-center py-3 px-6 text-zinc-700 dark:text-zinc-300 font-semibold">
                        Line 1
                      </th>
                      <th className="text-center py-3 px-6 text-zinc-700 dark:text-zinc-300 font-semibold">
                        Line 2
                      </th>
                      <th className="text-center py-3 px-6 text-zinc-700 dark:text-zinc-300 font-semibold">
                        Line 3
                      </th>
                      <th className="text-center py-3 px-6 text-zinc-700 dark:text-zinc-300 font-semibold">
                        Total
                      </th>
                      <th className="text-center py-3 px-6 text-zinc-700 dark:text-zinc-300 font-semibold">
                        Handicap
                      </th>
                      <th className="text-center py-3 px-6 text-zinc-700 dark:text-zinc-300 font-semibold">
                        Assistance
                      </th>
                      <th className="text-center py-3 px-6 text-zinc-700 dark:text-zinc-300 font-semibold">
                        Payment
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamBScores.map((score, index) => (
                      <tr key={index} className="border-b border-zinc-100 dark:border-zinc-800">
                        <td className="py-4 px-6 text-zinc-900 dark:text-zinc-50 font-medium">
                          {score.playerName}
                        </td>
                        <td className="py-4 px-6">
                          <input
                            type="number"
                            min="0"
                            max="300"
                            value={score.line1}
                            onChange={(e) =>
                              updateTeamBScore(index, 'line1', parseInt(e.target.value) || 0)
                            }
                            className="w-20 px-2 py-1 text-center border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50"
                          />
                        </td>
                        <td className="py-4 px-6">
                          <input
                            type="number"
                            min="0"
                            max="300"
                            value={score.line2}
                            onChange={(e) =>
                              updateTeamBScore(index, 'line2', parseInt(e.target.value) || 0)
                            }
                            className="w-20 px-2 py-1 text-center border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50"
                          />
                        </td>
                        <td className="py-4 px-6">
                          <input
                            type="number"
                            min="0"
                            max="300"
                            value={score.line3}
                            onChange={(e) =>
                              updateTeamBScore(index, 'line3', parseInt(e.target.value) || 0)
                            }
                            className="w-20 px-2 py-1 text-center border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50"
                          />
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                            {score.line1 + score.line2 + score.line3}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={score.handicap}
                            onChange={(e) =>
                              updateTeamBScore(index, 'handicap', parseInt(e.target.value) || 0)
                            }
                            className="w-20 px-2 py-1 text-center border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50"
                          />
                        </td>
                        <td className="py-4 px-6 text-center">
                          <input
                            type="checkbox"
                            checked={score.assistance}
                            onChange={(e) => updateTeamBScore(index, 'assistance', e.target.checked)}
                            className="w-4 h-4 text-blue-600 border-zinc-300 rounded focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-4 px-6 text-center">
                          <input
                            type="checkbox"
                            checked={score.payment}
                            onChange={(e) => updateTeamBScore(index, 'payment', e.target.checked)}
                            className="w-4 h-4 text-green-600 border-zinc-300 rounded focus:ring-green-500"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSaveScores}
                disabled={saving}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save All Scores'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
