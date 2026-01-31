'use client';

import { useState } from 'react';
import { X, Percent, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ModificarInteresModalProps {
  prestamoId: string;
  tasaActual: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ModificarInteresModal({ 
  prestamoId, 
  tasaActual, 
  onClose, 
  onSuccess 
}: ModificarInteresModalProps) {
  const [nuevaTasa, setNuevaTasa] = useState<string>(tasaActual.toString());
  const [motivo, setMotivo] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const tasaNumero = parseFloat(nuevaTasa);
    
    // Validaciones
    if (isNaN(tasaNumero) || tasaNumero < 0 || tasaNumero > 100) {
      setError('La tasa de interés debe estar entre 0% y 100%');
      return;
    }

    if (!motivo.trim()) {
      setError('Debe especificar el motivo del cambio de interés');
      return;
    }

    setLoading(true);

    try {
      // TODO: Implement API call
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulación
      
      console.log('Modificando interés del préstamo:', {
        prestamoId,
        tasaAnterior: tasaActual,
        tasaNueva: tasaNumero,
        motivo
      });

      alert(`Interés modificado exitosamente de ${tasaActual}% a ${tasaNumero}%`);
      onSuccess();
    } catch (err) {
      setError('Error al modificar el interés. Intente nuevamente.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-100 text-blue-600">
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">Modificar Interés</h2>
              <p className="text-sm text-slate-500 font-medium">Autorización especial de tasa</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tasa Actual */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-xs font-bold text-slate-500 uppercase mb-1">Tasa Actual</p>
            <p className="text-2xl font-black text-slate-900">{tasaActual}%</p>
          </div>

          {/* Nueva Tasa */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 uppercase">
              Nueva Tasa de Interés (%)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={nuevaTasa}
                onChange={(e) => setNuevaTasa(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-white font-bold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-lg"
                placeholder="Ej: 15.50"
                required
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                %
              </div>
            </div>
          </div>

          {/* Motivo */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 uppercase">
              Motivo del Cambio
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-white font-medium text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
              placeholder="Explique el motivo de la modificación del interés..."
              required
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl">
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
              <p className="text-sm font-medium text-rose-700">{error}</p>
            </div>
          )}

          {/* Advertencia */}
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold text-amber-900 mb-1">Acción Crítica</p>
              <p className="text-amber-700 font-medium">
                Esta modificación quedará registrada en el sistema de auditoría y afectará el cálculo de las cuotas futuras.
              </p>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-white border border-blue-600 text-blue-600 font-black rounded-2xl hover:bg-blue-50 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Autorizar Cambio
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
