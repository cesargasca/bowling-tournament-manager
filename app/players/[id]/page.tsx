'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface Player {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  initialHandicap: number;
  createdAt: string;
}

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
  const searchParams = useSearchParams();
  const playerId = params.id as string;
  const tournamentIdParam = searchParams.get('tournamentId');

  const [player, setPlayer] = useState<Player | null>(null);
  const [data, setData] = useState<PlayerHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTournament, setSelectedTournament] = useState<string>(tournamentIdParam || 'all');

  // Edit mode states
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    initialHandicap: 0,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchPlayerDetails();
    fetchPlayerHistory();
  }, [playerId]);

  useEffect(() => {
    if (selectedTournament !== 'all') {
      fetchPlayerHistory();
    }
  }, [selectedTournament]);

  const fetchPlayerDetails = async () => {
    try {
      const response = await fetch(`/api/players/${playerId}`);
      const result = await response.json();

      if (result.success) {
        setPlayer(result.data);
        setFormData({
          name: result.data.name,
          email: result.data.email || '',
          phone: result.data.phone || '',
          initialHandicap: result.data.initialHandicap,
        });
      } else {
        setError(result.error || 'Failed to load player');
      }
    } catch (err) {
      setError('Network error - failed to fetch player');
      console.error(err);
    }
  };

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

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`/api/players/${playerId}`, {
        method: 'PUT',
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
        setPlayer(result.data);
        setIsEditing(false);
        setFormErrors({});
      } else {
        setError(result.error || 'Failed to update player');
      }
    } catch (err) {
      console.error('Failed to update player:', err);
      setError('Network error - failed to update player');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (player) {
      setFormData({
        name: player.name,
        email: player.email || '',
        phone: player.phone || '',
        initialHandicap: player.initialHandicap,
      });
    }
    setFormErrors({});
    setIsEditing(false);
  };

  if (loading && !player) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-zinc-600 dark:text-zinc-400">Loading player...</p>
        </div>
      </div>
    );
  }

  if (error && !player) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 dark:text-red-400 text-lg font-semibold mb-4">
            {error}
          </div>
          <button
            onClick={() => router.push('/players')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Players
          </button>
        </div>
      </div>
    );
  }

  // Get unique tournaments from sessions
  const tournaments = data?.sessions ? Array.from(
    new Set(data.sessions.map((s) => JSON.stringify({ id: s.tournament.id, name: s.tournament.name })))
  ).map((t) => JSON.parse(t)) : [];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => router.push('/players')}
            className="mb-4 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-2"
          >
            <span>←</span> Back to Players
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                {player?.name || 'Loading...'}
              </h1>
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">Player Information & Statistics</p>
            </div>
            {!isEditing && player && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Edit Player
              </button>
            )}
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

        {/* Player Information Card */}
        {player && (
          <div className="mb-8 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Player Information</h2>
              {isEditing && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleCancel}
                    disabled={saving}
                    className="px-4 py-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving || !formData.name.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>

            {isEditing ? (
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
                    className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 ${
                      formErrors.name ? 'border-red-500' : 'border-zinc-300 dark:border-zinc-700'
                    }`}
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
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Full Name</p>
                  <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{player.name}</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Email</p>
                  <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                    {player.email || <span className="text-zinc-400 dark:text-zinc-600 italic">Not provided</span>}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Phone</p>
                  <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                    {player.phone || <span className="text-zinc-400 dark:text-zinc-600 italic">Not provided</span>}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Initial Handicap</p>
                  <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">{player.initialHandicap}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Summary Stats */}
        {data && (
          <>
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

            {/* Performance Charts */}
            {data.sessions.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Performance Trend Over Time */}
                <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-4">
                    Performance Trend
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart
                      data={data.sessions
                        .slice()
                        .reverse()
                        .map((s, idx) => ({
                          session: `S${idx + 1}`,
                          date: new Date(s.sessionDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          }),
                          'Raw Score': s.scores.rawTotal,
                          'With Handicap': s.scores.totalWithHandicap,
                          Average: data.summary.average * 3, // Average per session (3 games)
                        }))}
                      margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-700" />
                      <XAxis
                        dataKey="date"
                        className="text-xs fill-zinc-600 dark:fill-zinc-400"
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis className="text-xs fill-zinc-600 dark:fill-zinc-400" tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgb(24 24 27)',
                          border: '1px solid rgb(63 63 70)',
                          borderRadius: '0.5rem',
                          color: 'rgb(244 244 245)',
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="Raw Score"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ fill: '#3b82f6', r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="With Handicap"
                        stroke="#22c55e"
                        strokeWidth={2}
                        dot={{ fill: '#22c55e', r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="Average"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Individual Game Scores */}
                <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-4">
                    Game Score Distribution
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={data.sessions
                        .slice()
                        .reverse()
                        .slice(-10) // Last 10 sessions
                        .map((s, idx) => ({
                          session: `S${idx + 1}`,
                          date: new Date(s.sessionDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          }),
                          'Line 1': s.scores.line1,
                          'Line 2': s.scores.line2,
                          'Line 3': s.scores.line3,
                        }))}
                      margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-700" />
                      <XAxis
                        dataKey="date"
                        className="text-xs fill-zinc-600 dark:fill-zinc-400"
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis className="text-xs fill-zinc-600 dark:fill-zinc-400" tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgb(24 24 27)',
                          border: '1px solid rgb(63 63 70)',
                          borderRadius: '0.5rem',
                          color: 'rgb(244 244 245)',
                        }}
                      />
                      <Legend />
                      <Bar dataKey="Line 1" fill="#3b82f6" />
                      <Bar dataKey="Line 2" fill="#8b5cf6" />
                      <Bar dataKey="Line 3" fill="#ec4899" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

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
          </>
        )}
      </div>
    </div>
  );
}
