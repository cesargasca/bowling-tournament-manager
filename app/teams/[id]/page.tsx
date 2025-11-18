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
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<number[]>([]);
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTeamDetails();
    fetchAllPlayers();
  }, [teamId]);

  useEffect(() => {
    if (team && allPlayers.length > 0) {
      // Filter out players already in the team and players in other teams in this tournament
      fetchAvailablePlayers();
    }
  }, [team, allPlayers, isEditing]);

  const fetchTeamDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/teams/${teamId}`);
      const result = await response.json();

      if (result.success) {
        setTeam(result.data);
        setTeamName(result.data.name);
        setSelectedPlayerIds(result.data.teamPlayers.map((tp: any) => tp.playerId));
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
          (player) => !playerIdsInOtherTeams.has(player.id)
        );

        setAvailablePlayers(available);
      }
    } catch (err) {
      console.error('Failed to fetch available players:', err);
    }
  };

  const handleSave = async () => {
    if (!team) return;

    // Validate team size
    if (selectedPlayerIds.length !== team.tournament.teamSize) {
      setError(
        `Team must have exactly ${team.tournament.teamSize} player${team.tournament.teamSize !== 1 ? 's' : ''} for this tournament`
      );
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const response = await fetch(`/api/teams/${teamId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: teamName,
          playerIds: selectedPlayerIds,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setTeam(result.data);
        setIsEditing(false);
      } else {
        setError(result.error || 'Failed to update team');
      }
    } catch (err) {
      setError('Network error - failed to update team');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (!team) return;
    setTeamName(team.name);
    setSelectedPlayerIds(team.teamPlayers.map((tp) => tp.playerId));
    setIsEditing(false);
    setError(null);
  };

  const handlePlayerToggle = (playerId: number) => {
    setSelectedPlayerIds((prev) => {
      if (prev.includes(playerId)) {
        return prev.filter((id) => id !== playerId);
      } else {
        return [...prev, playerId];
      }
    });
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
                Edit Team
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

        {/* Team Members */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Team Members</h2>
            <span
              className={`text-sm font-medium ${
                selectedPlayerIds.length === team.tournament.teamSize
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-orange-600 dark:text-orange-400'
              }`}
            >
              {selectedPlayerIds.length} / {team.tournament.teamSize} player
              {team.tournament.teamSize !== 1 ? 's' : ''}
            </span>
          </div>

          {!isEditing ? (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {team.teamPlayers.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-zinc-600 dark:text-zinc-400 text-lg">No players in this team</p>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add Players
                  </button>
                </div>
              ) : (
                team.teamPlayers.map((tp) => (
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
                      <div>
                        <button
                          onClick={() => router.push(`/players/${tp.playerId}`)}
                          className="text-zinc-900 dark:text-zinc-50 font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left"
                        >
                          {tp.player.name}
                        </button>
                        {tp.isReplacement && (
                          <span className="ml-2 text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 px-2 py-0.5 rounded">
                            Replacement
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="p-6">
              <div className="mb-4">
                <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                  Select exactly <span className="font-semibold text-zinc-900 dark:text-zinc-50">{team.tournament.teamSize}</span> player
                  {team.tournament.teamSize !== 1 ? 's' : ''} for this team. Players already in other teams in this tournament are not available.
                </div>
                {selectedPlayerIds.length !== team.tournament.teamSize && (
                  <div className="text-sm bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded px-3 py-2 text-orange-800 dark:text-orange-200">
                    {selectedPlayerIds.length < team.tournament.teamSize
                      ? `Select ${team.tournament.teamSize - selectedPlayerIds.length} more player${team.tournament.teamSize - selectedPlayerIds.length !== 1 ? 's' : ''}`
                      : `Remove ${selectedPlayerIds.length - team.tournament.teamSize} player${selectedPlayerIds.length - team.tournament.teamSize !== 1 ? 's' : ''}`}
                  </div>
                )}
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {availablePlayers.length === 0 ? (
                  <div className="p-8 text-center text-zinc-600 dark:text-zinc-400">
                    No available players. All players are already assigned to teams in this tournament.
                  </div>
                ) : (
                  availablePlayers.map((player) => (
                    <label
                      key={player.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPlayerIds.includes(player.id)}
                        onChange={() => handlePlayerToggle(player.id)}
                        className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-600 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <span className="text-blue-600 dark:text-blue-400 text-sm font-semibold">
                          {player.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-zinc-900 dark:text-zinc-50">{player.name}</span>
                    </label>
                  ))
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex items-center gap-3">
                <button
                  onClick={handleSave}
                  disabled={
                    saving ||
                    teamName.trim() === '' ||
                    selectedPlayerIds.length !== team.tournament.teamSize
                  }
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="px-6 py-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
