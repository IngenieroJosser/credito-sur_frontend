'use client';

import React from 'react';

export type TimeFilterPeriod = 'today' | 'week' | 'month' | 'year';

/**
 * Los periodos, con sus dos etiquetas. UNA sola definicion.
 *
 * Estaban dentro del componente, asi que cualquier otra parte que necesitara
 * decir «Mes» o «Año» tenia que escribirlo otra vez. Se exportan porque el
 * aviso de «actualizando a <periodo>» las necesita, y dos copias de una
 * etiqueta acaban divergiendo como ya paso con el formateo de pesos.
 */
export const PERIODOS = [
  { id: 'today', label: 'Hoy', fullLabel: 'Hoy' },
  { id: 'week', label: 'Sem', fullLabel: 'Semana' },
  { id: 'month', label: 'Mes', fullLabel: 'Mes' },
  { id: 'year', label: 'Año', fullLabel: 'Año' },
] as const;

/** El nombre largo de un periodo, para decirselo a la persona. */
export function nombreDePeriodo(periodo: TimeFilterPeriod): string {
  return PERIODOS.find((p) => p.id === periodo)?.fullLabel ?? String(periodo);
}

interface TimeFilterProps {
  activePeriod: TimeFilterPeriod;
  onPeriodChange: (period: TimeFilterPeriod) => void;
  className?: string;
}

export function TimeFilter({ activePeriod, onPeriodChange, className = '' }: TimeFilterProps) {
  const periods = PERIODOS;

  return (
    <div className={className}>
      {/* Desktop View */}
      <div className="hidden md:flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm w-fit">
        {periods.map((period) => (
          <button
            key={period.id}
            type="button"
            aria-label={period.fullLabel}
            aria-pressed={activePeriod === period.id}
            onClick={() => onPeriodChange(period.id)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activePeriod === period.id
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50'
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
            type="button"
            aria-pressed={activePeriod === period.id}
            onClick={() => onPeriodChange(period.id)}
            className={`px-4 py-2 text-xs font-bold rounded-full whitespace-nowrap transition-all ${
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
