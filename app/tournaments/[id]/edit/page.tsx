'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface Tournament {
  id: number;
  name: string;
  teamSize: number;
  bowlingId: number;
  bowling: {
    id: number;
    name: string;
  };
  _count: {
    teams: number;
    sessions: number;
  };
}

interface BowlingAlley {
  id: number;
  name: string;
}

export default function EditTournamentPage() {
  const params = useParams();
  const router = useRouter();
  const tournamentId = params.id as string;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [bowlingAlleys, setBowlingAlleys] = useState<BowlingAlley[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [tournamentName, setTournamentName] = useState('');
  const [selectedBowlingId, setSelectedBowlingId] = useState('');
  const [teamSize, setTeamSize] = useState('4');

  useEffect(() => {
    fetchTournament();
    fetchBowlingAlleys();
  }, [tournamentId]);

  const fetchTournament = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tournaments/${tournamentId}`);
      const result = await response.json();

      if (result.success) {
        setTournament(result.data);
        setTournamentName(result.data.name);
        setSelectedBowlingId(result.data.bowlingId.toString());
        setTeamSize(result.data.teamSize.toString());
      } else {
        setError(result.error || 'Failed to load tournament');
      }
    } catch (err) {
      setError('Network error - failed to fetch tournament');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBowlingAlleys = async () => {
    try {
      const response = await fetch('/api/bowling');
      const result = await response.json();

      if (result.success) {
        setBowlingAlleys(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch bowling alleys:', err);
    }
  };

  const handleSave = async () => {
    if (!tournamentName.trim()) {
      alert('Please enter a tournament name');
      return;
    }

    if (!selectedBowlingId) {
      alert('Please select a bowling alley');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const response = await fetch(`/api/tournaments/${tournamentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: tournamentName,
          bowlingId: parseInt(selectedBowlingId),
          // Team size is locked and cannot be changed after creation
        }),
      });

      const result = await response.json();

      if (result.success) {
        router.push(`/tournaments/${tournamentId}`);
      } else {
        setError(result.error || 'Failed to update tournament');
      }
    } catch (err) {
      setError('Network error - failed to update tournament');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!tournament) return;

    if (tournament._count.teams > 0 || tournament._count.sessions > 0) {
      alert(
        `Cannot delete tournament with existing teams or sessions.\n\nThis tournament has:\n- ${tournament._count.teams} team(s)\n- ${tournament._count.sessions} session(s)\n\nPlease delete teams and sessions first.`
      );
      return;
    }

    if (
      !confirm(
        `Are you sure you want to delete "${tournament.name}"?\n\nThis action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        router.push('/tournaments');
      } else {
        alert(result.error || 'Failed to delete tournament');
      }
    } catch (err) {
      console.error('Failed to delete tournament:', err);
      alert('Network error - failed to delete tournament');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-zinc-600 dark:text-zinc-400">Loading tournament...</p>
        </div>
      </div>
    );
  }

  if (error && !tournament) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 dark:text-red-400 text-lg font-semibold mb-4">{error}</div>
          <button
            onClick={() => router.push('/tournaments')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Tournaments
          </button>
        </div>
      </div>
    );
  }

  if (!tournament) return null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => router.push(`/tournaments/${tournamentId}`)}
            className="mb-4 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-2"
          >
            <span>←</span> Back to Tournament
          </button>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">Edit Tournament</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Update tournament information
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Edit Form */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Tournament Name
              </label>
              <input
                type="text"
                value={tournamentName}
                onChange={(e) => setTournamentName(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Bowling Alley
              </label>
              <select
                value={selectedBowlingId}
                onChange={(e) => setSelectedBowlingId(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50"
              >
                {bowlingAlleys.map((alley) => (
                  <option key={alley.id} value={alley.id}>
                    {alley.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Team Size (players per team)
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={teamSize}
                disabled
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-500 cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                Team size cannot be changed after tournament creation. Each team requires exactly {teamSize} player{teamSize !== '1' ? 's' : ''}.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <button
                onClick={handleDelete}
                disabled={saving}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete Tournament
              </button>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push(`/tournaments/${tournamentId}`)}
                  disabled={saving}
                  className="px-6 py-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !tournamentName.trim() || !selectedBowlingId}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
