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
  groups: Array<{
    id: number;
    name: string;
    displayOrder: number;
  }>;
  categories: Array<{
    id: number;
    name: string;
    minAverage: number | null;
    maxAverage: number | null;
    displayOrder: number;
  }>;
  groupedStandings: Array<{
    groupId: number | null;
    groupName: string;
    teams: Array<{
      teamId: number;
      teamName: string;
      groupId: number | null;
      totalPoints: number;
      sessionsPlayed: number;
      wins: number;
      losses: number;
      ties: number;
      totalPins: number;
      averagePins: number;
    }>;
  }>;
  categorizedStandings: Array<{
    categoryId: number | null;
    categoryName: string;
    minAverage: number | null;
    maxAverage: number | null;
    players: Array<{
      playerId: number;
      playerName: string;
      teamName: string;
      categoryId: number | null;
      isManualCategory: boolean;
      gamesPlayed: number;
      totalPins: number;
      average: number;
      highGame: number;
      lowGame: number;
      attendanceRate: number;
      paymentRate: number;
    }>;
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
  const [managementMode, setManagementMode] = useState(false);

  // Form states for new group/category
  const [newGroupName, setNewGroupName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryMin, setNewCategoryMin] = useState('');
  const [newCategoryMax, setNewCategoryMax] = useState('');

  // Bulk selection states
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<number>>(new Set());
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<number>>(new Set());
  const [bulkGroupId, setBulkGroupId] = useState<string>('');
  const [bulkCategoryId, setBulkCategoryId] = useState<string>('');

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

  const createGroup = async () => {
    if (!newGroupName.trim()) return;

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGroupName }),
      });

      if (response.ok) {
        setNewGroupName('');
        fetchTournamentDetails();
      }
    } catch (err) {
      console.error('Failed to create group:', err);
    }
  };

  const createCategory = async () => {
    if (!newCategoryName.trim()) return;

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCategoryName,
          minAverage: newCategoryMin || null,
          maxAverage: newCategoryMax || null,
        }),
      });

      if (response.ok) {
        setNewCategoryName('');
        setNewCategoryMin('');
        setNewCategoryMax('');
        fetchTournamentDetails();
      }
    } catch (err) {
      console.error('Failed to create category:', err);
    }
  };

  const moveTeamToGroup = async (teamId: number, groupId: number | null) => {
    try {
      const response = await fetch(`/api/teams/${teamId}/group`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId }),
      });

      if (response.ok) {
        fetchTournamentDetails();
      }
    } catch (err) {
      console.error('Failed to move team:', err);
    }
  };

  const movePlayerToCategory = async (playerId: number, categoryId: number) => {
    try {
      const response = await fetch(
        `/api/tournaments/${tournamentId}/players/${playerId}/category`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ categoryId, isManual: true }),
        }
      );

      if (response.ok) {
        fetchTournamentDetails();
      }
    } catch (err) {
      console.error('Failed to move player:', err);
    }
  };

  const autoAssignCategories = async () => {
    if (!confirm('Auto-assign unassigned players to categories based on their current average? This only affects players who are not yet assigned to a category.')) {
      return;
    }

    try {
      const response = await fetch(
        `/api/tournaments/${tournamentId}/categories/auto-assign`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (response.ok) {
        const result = await response.json();
        alert(result.data.message);
        fetchTournamentDetails();
      }
    } catch (err) {
      console.error('Failed to auto-assign:', err);
      alert('Failed to auto-assign players');
    }
  };

  // Bulk operations
  const toggleTeamSelection = (teamId: number) => {
    const newSelection = new Set(selectedTeamIds);
    if (newSelection.has(teamId)) {
      newSelection.delete(teamId);
    } else {
      newSelection.add(teamId);
    }
    setSelectedTeamIds(newSelection);
  };

  const toggleAllTeamsInGroup = (teams: any[]) => {
    const teamIds = teams.map(t => t.teamId);
    const allSelected = teamIds.every(id => selectedTeamIds.has(id));
    const newSelection = new Set(selectedTeamIds);

    if (allSelected) {
      teamIds.forEach(id => newSelection.delete(id));
    } else {
      teamIds.forEach(id => newSelection.add(id));
    }
    setSelectedTeamIds(newSelection);
  };

  const bulkMoveTeams = async () => {
    if (selectedTeamIds.size === 0 || !bulkGroupId) return;

    try {
      const response = await fetch('/api/teams/bulk-update-group', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamIds: Array.from(selectedTeamIds),
          groupId: bulkGroupId,
          tournamentId: tournamentId,
        }),
      });

      if (response.ok) {
        setSelectedTeamIds(new Set());
        setBulkGroupId('');
        fetchTournamentDetails();
      }
    } catch (err) {
      console.error('Failed to bulk move teams:', err);
    }
  };

  const togglePlayerSelection = (playerId: number) => {
    const newSelection = new Set(selectedPlayerIds);
    if (newSelection.has(playerId)) {
      newSelection.delete(playerId);
    } else {
      newSelection.add(playerId);
    }
    setSelectedPlayerIds(newSelection);
  };

  const toggleAllPlayersInCategory = (players: any[]) => {
    const playerIds = players.map(p => p.playerId);
    const allSelected = playerIds.every(id => selectedPlayerIds.has(id));
    const newSelection = new Set(selectedPlayerIds);

    if (allSelected) {
      playerIds.forEach(id => newSelection.delete(id));
    } else {
      playerIds.forEach(id => newSelection.add(id));
    }
    setSelectedPlayerIds(newSelection);
  };

  const bulkMovePlayers = async () => {
    if (selectedPlayerIds.size === 0 || !bulkCategoryId) return;

    try {
      const response = await fetch(
        `/api/tournaments/${tournamentId}/players/bulk-update-category`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerIds: Array.from(selectedPlayerIds),
            categoryId: bulkCategoryId,
          }),
        }
      );

      if (response.ok) {
        setSelectedPlayerIds(new Set());
        setBulkCategoryId('');
        fetchTournamentDetails();
      }
    } catch (err) {
      console.error('Failed to bulk move players:', err);
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
          <div className="flex justify-between items-start">
            <div>
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

            <button
              onClick={() => setManagementMode(!managementMode)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                managementMode
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {managementMode ? 'Done Managing' : 'Manage Groups & Categories'}
            </button>
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
          <div className="space-y-6">
            {/* Bulk Actions Toolbar */}
            {managementMode && selectedTeamIds.size > 0 && (
              <div className="bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-600 dark:border-blue-500 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                      {selectedTeamIds.size} team{selectedTeamIds.size !== 1 ? 's' : ''} selected
                    </span>
                    <select
                      value={bulkGroupId}
                      onChange={(e) => setBulkGroupId(e.target.value)}
                      className="px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50"
                    >
                      <option value="">Select group...</option>
                      <option value="">Ungrouped</option>
                      {data?.groups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={bulkMoveTeams}
                      disabled={!bulkGroupId && bulkGroupId !== ''}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Move to Group
                    </button>
                  </div>
                  <button
                    onClick={() => setSelectedTeamIds(new Set())}
                    className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
            )}

            {/* Create New Group */}
            {managementMode && (
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-3">
                  Create New Group
                </h3>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="Group name (e.g., Division A)"
                    className="flex-1 px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50"
                  />
                  <button
                    onClick={createGroup}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Create Group
                  </button>
                </div>
              </div>
            )}

            {/* Grouped Standings */}
            {data.groupedStandings.map((group) => (
              <div
                key={group.groupId || 'ungrouped'}
                className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden"
              >
                <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                        {group.groupName}
                      </h2>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                        {group.teams.length} team{group.teams.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    {managementMode && group.teams.length > 0 && (
                      <button
                        onClick={() => toggleAllTeamsInGroup(group.teams)}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                      >
                        {group.teams.every(t => selectedTeamIds.has(t.teamId)) ? 'Deselect All' : 'Select All'}
                      </button>
                    )}
                  </div>
                </div>
                {group.teams.length === 0 ? (
                  <div className="px-6 py-8 text-center text-zinc-600 dark:text-zinc-400">
                    No teams in this group yet
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                        <tr>
                          {managementMode && (
                            <th className="text-left py-3 px-6 text-zinc-700 dark:text-zinc-300 font-semibold w-12">

                            </th>
                          )}
                          <th className="text-left py-3 px-6 text-zinc-700 dark:text-zinc-300 font-semibold">
                            Rank
                          </th>
                          <th className="text-left py-3 px-6 text-zinc-700 dark:text-zinc-300 font-semibold">
                            Team
                          </th>
                          {managementMode && (
                            <th className="text-left py-3 px-6 text-zinc-700 dark:text-zinc-300 font-semibold">
                              Move To
                            </th>
                          )}
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
                        {group.teams.map((team, index) => (
                          <tr
                            key={team.teamId}
                            className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                          >
                            {managementMode && (
                              <td className="py-4 px-6">
                                <input
                                  type="checkbox"
                                  checked={selectedTeamIds.has(team.teamId)}
                                  onChange={() => toggleTeamSelection(team.teamId)}
                                  className="w-4 h-4 text-blue-600 border-zinc-300 rounded focus:ring-blue-500"
                                />
                              </td>
                            )}
                            <td className="py-4 px-6">
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
                            </td>
                            <td className="py-4 px-6 text-zinc-900 dark:text-zinc-50 font-medium">
                              {team.teamName}
                            </td>
                            {managementMode && (
                              <td className="py-4 px-6">
                                <select
                                  value={team.groupId || ''}
                                  onChange={(e) =>
                                    moveTeamToGroup(
                                      team.teamId,
                                      e.target.value ? parseInt(e.target.value) : null
                                    )
                                  }
                                  className="px-2 py-1 text-sm border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50"
                                >
                                  <option value="">Ungrouped</option>
                                  {data.groups.map((g) => (
                                    <option key={g.id} value={g.id}>
                                      {g.name}
                                    </option>
                                  ))}
                                </select>
                              </td>
                            )}
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
            ))}
          </div>
        )}

        {/* Player Standings */}
        {activeTab === 'players' && (
          <div className="space-y-6">
            {/* Bulk Actions Toolbar */}
            {managementMode && selectedPlayerIds.size > 0 && (
              <div className="bg-green-100 dark:bg-green-900/30 border-2 border-green-600 dark:border-green-500 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                      {selectedPlayerIds.size} player{selectedPlayerIds.size !== 1 ? 's' : ''} selected
                    </span>
                    <select
                      value={bulkCategoryId}
                      onChange={(e) => setBulkCategoryId(e.target.value)}
                      className="px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50"
                    >
                      <option value="">Select category...</option>
                      {data?.categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={bulkMovePlayers}
                      disabled={!bulkCategoryId}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Move to Category
                    </button>
                  </div>
                  <button
                    onClick={() => setSelectedPlayerIds(new Set())}
                    className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
            )}

            {/* Create New Category */}
            {managementMode && (
              <div className="space-y-3">
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-3">
                    Create New Category
                  </h3>
                  <div className="flex gap-3 items-end">
                    <div className="flex-1">
                      <label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1">
                        Category Name
                      </label>
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="e.g., Pro, Advanced, Intermediate"
                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1">
                        Min Avg (optional)
                      </label>
                      <input
                        type="number"
                        value={newCategoryMin}
                        onChange={(e) => setNewCategoryMin(e.target.value)}
                        placeholder="150"
                        className="w-24 px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1">
                        Max Avg (optional)
                      </label>
                      <input
                        type="number"
                        value={newCategoryMax}
                        onChange={(e) => setNewCategoryMax(e.target.value)}
                        placeholder="200"
                        className="w-24 px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50"
                      />
                    </div>
                    <button
                      onClick={createCategory}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Create Category
                    </button>
                  </div>
                </div>
                {data.categories.length > 0 && (
                  <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                          Auto-Assign Players to Categories
                        </h3>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                          Automatically assign unassigned players to categories based on their current average.
                          Once assigned, players stay in their category for the entire tournament.
                        </p>
                      </div>
                      <button
                        onClick={autoAssignCategories}
                        className="ml-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
                      >
                        Auto-Assign
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Categorized Standings */}
            {data.categorizedStandings.map((category) => (
              <div
                key={category.categoryId || 'uncategorized'}
                className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden"
              >
                <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                        {category.categoryName}
                      </h2>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                        {category.minAverage || category.maxAverage ? (
                          <>
                            Average range:{' '}
                            {category.minAverage && `${category.minAverage}+`}
                            {category.minAverage && category.maxAverage && ' to '}
                            {category.maxAverage && `${category.maxAverage}`} •{' '}
                          </>
                        ) : null}
                        {category.players.length} player{category.players.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    {managementMode && category.players.length > 0 && (
                      <button
                        onClick={() => toggleAllPlayersInCategory(category.players)}
                        className="text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
                      >
                        {category.players.every(p => selectedPlayerIds.has(p.playerId)) ? 'Deselect All' : 'Select All'}
                      </button>
                    )}
                  </div>
                </div>
                {category.players.length === 0 ? (
                  <div className="px-6 py-8 text-center text-zinc-600 dark:text-zinc-400">
                    No players in this category yet
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                        <tr>
                          {managementMode && (
                            <th className="text-left py-3 px-6 text-zinc-700 dark:text-zinc-300 font-semibold w-12">

                            </th>
                          )}
                          <th className="text-left py-3 px-6 text-zinc-700 dark:text-zinc-300 font-semibold">
                            Rank
                          </th>
                          <th className="text-left py-3 px-6 text-zinc-700 dark:text-zinc-300 font-semibold">
                            Player
                          </th>
                          <th className="text-left py-3 px-6 text-zinc-700 dark:text-zinc-300 font-semibold">
                            Team
                          </th>
                          {managementMode && (
                            <th className="text-left py-3 px-6 text-zinc-700 dark:text-zinc-300 font-semibold">
                              Move To
                            </th>
                          )}
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
                        {category.players.map((player, index) => (
                          <tr
                            key={player.playerId}
                            className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                          >
                            {managementMode && (
                              <td className="py-4 px-6">
                                <input
                                  type="checkbox"
                                  checked={selectedPlayerIds.has(player.playerId)}
                                  onChange={() => togglePlayerSelection(player.playerId)}
                                  className="w-4 h-4 text-green-600 border-zinc-300 rounded focus:ring-green-500"
                                />
                              </td>
                            )}
                            <td className="py-4 px-6">
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
                            </td>
                            <td className="py-4 px-6 text-zinc-900 dark:text-zinc-50 font-medium">
                              {player.playerName}
                              {player.isManualCategory && (
                                <span className="ml-2 text-xs text-orange-600 dark:text-orange-400">
                                  (manual)
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-6 text-zinc-600 dark:text-zinc-400">
                              {player.teamName}
                            </td>
                            {managementMode && (
                              <td className="py-4 px-6">
                                <select
                                  value={player.categoryId || ''}
                                  onChange={(e) =>
                                    movePlayerToCategory(player.playerId, parseInt(e.target.value))
                                  }
                                  className="px-2 py-1 text-sm border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50"
                                >
                                  <option value="">Select category...</option>
                                  {data.categories.map((c) => (
                                    <option key={c.id} value={c.id}>
                                      {c.name}
                                    </option>
                                  ))}
                                </select>
                              </td>
                            )}
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
