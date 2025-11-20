'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface BowlingAlley {
  id: number;
  name: string;
}

interface CSVRow {
  teamName: string;
  group?: string;
  playerName: string;
  email?: string;
  phone?: string;
  handicap?: string;
  category?: string;
  substitute?: string;
}

export default function CreateTournamentPage() {
  const router = useRouter();

  const [bowlingAlleys, setBowlingAlleys] = useState<BowlingAlley[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [tournamentName, setTournamentName] = useState('');
  const [selectedBowlingId, setSelectedBowlingId] = useState('');
  const [teamSize, setTeamSize] = useState('4');
  const [substituteCount, setSubstituteCount] = useState('0');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [csvPreview, setCsvPreview] = useState<string>('');
  const [csvError, setCsvError] = useState<string | null>(null);

  useEffect(() => {
    fetchBowlingAlleys();
  }, []);

  const fetchBowlingAlleys = async () => {
    try {
      const response = await fetch('/api/bowling-alleys');
      const result = await response.json();

      if (result.success) {
        setBowlingAlleys(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch bowling alleys:', err);
    }
  };

  const parseCSV = (text: string): CSVRow[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV file must have at least a header row and one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const rows: CSVRow[] = [];

    // Validate headers
    const requiredHeaders = ['team name', 'player name'];
    const optionalHeaders = ['group', 'email', 'phone', 'handicap', 'category', 'substitute'];
    const allHeaders = [...requiredHeaders, ...optionalHeaders];

    for (const header of requiredHeaders) {
      if (!headers.includes(header)) {
        throw new Error(`Missing required column: "${header}"`);
      }
    }

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(',').map(v => v.trim());
      const row: any = {};

      headers.forEach((header, index) => {
        if (allHeaders.includes(header)) {
          row[header] = values[index] || '';
        }
      });

      rows.push({
        teamName: row['team name'] || '',
        group: row['group'] || '',
        playerName: row['player name'] || '',
        email: row['email'] || '',
        phone: row['phone'] || '',
        handicap: row['handicap'] || '',
        category: row['category'] || '',
        substitute: row['substitute'] || '',
      });
    }

    return rows.filter(row => row.teamName && row.playerName);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    setCsvError(null);

    try {
      const text = await file.text();
      const parsed = parseCSV(text);
      setCsvData(parsed);

      // Generate preview
      const isSubstitute = (value?: string): boolean => {
        if (!value) return false;
        const normalized = value.trim().toLowerCase();
        return normalized === 's' || normalized === 'substitute' || normalized === 'yes' || normalized === 'true' || normalized === '1';
      };

      const teamMap = new Map<string, { group?: string; regularCount: number; substituteCount: number }>();
      parsed.forEach(row => {
        if (!teamMap.has(row.teamName)) {
          teamMap.set(row.teamName, { group: row.group, regularCount: 0, substituteCount: 0 });
        }
        const entry = teamMap.get(row.teamName)!;
        if (isSubstitute(row.substitute)) {
          entry.substituteCount++;
        } else {
          entry.regularCount++;
        }
      });

      const preview = Array.from(teamMap.entries())
        .map(([team, data]) => {
          const groupText = data.group ? ` (Group: ${data.group})` : '';
          const subsText = data.substituteCount > 0 ? ` + ${data.substituteCount} substitute${data.substituteCount > 1 ? 's' : ''}` : '';
          return `${team}${groupText}: ${data.regularCount} player${data.regularCount > 1 ? 's' : ''}${subsText}`;
        })
        .join('\n');

      setCsvPreview(preview);
    } catch (err: any) {
      setCsvError(err.message || 'Failed to parse CSV file');
      setCsvFile(null);
      setCsvData([]);
      setCsvPreview('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tournamentName.trim()) {
      setError('Please enter a tournament name');
      return;
    }

    if (!selectedBowlingId) {
      setError('Please select a bowling alley');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // If CSV data is provided, import as part of tournament creation
      if (csvData.length > 0) {
        const response = await fetch('/api/tournaments/import-csv', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tournamentName,
            bowlingId: parseInt(selectedBowlingId),
            teamSize: parseInt(teamSize),
            substituteCount: parseInt(substituteCount),
            csvData,
          }),
        });

        const result = await response.json();

        if (!result.success) {
          setError(result.error || 'Failed to create tournament with CSV import');
          return;
        }

        // Success - redirect to tournament
        router.push(`/tournaments/${result.data.tournamentId}`);
      } else {
        // Create tournament without CSV import
        const response = await fetch('/api/tournaments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: tournamentName,
            bowlingId: parseInt(selectedBowlingId),
            teamSize: parseInt(teamSize),
            substituteCount: parseInt(substituteCount),
          }),
        });

        const result = await response.json();

        if (!result.success) {
          setError(result.error || 'Failed to create tournament');
          return;
        }

        // Success - redirect to tournament
        router.push(`/tournaments/${result.data.id}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create tournament');
    } finally {
      setLoading(false);
    }
  };

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
            Create Tournament
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Set up a new bowling tournament and import teams from CSV
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Tournament Details */}
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-6">
              Tournament Details
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Tournament Name *
                </label>
                <input
                  type="text"
                  value={tournamentName}
                  onChange={(e) => setTournamentName(e.target.value)}
                  placeholder="e.g., Fall Championship 2024"
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Bowling Alley *
                </label>
                <select
                  value={selectedBowlingId}
                  onChange={(e) => setSelectedBowlingId(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50"
                  required
                >
                  <option value="">Select a bowling alley...</option>
                  {bowlingAlleys.map((alley) => (
                    <option key={alley.id} value={alley.id}>
                      {alley.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Regular Players per Team *
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setTeamSize(Math.max(1, parseInt(teamSize) - 1).toString())}
                      className="w-10 h-10 flex items-center justify-center bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={teamSize}
                      onChange={(e) => setTeamSize(e.target.value)}
                      className="flex-1 px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 text-center text-lg font-semibold"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setTeamSize(Math.min(10, parseInt(teamSize) + 1).toString())}
                      className="w-10 h-10 flex items-center justify-center bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
                    >
                      +
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
                    Expected number of regular players per team. Teams can have different amounts - warnings will be shown if they don't match.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Substitutes per Team
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setSubstituteCount(Math.max(0, parseInt(substituteCount) - 1).toString())}
                      className="w-10 h-10 flex items-center justify-center bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={substituteCount}
                      onChange={(e) => setSubstituteCount(e.target.value)}
                      className="flex-1 px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 text-center text-lg font-semibold"
                    />
                    <button
                      type="button"
                      onClick={() => setSubstituteCount(Math.min(10, parseInt(substituteCount) + 1).toString())}
                      className="w-10 h-10 flex items-center justify-center bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
                    >
                      +
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
                    Expected number of substitutes. Mark substitutes with "S", "Substitute", or "Yes" in the CSV. Teams can have more - warnings will be shown.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* CSV Import (Optional) */}
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
              Import Teams and Players (Optional)
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
              Upload a CSV file to create teams and players all at once, or skip this step and add them manually later.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  CSV File
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50"
                />
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
                  Required columns: Team Name, Player Name<br />
                  Optional columns: Group, Email, Phone, Handicap, Category, Substitute
                </p>
              </div>

              {csvError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-800 dark:text-red-200">{csvError}</p>
                </div>
              )}

              {csvPreview && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 mb-2">
                    CSV Preview:
                  </p>
                  <pre className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">
                    {csvPreview}
                  </pre>
                  <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
                    Total players: {csvData.length}
                  </p>
                </div>
              )}

              <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 mb-2">
                  Example CSV format:
                </p>
                <pre className="text-xs text-zinc-600 dark:text-zinc-400 overflow-x-auto">
{`Team Name,Group,Player Name,Email,Phone,Handicap,Category,Substitute
Team 1,Group A,John Doe,john@example.com,555-1234,25,A League,
Team 1,Group A,Jane Smith,,,30,A League,
Team 1,Group A,Bob Wilson,bob@example.com,,15,B League,
Team 1,Group A,Alice Brown,,,22,A League,
Team 1,Group A,Steve Backup,,,20,A League,S
Team 2,Group A,Mike Davis,mike@example.com,555-5678,18,B League,
Team 2,Group A,Sarah Miller,sarah@example.com,,35,A League,
Team 2,Group A,Tom Garcia,,,20,B League,
Team 2,Group A,Linda Martinez,,,28,A League,
Team 2,Group A,Joe Reserve,,,25,B League,Substitute
Team 3,Group B,Chris Johnson,,,19,B League,
Team 3,Group B,Pat Lee,pat@example.com,555-9012,26,A League,
Team 3,Group B,Sam Brown,,,22,A League,
Team 3,Group B,Alex Green,,,24,B League,
Team 3,Group B,Max Extra,,,18,B League,Yes`}
                </pre>
                <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-500">
                  <strong>Notes:</strong><br />
                  • All players must belong to a team (no standalone players allowed)<br />
                  • Group: Optional, used to organize teams (e.g., "Group A", "Group B")<br />
                  • Category: Optional, used to classify players (e.g., "A League", "B League")<br />
                  • Substitute: Mark with "S", "Substitute", "Yes", "1", or "true" (case-insensitive). Leave blank for regular players<br />
                  • Groups and categories will be created automatically if they don't exist
                </p>
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={() => router.push('/')}
              disabled={loading}
              className="px-6 py-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !tournamentName.trim() || !selectedBowlingId}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Tournament...' : (csvData.length > 0 ? 'Create Tournament & Import CSV' : 'Create Tournament')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
