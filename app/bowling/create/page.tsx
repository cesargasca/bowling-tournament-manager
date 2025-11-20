'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CreateBowlingPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    startLane: 1,
    endLane: 10,
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    // Validation
    if (!formData.name.trim()) {
      setError('Alley name is required');
      setSaving(false);
      return;
    }

    if (formData.startLane <= 0 || formData.endLane <= 0) {
      setError('Lane numbers must be positive');
      setSaving(false);
      return;
    }

    if (formData.startLane >= formData.endLane) {
      setError('End lane must be greater than start lane');
      setSaving(false);
      return;
    }

    if ((formData.endLane - formData.startLane + 1) % 2 !== 0) {
      setError('Lane range must have an even number of lanes for proper pairing');
      setSaving(false);
      return;
    }

    try {
      const response = await fetch('/api/bowling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create bowling alley');
      }

      const result = await response.json();
      router.push(`/bowling/${result.data.id}`);
    } catch (error) {
      console.error('Error creating bowling alley:', error);
      setError(error instanceof Error ? error.message : 'Failed to create bowling alley');
      setSaving(false);
    }
  };

  const totalLanes = Math.max(0, formData.endLane - formData.startLane + 1);
  const lanePairs = Math.floor(totalLanes / 2);
  const hasOddLanes = totalLanes % 2 !== 0 && formData.endLane > formData.startLane;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => router.push('/bowling')}
            className="mb-4 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-2"
          >
            <span>←</span> Back to Bowling Alleys
          </button>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">Create Bowling Alley</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Add a new bowling alley with lane configuration
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

        {/* Form */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Alley Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Alley Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Bol Insurgentes"
                required
              />
            </div>

            {/* Lane Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="startLane" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Start Lane Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="startLane"
                  min="1"
                  value={formData.startLane}
                  onChange={(e) => setFormData({ ...formData, startLane: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="endLane" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  End Lane Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="endLane"
                  min="2"
                  value={formData.endLane}
                  onChange={(e) => setFormData({ ...formData, endLane: parseInt(e.target.value) || 10 })}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {/* Lane Info */}
            <div className={`p-4 rounded-lg border ${hasOddLanes ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'}`}>
              <p className={`font-medium mb-2 ${hasOddLanes ? 'text-red-800 dark:text-red-200' : 'text-blue-800 dark:text-blue-200'}`}>
                Lane Configuration:
              </p>
              <div className={`space-y-1 text-sm ${hasOddLanes ? 'text-red-700 dark:text-red-300' : 'text-blue-700 dark:text-blue-300'}`}>
                <p>Total lanes: {totalLanes}</p>
                <p>Lane pairs: {lanePairs}</p>
                {hasOddLanes && (
                  <p className="font-semibold mt-2">⚠️ Odd number of lanes - must be even for proper pairing</p>
                )}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={saving || hasOddLanes}
                className="px-4 py-2 rounded-lg font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700 disabled:bg-zinc-400 disabled:cursor-not-allowed"
              >
                {saving ? 'Creating...' : 'Create Bowling Alley'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/bowling')}
                className="px-4 py-2 rounded-lg font-medium transition-colors bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

        {/* Help Text */}
        <div className="mt-6 p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-2">About Lane Configuration</h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Lanes are automatically paired for tournament matchups. For example, if you specify lanes 17-34,
            the system will create 18 lanes in 9 pairs: (17↔18), (19↔20), (21↔22), and so on. Each pair
            represents two adjacent lanes that will compete against each other during tournaments.
          </p>
        </div>
      </div>
    </div>
  );
}
