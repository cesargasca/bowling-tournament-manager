'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Player {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  initialHandicap: number;
  createdAt: string;
  _count?: {
    teamPlayers: number;
  };
}

export default function PlayersPage() {
  const router = useRouter();

  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    initialHandicap: 0,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

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

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email address';
    }

    if (formData.initialHandicap < 0 || formData.initialHandicap > 100) {
      errors.initialHandicap = 'Handicap must be between 0 and 100';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setCreating(true);
      const response = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email || null,
          phone: formData.phone || null,
          initialHandicap: formData.initialHandicap,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setFormData({ name: '', email: '', phone: '', initialHandicap: 0 });
        setFormErrors({});
        setShowCreateForm(false);
        fetchPlayers();
      } else {
        setError(result.error || 'Failed to create player');
      }
    } catch (err) {
      console.error('Failed to create player:', err);
      setError('Network error - failed to create player');
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', phone: '', initialHandicap: 0 });
    setFormErrors({});
    setShowCreateForm(false);
  };

  const filteredPlayers = players.filter((player) =>
    player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    player.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    player.phone?.includes(searchQuery)
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
          <div className="mb-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-6">Create New Player</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., John Smith"
                    className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 ${
                      formErrors.name ? 'border-red-500' : 'border-zinc-300 dark:border-zinc-700'
                    }`}
                    autoFocus
                  />
                  {formErrors.name && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.name}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g., john@example.com"
                    className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 ${
                      formErrors.email ? 'border-red-500' : 'border-zinc-300 dark:border-zinc-700'
                    }`}
                  />
                  {formErrors.email && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.email}</p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g., 555-1234"
                    className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 ${
                      formErrors.phone ? 'border-red-500' : 'border-zinc-300 dark:border-zinc-700'
                    }`}
                  />
                  {formErrors.phone && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.phone}</p>
                  )}
                </div>

                {/* Initial Handicap */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Initial Handicap
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, initialHandicap: Math.max(0, formData.initialHandicap - 1) })}
                      className="w-10 h-10 flex items-center justify-center bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.initialHandicap}
                      onChange={(e) => setFormData({ ...formData, initialHandicap: parseInt(e.target.value) || 0 })}
                      className={`flex-1 px-3 py-2 border rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 text-center text-lg font-semibold ${
                        formErrors.initialHandicap ? 'border-red-500' : 'border-zinc-300 dark:border-zinc-700'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, initialHandicap: Math.min(100, formData.initialHandicap + 1) })}
                      className="w-10 h-10 flex items-center justify-center bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
                    >
                      +
                    </button>
                  </div>
                  {formErrors.initialHandicap && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.initialHandicap}</p>
                  )}
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                    Starting handicap for this player (0-100)
                  </p>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={creating}
                  className="px-6 py-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !formData.name.trim()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? 'Creating...' : 'Create Player'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, or phone..."
              className="w-full px-4 py-3 pl-10 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50"
            />
            <svg
              className="absolute left-3 top-3.5 h-5 w-5 text-zinc-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        {/* Players Count */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
            All Players
          </h2>
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            {filteredPlayers.length} player{filteredPlayers.length !== 1 ? 's' : ''}
            {searchQuery && ` (filtered from ${players.length})`}
          </span>
        </div>

        {/* Players Grid */}
        {filteredPlayers.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-12 text-center">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPlayers.map((player) => (
              <div
                key={player.id}
                onClick={() => router.push(`/players/${player.id}`)}
                className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-5 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer"
              >
                {/* Player Header */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-lg">
                      {player.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 truncate">
                      {player.name}
                    </h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-500">
                      Added {new Date(player.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Player Details */}
                <div className="space-y-2">
                  {player.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span className="text-zinc-600 dark:text-zinc-400 truncate">{player.email}</span>
                    </div>
                  )}
                  {player.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span className="text-zinc-600 dark:text-zinc-400">{player.phone}</span>
                    </div>
                  )}
                  {!player.email && !player.phone && (
                    <p className="text-sm text-zinc-400 dark:text-zinc-600 italic">
                      No contact info
                    </p>
                  )}
                </div>

                {/* Player Stats */}
                <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {player.initialHandicap}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-500">Handicap</p>
                  </div>
                  {player._count && (
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {player._count.teamPlayers}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-500">Teams</p>
                    </div>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/players/${player.id}`);
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
