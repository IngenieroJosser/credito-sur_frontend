'use client';

import React from 'react';

export type TimeFilterPeriod = 'today' | 'week' | 'month' | 'quarter';

interface TimeFilterProps {
  activePeriod: TimeFilterPeriod;
  onPeriodChange: (period: TimeFilterPeriod) => void;
  className?: string;
}

export function TimeFilter({ activePeriod, onPeriodChange, className = '' }: TimeFilterProps) {
  const periods = [
    { id: 'today', label: 'Hoy', fullLabel: 'Hoy' },
    { id: 'week', label: 'Sem', fullLabel: 'Semana' },
    { id: 'month', label: 'Mes', fullLabel: 'Mes' },
    { id: 'quarter', label: 'Trim', fullLabel: 'Trimestre' },
  ] as const;

  return (
    <div className={className}>
      {/* Desktop View */}
      <div className="hidden md:flex bg-white rounded-xl p-1 shadow-sm border border-slate-100">
        {periods.map((period) => (
          <button
            key={period.id}
            onClick={() => onPeriodChange(period.id)}
            className={`px-5 py-2 text-sm rounded-lg transition-all font-medium ${
              activePeriod === period.id
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50'
            }`}
          >
            {period.label}
          </button>
        ))}
      </div>

      {/* Mobile View */}
      <div className="md:hidden flex overflow-x-auto pb-2 gap-2 scrollbar-hide">
        {periods.map((period) => (
          <button
            key={period.id}
            onClick={() => onPeriodChange(period.id)}
            className={`px-4 py-2 text-sm rounded-full whitespace-nowrap transition-all font-medium ${
              activePeriod === period.id
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            {period.fullLabel}
          </button>
        ))}
      </div>
    </div>
  );
}
