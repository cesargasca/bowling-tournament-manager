'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface Team {
  id: number;
  name: string;
  tournamentId: number;
  laneId: number | null;
  groupId: number | null;
  tournament: {
    id: number;
    name: string;
    teamSize: number;
    substituteCount: number;
  };
  group: {
    id: number;
    name: string;
  } | null;
  teamPlayers: Array<{
    id: number;
    playerId: number;
    isReplacement: boolean;
    player: {
      id: number;
      name: string;
    };
  }>;
  warnings?: string[];
}

interface Player {
  id: number;
  name: string;
}

export default function TeamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params.id as string;

  const [team, setTeam] = useState<Team | null>(null);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form states
  const [teamName, setTeamName] = useState('');
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [saving, setSaving] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [isSubstitute, setIsSubstitute] = useState(false);
  const [removingPlayerId, setRemovingPlayerId] = useState<number | null>(null);

  useEffect(() => {
    fetchTeamDetails();
    fetchAllPlayers();
  }, [teamId]);

  useEffect(() => {
    if (team && allPlayers.length > 0) {
      fetchAvailablePlayers();
    }
  }, [team, allPlayers]);

  const fetchTeamDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/teams/${teamId}`);
      const result = await response.json();

      if (result.success) {
        setTeam(result.data);
        setTeamName(result.data.name);
      } else {
        setError(result.error || 'Failed to load team');
      }
    } catch (err) {
      setError('Network error - failed to fetch team');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllPlayers = async () => {
    try {
      const response = await fetch('/api/players');
      const result = await response.json();

      if (result.success) {
        setAllPlayers(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch players:', err);
    }
  };

  const fetchAvailablePlayers = async () => {
    if (!team) return;

    try {
      // Get all teams in this tournament
      const response = await fetch(`/api/teams?tournamentId=${team.tournamentId}`);
      const result = await response.json();

      if (result.success) {
        const teamsInTournament = result.data;

        // Collect all player IDs already in teams (excluding current team)
        const playerIdsInOtherTeams = new Set<number>();
        teamsInTournament.forEach((t: any) => {
          if (t.id !== team.id) {
            t.teamPlayers.forEach((tp: any) => {
              playerIdsInOtherTeams.add(tp.playerId);
            });
          }
        });

        // Filter available players
        const available = allPlayers.filter(
          (player) => !playerIdsInOtherTeams.has(player.id) &&
          !team.teamPlayers.some(tp => tp.playerId === player.id)
        );

        setAvailablePlayers(available);
      }
    } catch (err) {
      console.error('Failed to fetch available players:', err);
    }
  };

  const handleUpdateTeamName = async () => {
    if (!team || teamName.trim() === '') return;

    try {
      setSaving(true);
      setError(null);

      const response = await fetch(`/api/teams/${teamId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: teamName,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setTeam(result.data);
        setIsEditing(false);
      } else {
        setError(result.error || 'Failed to update team name');
      }
    } catch (err) {
      setError('Network error - failed to update team');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddPlayer = async () => {
    if (!team || !selectedPlayerId) return;

    try {
      setSaving(true);
      setError(null);

      const response = await fetch(`/api/teams/${teamId}/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addPlayers: [{ playerId: selectedPlayerId, isReplacement: isSubstitute }],
        }),
      });

      const result = await response.json();

      if (result.success) {
        setTeam(result.data);
        setSelectedPlayerId(null);
        setIsSubstitute(false);
        await fetchAvailablePlayers();
      } else {
        setError(result.error || 'Failed to add player');
      }
    } catch (err) {
      setError('Network error - failed to add player');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleRemovePlayer = async (playerId: number) => {
    if (!team) return;

    try {
      setRemovingPlayerId(playerId);
      setError(null);

      const response = await fetch(`/api/teams/${teamId}/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          removePlayerIds: [playerId],
        }),
      });

      const result = await response.json();

      if (result.success) {
        setTeam(result.data);
        await fetchAvailablePlayers();
      } else {
        setError(result.error || 'Failed to remove player');
      }
    } catch (err) {
      setError('Network error - failed to remove player');
      console.error(err);
    } finally {
      setRemovingPlayerId(null);
    }
  };

  const handleCancel = () => {
    if (!team) return;
    setTeamName(team.name);
    setIsEditing(false);
    setError(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-zinc-600 dark:text-zinc-400">Loading team...</p>
        </div>
      </div>
    );
  }

  if (error && !team) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 dark:text-red-400 text-lg font-semibold mb-4">{error}</div>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!team) return null;

  const regularPlayers = team.teamPlayers.filter(tp => !tp.isReplacement);
  const substitutes = team.teamPlayers.filter(tp => tp.isReplacement);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => router.push(`/tournaments/${team.tournamentId}`)}
            className="mb-4 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-2"
          >
            <span>←</span> Back to Tournament
          </button>

          {!isEditing ? (
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">{team.name}</h1>
                <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                  {team.tournament.name}
                  {team.group && ` • ${team.group.name}`}
                </p>
              </div>
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Edit Team Name
              </button>
            </div>
          ) : (
            <div>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="text-3xl font-bold bg-transparent border-b-2 border-blue-600 text-zinc-900 dark:text-zinc-50 focus:outline-none w-full max-w-md"
                placeholder="Team name"
              />
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                {team.tournament.name}
                {team.group && ` • ${team.group.name}`}
              </p>
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={handleUpdateTeamName}
                  disabled={saving || teamName.trim() === ''}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="px-4 py-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Warnings */}
        {team.warnings && team.warnings.length > 0 && (
          <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
            <h3 className="text-orange-900 dark:text-orange-100 font-semibold mb-2">Warnings:</h3>
            <ul className="list-disc list-inside text-orange-800 dark:text-orange-200 space-y-1">
              {team.warnings.map((warning, idx) => (
                <li key={idx}>{warning}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Regular Players */}
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Regular Players</h2>
              <span
                className={`text-sm font-medium ${
                  regularPlayers.length === team.tournament.teamSize
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-orange-600 dark:text-orange-400'
                }`}
              >
                {regularPlayers.length} / {team.tournament.teamSize} expected
              </span>
            </div>

            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {regularPlayers.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-zinc-600 dark:text-zinc-400">No regular players</p>
                </div>
              ) : (
                regularPlayers.map((tp) => (
                  <div
                    key={tp.id}
                    className="px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <span className="text-blue-600 dark:text-blue-400 font-semibold">
                          {tp.player.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <button
                        onClick={() => router.push(`/players/${tp.playerId}`)}
                        className="text-zinc-900 dark:text-zinc-50 font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left"
                      >
                        {tp.player.name}
                      </button>
                    </div>
                    <button
                      onClick={() => handleRemovePlayer(tp.playerId)}
                      disabled={removingPlayerId === tp.playerId}
                      className="px-3 py-1.5 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50"
                    >
                      {removingPlayerId === tp.playerId ? 'Removing...' : 'Remove'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Substitutes */}
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Substitutes</h2>
              <span
                className={`text-sm font-medium ${
                  substitutes.length === team.tournament.substituteCount
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-orange-600 dark:text-orange-400'
                }`}
              >
                {substitutes.length} / {team.tournament.substituteCount} expected
              </span>
            </div>

            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {substitutes.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-zinc-600 dark:text-zinc-400">No substitutes</p>
                </div>
              ) : (
                substitutes.map((tp) => (
                  <div
                    key={tp.id}
                    className="px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                        <span className="text-orange-600 dark:text-orange-400 font-semibold">
                          {tp.player.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <button
                        onClick={() => router.push(`/players/${tp.playerId}`)}
                        className="text-zinc-900 dark:text-zinc-50 font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left"
                      >
                        {tp.player.name}
                      </button>
                    </div>
                    <button
                      onClick={() => handleRemovePlayer(tp.playerId)}
                      disabled={removingPlayerId === tp.playerId}
                      className="px-3 py-1.5 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50"
                    >
                      {removingPlayerId === tp.playerId ? 'Removing...' : 'Remove'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Add Player Section */}
        <div className="mt-6 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Add Player</h2>
          </div>

          <div className="p-6">
            {availablePlayers.length === 0 ? (
              <p className="text-zinc-600 dark:text-zinc-400">
                No available players. All players are already assigned to teams in this tournament.
              </p>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Select Player
                  </label>
                  <select
                    value={selectedPlayerId || ''}
                    onChange={(e) => setSelectedPlayerId(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50"
                  >
                    <option value="">-- Select a player --</option>
                    {availablePlayers.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isSubstitute"
                    checked={isSubstitute}
                    onChange={(e) => setIsSubstitute(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-600 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="isSubstitute" className="text-sm text-zinc-700 dark:text-zinc-300">
                    Add as substitute
                  </label>
                </div>

                <button
                  onClick={handleAddPlayer}
                  disabled={!selectedPlayerId || saving}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Adding...' : 'Add Player'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
