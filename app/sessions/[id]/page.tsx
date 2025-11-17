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
  sessionMatchups: Array<{
    id: number;
    laneId: number;
    teamAId: number | null;
    teamBId: number | null;
    lane: {
      id: number;
      laneNumber: number;
      opponentLaneId: number | null;
      opponentLane: {
        id: number;
        laneNumber: number;
      } | null;
    };
    teamA: {
      id: number;
      name: string;
      teamPlayers: Array<{
        id: number;
        playerId: number;
        player: {
          id: number;
          name: string;
        };
      }>;
    } | null;
    teamB: {
      id: number;
      name: string;
      teamPlayers: Array<{
        id: number;
        playerId: number;
        player: {
          id: number;
          name: string;
        };
      }>;
    } | null;
  }>;
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
  teamPlayers: Array<{
    id: number;
    playerId: number;
    player: {
      id: number;
      name: string;
    };
  }>;
}

interface Lane {
  id: number;
  laneNumber: number;
  opponentLaneId: number | null;
  opponentLane: {
    id: number;
    laneNumber: number;
  } | null;
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

interface MatchupScores {
  [matchupId: number]: {
    teamA: ScoreEntry[];
    teamB: ScoreEntry[];
  };
}

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [session, setSession] = useState<Session | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [lanes, setLanes] = useState<Lane[]>([]);
  const [matchupScores, setMatchupScores] = useState<MatchupScores>({});
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
      }

      // Fetch lanes
      const lanesResponse = await fetch('/api/lanes');
      const lanesResult = await lanesResponse.json();

      if (lanesResult.success) {
        setLanes(lanesResult.data.filter((lane: Lane) => lane.opponentLane));
      }

      // Initialize scores for existing matchups
      const scores: MatchupScores = {};

      sessionData.sessionMatchups.forEach((matchup: any) => {
        scores[matchup.id] = {
          teamA: matchup.teamA
            ? matchup.teamA.teamPlayers.map((tp: any) => {
                const existingScore = sessionData.teamPlayerSessions.find(
                  (tps: any) => tps.teamPlayer.id === tp.id && tps.laneId === matchup.laneId
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
              })
            : [],
          teamB: matchup.teamB
            ? matchup.teamB.teamPlayers.map((tp: any) => {
                const existingScore = sessionData.teamPlayerSessions.find(
                  (tps: any) => tps.teamPlayer.id === tp.id && tps.laneId === matchup.lane.opponentLane?.id
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
              })
            : [],
        };
      });

      setMatchupScores(scores);
    } catch (err) {
      setError('Network error - failed to fetch session data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMatchup = async (laneId: number) => {
    try {
      const response = await fetch('/api/session-matchups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: parseInt(sessionId),
          laneId,
          teamAId: null,
          teamBId: null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        fetchSessionData();
      } else {
        alert(result.error || 'Failed to create matchup');
      }
    } catch (err) {
      console.error('Failed to create matchup:', err);
      alert('Failed to create matchup');
    }
  };

  const handleUpdateMatchupTeams = async (
    matchupId: number,
    teamAId: number | null,
    teamBId: number | null
  ) => {
    try {
      const response = await fetch(`/api/session-matchups/${matchupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamAId,
          teamBId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        fetchSessionData();
      } else {
        alert(result.error || 'Failed to update matchup');
      }
    } catch (err) {
      console.error('Failed to update matchup:', err);
      alert('Failed to update matchup');
    }
  };

  const updateScore = (
    matchupId: number,
    team: 'teamA' | 'teamB',
    index: number,
    field: keyof ScoreEntry,
    value: any
  ) => {
    setMatchupScores((prev) => {
      const updated = { ...prev };
      if (!updated[matchupId]) {
        updated[matchupId] = { teamA: [], teamB: [] };
      }
      const scores = [...updated[matchupId][team]];
      (scores[index] as any)[field] = value;
      updated[matchupId] = {
        ...updated[matchupId],
        [team]: scores,
      };
      return updated;
    });
  };

  const handleSaveScores = async () => {
    try {
      setSaving(true);

      // Collect all scores from all matchups
      const allScores: any[] = [];

      Object.values(matchupScores).forEach((matchup) => {
        allScores.push(...matchup.teamA, ...matchup.teamB);
      });

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

  // Find lanes that don't have matchups yet
  const assignedLaneIds = session.sessionMatchups.map((m) => m.laneId);
  const unassignedLanes = lanes.filter((lane) => !assignedLaneIds.includes(lane.id));

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
            {session.sessionMatchups.length} match{session.sessionMatchups.length !== 1 ? 'es' : ''}{' '}
            configured
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Add Matchup Section */}
        {unassignedLanes.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-3">
              Add Lane Matchup
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
              Select a lane pair to add to this session
            </p>
            <div className="flex flex-wrap gap-2">
              {unassignedLanes.map((lane) => (
                <button
                  key={lane.id}
                  onClick={() => handleCreateMatchup(lane.id)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  Lane {lane.laneNumber} vs Lane {lane.opponentLane?.laneNumber}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Matchups */}
        {session.sessionMatchups.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-12 text-center">
            <p className="text-zinc-600 dark:text-zinc-400 text-lg">
              No matchups configured yet. Add lane matchups above to get started.
            </p>
          </div>
        ) : (
          <>
            {session.sessionMatchups.map((matchup) => (
              <div
                key={matchup.id}
                className="bg-white dark:bg-zinc-900 rounded-lg border-2 border-zinc-200 dark:border-zinc-800 overflow-hidden"
              >
                {/* Matchup Header */}
                <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-3">
                    Lane {matchup.lane.laneNumber} vs Lane {matchup.lane.opponentLane?.laneNumber}
                  </h2>

                  {/* Team Selection */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        Team on Lane {matchup.lane.laneNumber}
                      </label>
                      <select
                        value={matchup.teamAId || ''}
                        onChange={(e) =>
                          handleUpdateMatchupTeams(
                            matchup.id,
                            e.target.value ? parseInt(e.target.value) : null,
                            matchup.teamBId
                          )
                        }
                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50"
                      >
                        <option value="">Select team...</option>
                        {teams.map((team) => (
                          <option key={team.id} value={team.id}>
                            {team.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        Team on Lane {matchup.lane.opponentLane?.laneNumber}
                      </label>
                      <select
                        value={matchup.teamBId || ''}
                        onChange={(e) =>
                          handleUpdateMatchupTeams(
                            matchup.id,
                            matchup.teamAId,
                            e.target.value ? parseInt(e.target.value) : null
                          )
                        }
                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50"
                      >
                        <option value="">Select team...</option>
                        {teams.map((team) => (
                          <option key={team.id} value={team.id}>
                            {team.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Score Entry Tables */}
                {matchup.teamA && matchup.teamB && matchupScores[matchup.id] ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-zinc-200 dark:divide-zinc-800">
                    {/* Team A Scores */}
                    <div className="p-6">
                      <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-4">
                        {matchup.teamA.name}
                        <span className="text-sm font-normal text-zinc-600 dark:text-zinc-400 ml-2">
                          (Lane {matchup.lane.laneNumber})
                        </span>
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                            <tr>
                              <th className="text-left py-2 px-3 text-zinc-700 dark:text-zinc-300 font-semibold">
                                Player
                              </th>
                              <th className="text-center py-2 px-2 text-zinc-700 dark:text-zinc-300 font-semibold">
                                L1
                              </th>
                              <th className="text-center py-2 px-2 text-zinc-700 dark:text-zinc-300 font-semibold">
                                L2
                              </th>
                              <th className="text-center py-2 px-2 text-zinc-700 dark:text-zinc-300 font-semibold">
                                L3
                              </th>
                              <th className="text-center py-2 px-2 text-zinc-700 dark:text-zinc-300 font-semibold">
                                Total
                              </th>
                              <th className="text-center py-2 px-2 text-zinc-700 dark:text-zinc-300 font-semibold">
                                HC
                              </th>
                              <th className="text-center py-2 px-2 text-zinc-700 dark:text-zinc-300 font-semibold">
                                Asst
                              </th>
                              <th className="text-center py-2 px-2 text-zinc-700 dark:text-zinc-300 font-semibold">
                                Paid
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {matchupScores[matchup.id].teamA.map((score, index) => (
                              <tr key={index} className="border-b border-zinc-100 dark:border-zinc-800">
                                <td className="py-2 px-3 text-zinc-900 dark:text-zinc-50 font-medium">
                                  {score.playerName}
                                </td>
                                <td className="py-2 px-2">
                                  <input
                                    type="number"
                                    min="0"
                                    max="300"
                                    value={score.line1}
                                    onChange={(e) =>
                                      updateScore(
                                        matchup.id,
                                        'teamA',
                                        index,
                                        'line1',
                                        parseInt(e.target.value) || 0
                                      )
                                    }
                                    className="w-16 px-2 py-1 text-center border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50"
                                  />
                                </td>
                                <td className="py-2 px-2">
                                  <input
                                    type="number"
                                    min="0"
                                    max="300"
                                    value={score.line2}
                                    onChange={(e) =>
                                      updateScore(
                                        matchup.id,
                                        'teamA',
                                        index,
                                        'line2',
                                        parseInt(e.target.value) || 0
                                      )
                                    }
                                    className="w-16 px-2 py-1 text-center border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50"
                                  />
                                </td>
                                <td className="py-2 px-2">
                                  <input
                                    type="number"
                                    min="0"
                                    max="300"
                                    value={score.line3}
                                    onChange={(e) =>
                                      updateScore(
                                        matchup.id,
                                        'teamA',
                                        index,
                                        'line3',
                                        parseInt(e.target.value) || 0
                                      )
                                    }
                                    className="w-16 px-2 py-1 text-center border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50"
                                  />
                                </td>
                                <td className="py-2 px-2 text-center">
                                  <span className="font-bold text-blue-600 dark:text-blue-400">
                                    {score.line1 + score.line2 + score.line3}
                                  </span>
                                </td>
                                <td className="py-2 px-2">
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={score.handicap}
                                    onChange={(e) =>
                                      updateScore(
                                        matchup.id,
                                        'teamA',
                                        index,
                                        'handicap',
                                        parseInt(e.target.value) || 0
                                      )
                                    }
                                    className="w-16 px-2 py-1 text-center border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50"
                                  />
                                </td>
                                <td className="py-2 px-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={score.assistance}
                                    onChange={(e) =>
                                      updateScore(matchup.id, 'teamA', index, 'assistance', e.target.checked)
                                    }
                                    className="w-4 h-4 text-blue-600 border-zinc-300 rounded focus:ring-blue-500"
                                  />
                                </td>
                                <td className="py-2 px-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={score.payment}
                                    onChange={(e) =>
                                      updateScore(matchup.id, 'teamA', index, 'payment', e.target.checked)
                                    }
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
                    <div className="p-6">
                      <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-4">
                        {matchup.teamB.name}
                        <span className="text-sm font-normal text-zinc-600 dark:text-zinc-400 ml-2">
                          (Lane {matchup.lane.opponentLane?.laneNumber})
                        </span>
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                            <tr>
                              <th className="text-left py-2 px-3 text-zinc-700 dark:text-zinc-300 font-semibold">
                                Player
                              </th>
                              <th className="text-center py-2 px-2 text-zinc-700 dark:text-zinc-300 font-semibold">
                                L1
                              </th>
                              <th className="text-center py-2 px-2 text-zinc-700 dark:text-zinc-300 font-semibold">
                                L2
                              </th>
                              <th className="text-center py-2 px-2 text-zinc-700 dark:text-zinc-300 font-semibold">
                                L3
                              </th>
                              <th className="text-center py-2 px-2 text-zinc-700 dark:text-zinc-300 font-semibold">
                                Total
                              </th>
                              <th className="text-center py-2 px-2 text-zinc-700 dark:text-zinc-300 font-semibold">
                                HC
                              </th>
                              <th className="text-center py-2 px-2 text-zinc-700 dark:text-zinc-300 font-semibold">
                                Asst
                              </th>
                              <th className="text-center py-2 px-2 text-zinc-700 dark:text-zinc-300 font-semibold">
                                Paid
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {matchupScores[matchup.id].teamB.map((score, index) => (
                              <tr key={index} className="border-b border-zinc-100 dark:border-zinc-800">
                                <td className="py-2 px-3 text-zinc-900 dark:text-zinc-50 font-medium">
                                  {score.playerName}
                                </td>
                                <td className="py-2 px-2">
                                  <input
                                    type="number"
                                    min="0"
                                    max="300"
                                    value={score.line1}
                                    onChange={(e) =>
                                      updateScore(
                                        matchup.id,
                                        'teamB',
                                        index,
                                        'line1',
                                        parseInt(e.target.value) || 0
                                      )
                                    }
                                    className="w-16 px-2 py-1 text-center border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50"
                                  />
                                </td>
                                <td className="py-2 px-2">
                                  <input
                                    type="number"
                                    min="0"
                                    max="300"
                                    value={score.line2}
                                    onChange={(e) =>
                                      updateScore(
                                        matchup.id,
                                        'teamB',
                                        index,
                                        'line2',
                                        parseInt(e.target.value) || 0
                                      )
                                    }
                                    className="w-16 px-2 py-1 text-center border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50"
                                  />
                                </td>
                                <td className="py-2 px-2">
                                  <input
                                    type="number"
                                    min="0"
                                    max="300"
                                    value={score.line3}
                                    onChange={(e) =>
                                      updateScore(
                                        matchup.id,
                                        'teamB',
                                        index,
                                        'line3',
                                        parseInt(e.target.value) || 0
                                      )
                                    }
                                    className="w-16 px-2 py-1 text-center border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50"
                                  />
                                </td>
                                <td className="py-2 px-2 text-center">
                                  <span className="font-bold text-blue-600 dark:text-blue-400">
                                    {score.line1 + score.line2 + score.line3}
                                  </span>
                                </td>
                                <td className="py-2 px-2">
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={score.handicap}
                                    onChange={(e) =>
                                      updateScore(
                                        matchup.id,
                                        'teamB',
                                        index,
                                        'handicap',
                                        parseInt(e.target.value) || 0
                                      )
                                    }
                                    className="w-16 px-2 py-1 text-center border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50"
                                  />
                                </td>
                                <td className="py-2 px-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={score.assistance}
                                    onChange={(e) =>
                                      updateScore(matchup.id, 'teamB', index, 'assistance', e.target.checked)
                                    }
                                    className="w-4 h-4 text-blue-600 border-zinc-300 rounded focus:ring-blue-500"
                                  />
                                </td>
                                <td className="py-2 px-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={score.payment}
                                    onChange={(e) =>
                                      updateScore(matchup.id, 'teamB', index, 'payment', e.target.checked)
                                    }
                                    className="w-4 h-4 text-green-600 border-zinc-300 rounded focus:ring-green-500"
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center text-zinc-600 dark:text-zinc-400">
                    Assign teams to both lanes to enter scores
                  </div>
                )}
              </div>
            ))}

            {/* Save Button */}
            <div className="flex justify-end sticky bottom-4">
              <button
                onClick={handleSaveScores}
                disabled={saving}
                className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {saving ? 'Saving...' : 'Save All Scores'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
