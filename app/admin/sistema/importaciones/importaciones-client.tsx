'use client';

import { useState } from 'react';
import { ChevronRight, Settings } from 'lucide-react';
import { Toaster } from 'sonner';

import { PlantillasCard } from './components/PlantillasCard';
import { PreparacionHistoricaCard } from './components/PreparacionHistoricaCard';
import { HistorialLotesCard } from './components/HistorialLotesCard';
import EstadoContableCard from '@/components/contable/EstadoContableCard';

export const ImportacionesClient = () => {
  // Se incrementa al confirmar, para que el historial se recargue.
  const [versionHistorial, setVersionHistorial] = useState(0);

  return (
    <div className="min-h-screen bg-slate-50 relative">
      <Toaster position="top-right" />
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-slate-400 opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 w-full min-w-0 space-y-8 p-4 sm:p-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-xs text-slate-600 tracking-wide font-bold border border-slate-200 mb-2">
              <Settings className="h-3.5 w-3.5" />
              <span>Sistema / Configuración</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              <span className="text-blue-600">Importación Masiva de </span><span className="text-orange-500">Datos</span>
            </h1>
            <p className="text-slate-500 mt-2 font-medium text-sm max-w-2xl">
              Descarga la plantilla oficial, llénala y súbela como un solo libro: artículos, clientes y créditos.
              La pantalla valida el archivo y, cuando el entorno lo permite, registra la carga de prueba.
              La importación operativa por módulos queda pendiente y no se hace aquí.
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-1">
            <PlantillasCard />
          </div>
          <div className="min-w-0 xl:col-span-2">
            <PreparacionHistoricaCard alConfirmar={() => setVersionHistorial(v => v + 1)} />
          </div>
        </div>

        {/* Antes y despues de importar: si los numeros no cambiaron, nada
            se rompio. Va aqui porque es donde se va a mirar. */}
        <EstadoContableCard />

        <details className="group rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
          <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700">
            <ChevronRight aria-hidden="true" size={16} className="transition-transform group-open:rotate-90" />
            Historial de importaciones (herramienta técnica)
          </summary>
          <div className="mt-4">
            <HistorialLotesCard recargar={versionHistorial} />
          </div>
        </details>
      </div>
    </div>
  );
};
