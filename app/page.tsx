'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface DashboardData {
  overview: {
    totalTournaments: number;
    totalPlayers: number;
    totalTeams: number;
    totalSessions: number;
    totalBowlingAlleys: number;
  };
  tournaments: Array<{
    id: number;
    name: string;
    bowlingAlley: string;
    teamsCount: number;
    sessionsCount: number;
    playersCount: number;
    createdAt: string;
  }>;
  payments: {
    totalEntries: number;
    paid: number;
    unpaid: number;
    paymentRate: number;
    teamsWithIssues: Array<{
      id: number;
      name: string;
      unpaidPlayers: string[];
      unpaidCount: number;
    }>;
  };
  attendance: {
    totalEntries: number;
    withAssistance: number;
    assistanceRate: number;
  };
  recentSessions: Array<{
    id: number;
    tournament: string;
    bowlingAlley: string;
    sessionDate: string;
    matchupsCount: number;
    createdAt: string;
  }>;
  topPlayers: Array<{
    id: number;
    name: string;
    gamesPlayed: number;
    averagePins: number;
    paidSessions: number;
    unpaidSessions: number;
    paymentRate: number;
  }>;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboard');
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to load dashboard data');
      }
    } catch (err) {
      setError('Network error - failed to fetch dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-zinc-600 dark:text-zinc-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 dark:text-red-400 text-lg font-semibold">
            {error || 'Failed to load dashboard'}
          </div>
          <button
            onClick={fetchDashboardData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            Bowling Tournament Admin Dashboard
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Overview of all tournaments, players, and statistics
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Tournaments"
            value={data.overview.totalTournaments}
            icon="🏆"
            color="bg-blue-500"
            onClick={() => router.push('/tournaments')}
          />
          <StatCard
            title="Players"
            value={data.overview.totalPlayers}
            icon="👥"
            color="bg-green-500"
            onClick={() => router.push('/players')}
          />
          <StatCard
            title="Bowling Alleys"
            value={data.overview.totalBowlingAlleys}
            icon="🎳"
            color="bg-purple-500"
            onClick={() => router.push('/bowling')}
          />
        </div>

        {/* Payment & Attendance Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
              Payment Statistics
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-zinc-600 dark:text-zinc-400">Total Entries</span>
                <span className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                  {data.payments.totalEntries}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-600 dark:text-zinc-400">Paid</span>
                <span className="text-xl font-semibold text-green-600 dark:text-green-400">
                  {data.payments.paid}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-600 dark:text-zinc-400">Unpaid</span>
                <span className="text-xl font-semibold text-red-600 dark:text-red-400">
                  {data.payments.unpaid}
                </span>
              </div>
              <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                    Payment Rate
                  </span>
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {data.payments.paymentRate}%
                  </span>
                </div>
                <div className="mt-2 w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${data.payments.paymentRate}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
              Attendance Statistics
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-zinc-600 dark:text-zinc-400">Total Entries</span>
                <span className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                  {data.attendance.totalEntries}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-600 dark:text-zinc-400">With Assistance</span>
                <span className="text-xl font-semibold text-green-600 dark:text-green-400">
                  {data.attendance.withAssistance}
                </span>
              </div>
              <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                    Assistance Rate
                  </span>
                  <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {data.attendance.assistanceRate}%
                  </span>
                </div>
                <div className="mt-2 w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-3">
                  <div
                    className="bg-green-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${data.attendance.assistanceRate}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Two Column Layout for Top Players and Payment Issues */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Players */}
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
              Top Players
            </h2>
            {data.topPlayers.length === 0 ? (
              <p className="text-zinc-600 dark:text-zinc-400">No player data available</p>
            ) : (
              <div className="space-y-3">
                {data.topPlayers.slice(0, 5).map((player, index) => (
                  <button
                    key={player.id}
                    onClick={() => router.push(`/players/${player.id}`)}
                    className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors w-full text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-semibold text-zinc-900 dark:text-zinc-50">
                          {player.name}
                        </div>
                        <div className="text-sm text-zinc-600 dark:text-zinc-400">
                          {player.gamesPlayed} games • Avg: {player.averagePins}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        {player.paymentRate}%
                      </div>
                      <div className="text-xs text-zinc-600 dark:text-zinc-400">
                        paid
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Teams with Payment Issues */}
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
              Payment Issues
            </h2>
            {data.payments.teamsWithIssues.length === 0 ? (
              <p className="text-green-600 dark:text-green-400">
                All teams are up to date with payments!
              </p>
            ) : (
              <div className="space-y-3">
                {data.payments.teamsWithIssues.slice(0, 5).map((team) => (
                  <div
                    key={team.id}
                    className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-50">
                        {team.name}
                      </div>
                      <div className="text-sm font-medium text-red-600 dark:text-red-400">
                        {team.unpaidCount} unpaid
                      </div>
                    </div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">
                      {team.unpaidPlayers.slice(0, 3).join(', ')}
                      {team.unpaidPlayers.length > 3 && ` +${team.unpaidPlayers.length - 3} more`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  icon: string;
  color: string;
  onClick?: () => void;
}

function StatCard({ title, value, icon, color, onClick }: StatCardProps) {
  const content = (
    <>
      <div>
        <p className="text-zinc-600 dark:text-zinc-400 text-sm font-medium">{title}</p>
        <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mt-2">{value}</p>
      </div>
      <div className={`${color} w-12 h-12 rounded-lg flex items-center justify-center text-2xl`}>
        {icon}
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 hover:border-blue-500 dark:hover:border-blue-500 transition-colors w-full"
      >
        <div className="flex items-center justify-between">
          {content}
        </div>
      </button>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
      <div className="flex items-center justify-between">
        {content}
      </div>
    </div>
  );
}
