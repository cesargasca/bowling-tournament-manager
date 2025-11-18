'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Player {
  id: number;
  name: string;
  createdAt: string;
}

export default function PlayersPage() {
  const router = useRouter();

  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/players');
      const result = await response.json();

      if (result.success) {
        setPlayers(result.data);
      } else {
        setError(result.error || 'Failed to load players');
      }
    } catch (err) {
      setError('Network error - failed to fetch players');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const createPlayer = async () => {
    if (!newPlayerName.trim()) {
      alert('Please enter a player name');
      return;
    }

    try {
      setCreating(true);
      const response = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newPlayerName }),
      });

      const result = await response.json();

      if (result.success) {
        setNewPlayerName('');
        setShowCreateForm(false);
        fetchPlayers();
      } else {
        alert(result.error || 'Failed to create player');
      }
    } catch (err) {
      console.error('Failed to create player:', err);
      alert('Network error - failed to create player');
    } finally {
      setCreating(false);
    }
  };

  const filteredPlayers = players.filter((player) =>
    player.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-zinc-600 dark:text-zinc-400">Loading players...</p>
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
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">Players</h1>
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                Manage all players in the system
              </p>
            </div>

            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                showCreateForm
                  ? 'bg-zinc-600 text-white hover:bg-zinc-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {showCreateForm ? 'Cancel' : 'Create Player'}
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

        {/* Create Player Form */}
        {showCreateForm && (
          <div className="mb-6 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-6">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-4">Create New Player</h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                placeholder="Player name (e.g., John Smith)"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') createPlayer();
                }}
                className="flex-1 px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50"
                autoFocus
              />
              <button
                onClick={createPlayer}
                disabled={creating || !newPlayerName.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Creating...' : 'Create Player'}
              </button>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="mb-6">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search players..."
            className="w-full px-4 py-3 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50"
          />
        </div>

        {/* Players List */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">All Players</h2>
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                {filteredPlayers.length} player{filteredPlayers.length !== 1 ? 's' : ''}
                {searchQuery && ` (filtered from ${players.length})`}
              </span>
            </div>
          </div>

          {filteredPlayers.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-zinc-600 dark:text-zinc-400 text-lg">
                {searchQuery ? 'No players found matching your search' : 'No players yet'}
              </p>
              {!searchQuery && !showCreateForm && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create First Player
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredPlayers.map((player) => (
                <div
                  key={player.id}
                  className="px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <span className="text-blue-600 dark:text-blue-400 font-semibold">
                        {player.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <button
                        onClick={() => router.push(`/players/${player.id}`)}
                        className="text-zinc-900 dark:text-zinc-50 font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left"
                      >
                        {player.name}
                      </button>
                      <p className="text-sm text-zinc-500 dark:text-zinc-500">
                        Added {new Date(player.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push(`/players/${player.id}`)}
                    className="px-3 py-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                  >
                    View Details →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
