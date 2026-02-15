'use client';

import { WifiOff, RotateCw } from 'lucide-react';
import Image from 'next/image';

export default function Offline() {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 flex items-center justify-center p-4 relative">
      {/* Fondo decorativo con orbes */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-24 w-96 h-96 bg-gradient-to-br from-[#08557f]/[0.02] to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 -right-24 w-96 h-96 bg-gradient-to-tr from-[#fb851b]/[0.02] to-transparent rounded-full blur-3xl"></div>
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#08557f]/5 to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#08557f]/5 to-transparent"></div>
      </div>

      {/* Tarjeta principal */}
      <div className="w-full max-w-sm relative z-10">
        {/* Header con logo */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="relative">
              <div className="w-20 h-20 bg-white border border-gray-200 rounded-2xl flex items-center justify-center p-3 shadow-xl shadow-blue-900/10 transition-transform hover:scale-105 hover:rotate-2 overflow-hidden">
                <Image
                  src="/favicon.ico"
                  alt="Logo CrediSur"
                  width={80}
                  height={80}
                  className="object-contain p-2 w-full h-full"
                  priority
                />
              </div>
            </div>
          </div>
          <h1 className="text-3xl font-light text-gray-800 mb-2">
            <span className="font-normal text-[#08557f]">Credi</span>
            <span className="font-normal text-[#fb851b]">Sur</span>
          </h1>
          <p className="text-xs text-gray-400 uppercase tracking-wider mt-4">Plataforma Financiera</p>
        </div>

        {/* Contenido de offline */}
        <div className="mb-8 text-center">
          {/* Ícono grande de Wi-Fi apagado */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-24 h-24 bg-white border border-gray-200 rounded-2xl flex items-center justify-center shadow-inner">
                <WifiOff className="h-12 w-12 text-gray-300" strokeWidth={1.5} />
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm">
                <span className="text-xs text-gray-400">!</span>
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Sin conexión</h2>
          <p className="text-sm text-gray-500 mb-6">
            Algunas funciones siguen disponibles, pero la información mostrada puede no estar actualizada.
          </p>
          <p className="text-xs text-gray-400 mb-8">
            Verifica tu conexión a internet e inténtalo de nuevo.
          </p>

          {/* Botón de reintentar (similar al de login) */}
          <button
            onClick={handleRetry}
            className="w-full group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-white border border-gray-200 rounded-lg transition-all duration-300 group-hover:border-[#08557f]"></div>
            <div className="relative py-3 px-4 flex items-center justify-center space-x-2">
              <RotateCw className="h-4 w-4 text-gray-400 group-hover:text-[#08557f] group-hover:rotate-180 transition-all duration-500" />
              <span className="text-sm font-medium text-gray-700 group-hover:text-[#08557f] transition-colors duration-300">
                Reintentar
              </span>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-white text-xs text-gray-400">Versión Alpha 1.0</span>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest">
              Acceso restringido
            </p>
            <p className="text-[9px] text-gray-300">
              © {new Date().getFullYear()} CrediSur
            </p>
          </div>
        </div>

        {/* Indicador de estado offline */}
        <div className="fixed bottom-8 right-8 flex items-center space-x-2 opacity-40 hover:opacity-100 transition-opacity duration-300">
          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
          <span className="text-xs text-gray-500">Desconectado</span>
        </div>
      </div>
    </div>
  );
}