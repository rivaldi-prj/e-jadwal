import React from 'react';
import { Search, X, Layers } from 'lucide-react';
import { BATCHES, DAYS_OF_WEEK } from '../constants/scheduleConfig';

export function FilterBar({
  selectedBatch,
  onSelectBatch,
  selectedDay,
  onSelectDay,
  searchQuery,
  onSearchChange,
  bookingsCount,
}) {
  const hasActiveFilter = selectedBatch !== 'ALL' || selectedDay !== 'ALL' || searchQuery !== '';

  const handleReset = () => {
    onSelectBatch('ALL');
    onSelectDay('ALL');
    onSearchChange('');
  };

  return (
    <div className="no-print bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-2 sm:p-2.5 shadow-2xs mb-3 transition-all">
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
        {/* Angkatan Segmented Controls (Modern Soft Style) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <span className="text-[11px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1 mr-1 flex-shrink-0">
            <Layers className="w-3.5 h-3.5" />
            Angkatan:
          </span>

          <div className="inline-flex items-center bg-slate-100/90 dark:bg-zinc-800/80 p-0.5 rounded-xl">
            <button
              type="button"
              onClick={() => onSelectBatch('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedBatch === 'ALL'
                  ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
            >
              Semua
            </button>
            {BATCHES.map((batch) => {
              const isSelected = selectedBatch === batch.id;
              return (
                <button
                  key={batch.id}
                  type="button"
                  onClick={() => onSelectBatch(batch.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-xs'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${batch.dot || 'bg-slate-400'}`} />
                  <span>{batch.id}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Search & Day Filters */}
        <div className="flex items-center gap-2">
          {/* Day Dropdown */}
          <div className="relative min-w-[125px]">
            <select
              value={selectedDay}
              onChange={(e) => onSelectDay(e.target.value)}
              className="w-full text-xs font-medium bg-slate-50 hover:bg-slate-100 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 text-slate-700 dark:text-zinc-200 rounded-lg px-2.5 py-1.5 border border-slate-200 dark:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer transition-colors"
            >
              <option value="ALL">Semua Hari</option>
              {DAYS_OF_WEEK.map((d) => (
                <option key={d} value={d}>
                  Hari {d}
                </option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 sm:w-60">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari Mata Kuliah / Dosen..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full text-xs pl-8 pr-2.5 py-1.5 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 rounded-lg border border-slate-200 dark:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-slate-400 placeholder-slate-400 transition-colors"
            />
          </div>

          {/* Reset Button */}
          {hasActiveFilter && (
            <button
              type="button"
              onClick={handleReset}
              className="px-2.5 py-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors text-xs font-medium flex items-center gap-1 border border-rose-200 dark:border-rose-900"
              title="Reset Filter"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
