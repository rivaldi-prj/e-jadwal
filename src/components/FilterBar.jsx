import React from 'react';
import { Search, Filter, X, Calendar, Layers } from 'lucide-react';
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
    <div className="no-print bg-white dark:bg-zinc-900/90 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-2.5 sm:p-3 shadow-xs mb-3 sm:mb-3.5 transition-all">
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 sm:gap-3.5">
        {/* Angkatan Segmented Controls */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400 dark:text-zinc-500 mr-1.5 flex items-center gap-1 flex-shrink-0">
            <Layers className="w-3.5 h-3.5" />
            Angkatan:
          </span>
          <button
            onClick={() => onSelectBatch('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex-shrink-0 ${
              selectedBatch === 'ALL'
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            Semua
          </button>
          {BATCHES.map((batch) => {
            const isSelected = selectedBatch === batch.id;
            return (
              <button
                key={batch.id}
                onClick={() => onSelectBatch(batch.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex-shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? `${batch.activeTab} font-semibold`
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : batch.dot}`}></span>
                <span>{batch.id}</span>
              </button>
            );
          })}
        </div>

        {/* Right Search & Day Filters */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
          {/* Day Dropdown */}
          <div className="relative min-w-[130px]">
            <select
              value={selectedDay}
              onChange={(e) => onSelectDay(e.target.value)}
              className="w-full text-xs font-medium bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 text-zinc-700 dark:text-zinc-200 rounded-xl px-2.5 py-1.5 border border-zinc-200 dark:border-zinc-700/80 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer transition-colors"
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
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Cari Mata Kuliah / Dosen..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full text-xs pl-8 pr-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl border border-zinc-200 dark:border-zinc-700/80 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder-zinc-400 transition-colors"
            />
          </div>

          {/* Reset Button */}
          {hasActiveFilter && (
            <button
              onClick={handleReset}
              className="px-2.5 py-1.5 text-zinc-500 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors text-xs font-medium flex items-center gap-1 border border-zinc-200/80 dark:border-zinc-800"
              title="Reset Filter"
            >
              <X className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
