'use client';

import { useState, useMemo } from 'react';
import { X, Calendar, AlertCircle, CheckCircle2, DollarSign } from 'lucide-react';
import { formatCurrency, formatCOPInputValue, parseCOPInputToNumber } from '@/lib/utils';

type FrecuenciaPago = 'DIARIO' | 'SEMANAL' | 'QUINCENAL' | 'MENSUAL';

interface ReprogramarCuotaModalProps {
  prestamoId: string;
  cuotaNumero: number;
  fechaOriginal: string;
  frecuenciaPago: FrecuenciaPago;
  montoCuota: number;
  onClose: () => void;
  onSuccess: () => void;
}

// Calcular fecha límite según frecuencia
const calcularFechaLimite = (fechaOriginal: string, frecuencia: FrecuenciaPago): Date => {
  const fecha = new Date(fechaOriginal);
  
  switch (frecuencia) {
    case 'DIARIO':
      // Máximo 2 días después
      fecha.setDate(fecha.getDate() + 2);
      break;
    case 'SEMANAL':
      // Máximo 1 día antes de la siguiente semana
      fecha.setDate(fecha.getDate() + 6);
      break;
    case 'QUINCENAL':
      // Máximo 1 día antes de la siguiente quincena
      fecha.setDate(fecha.getDate() + 14);
      break;
    case 'MENSUAL':
      // Máximo 1 día antes del siguiente mes
      fecha.setDate(fecha.getDate() + 29);
      break;
  }
  
  return fecha;
};

export default function ReprogramarCuotaModal({
  prestamoId,
  cuotaNumero,
  fechaOriginal,
  frecuenciaPago,
  montoCuota,
  onClose,
  onSuccess,
}: ReprogramarCuotaModalProps) {
  const [nuevaFecha, setNuevaFecha] = useState<string>('');
  const [motivo, setMotivo] = useState<string>('');
  const [esCuotaParcial, setEsCuotaParcial] = useState(false);
  const [montoParcial, setMontoParcial] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const fechaLimite = useMemo(() => 
    calcularFechaLimite(fechaOriginal, frecuenciaPago), 
    [fechaOriginal, frecuenciaPago]
  );

  // Validar estado de la fecha seleccionada
  const validacionFecha = useMemo(() => {
    if (!nuevaFecha) return null;
    
    const fechaSeleccionada = new Date(nuevaFecha + 'T00:00:00');
    const fechaOrig = new Date(fechaOriginal + 'T00:00:00');
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    // No puede ser fecha pasada
    if (fechaSeleccionada < hoy) {
      return { estado: 'invalido', mensaje: 'No puede seleccionar una fecha pasada' };
    }
    
    // No puede ser antes de la fecha original
    if (fechaSeleccionada < fechaOrig) {
      return { estado: 'invalido', mensaje: 'Debe ser posterior a la fecha original' };
    }
    
    // Después de la fecha límite
    if (fechaSeleccionada > fechaLimite) {
      return { estado: 'invalido', mensaje: 'Excede el plazo permitido para reprogramación' };
    }
    
    // Calcular días hasta el límite
    const diasHastaLimite = Math.floor((fechaLimite.getTime() - fechaSeleccionada.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diasHastaLimite <= 1) {
      return { estado: 'advertencia', mensaje: 'Muy cerca del límite permitido' };
    }
    
    return { estado: 'valido', mensaje: 'Fecha válida para reprogramación' };
  }, [nuevaFecha, fechaOriginal, fechaLimite]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validaciones
    if (!nuevaFecha) {
      setError('Debe seleccionar una nueva fecha');
      return;
    }

    if (validacionFecha?.estado === 'invalido') {
      setError(validacionFecha.mensaje);
      return;
    }

    if (!motivo.trim()) {
      setError('Debe especificar el motivo de la reprogramación');
      return;
    }

    if (esCuotaParcial) {
      const montoNum = parseCOPInputToNumber(montoParcial);
      if (!montoNum || montoNum <= 0) {
        setError('El monto parcial debe ser mayor a cero');
        return;
      }
      if (montoNum > montoCuota) {
        setError('El monto parcial no puede exceder el valor de la cuota');
        return;
      }
    }

    setLoading(true);

    try {
      // TODO: Implement API call
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulación
      
      const montoFinal = esCuotaParcial ? parseCOPInputToNumber(montoParcial) : montoCuota;
      
      console.log('Reprogramando cuota:', {
        prestamoId,
        cuotaNumero,
        fechaOriginal,
        nuevaFecha,
        motivo,
        esCuotaParcial,
        monto: montoFinal
      });

      alert('Cuota reprogramada exitosamente');
      onSuccess();
    } catch (err) {
      setError('Error al reprogramar la cuota. Intente nuevamente.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
      style={{ zIndex: 9999 }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-100 text-blue-600">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">Reprogramar Cuota</h3>
                <p className="text-sm text-slate-500 font-medium">
                  Cuota #{cuotaNumero} • {formatCurrency(montoCuota)}
                </p>
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
            {/* Información de Cuota Original */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xs font-bold text-slate-500 uppercase mb-2">Fecha Original</p>
              <p className="text-lg font-black text-slate-900">
                {new Date(fechaOriginal + 'T00:00:00').toLocaleDateString('es-CO', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Frecuencia: {frecuenciaPago}
              </p>
            </div>

            {/* Selector de Nueva Fecha */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 uppercase">
                Nueva Fecha de Pago
              </label>
              <input
                type="date"
                value={nuevaFecha}
                onChange={(e) => setNuevaFecha(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                max={fechaLimite.toISOString().split('T')[0]}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-white font-bold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                required
              />
              
              {/* Validación Visual de Fecha */}
              {validacionFecha && (
                <div className={`flex items-center gap-2 p-3 rounded-xl ${
                  validacionFecha.estado === 'valido' 
                    ? 'bg-emerald-50 border border-emerald-200' 
                    : validacionFecha.estado === 'advertencia'
                    ? 'bg-amber-50 border border-amber-200'
                    : 'bg-rose-50 border border-rose-200'
                }`}>
                  {validacionFecha.estado === 'valido' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  ) : (
                    <AlertCircle className={`w-5 h-5 flex-shrink-0 ${
                      validacionFecha.estado === 'advertencia' ? 'text-amber-600' : 'text-rose-600'
                    }`} />
                  )}
                  <p className={`text-sm font-bold ${
                    validacionFecha.estado === 'valido'
                      ? 'text-emerald-700'
                      : validacionFecha.estado === 'advertencia'
                      ? 'text-amber-700'
                      : 'text-rose-700'
                  }`}>
                    {validacionFecha.mensaje}
                  </p>
                </div>
              )}
              
              <p className="text-xs text-slate-500 font-medium">
                Fecha límite: {fechaLimite.toLocaleDateString('es-CO', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
            </div>

            {/* Motivo */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 uppercase">
                Motivo de Reprogramación
              </label>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-white font-medium text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                placeholder="Explique el motivo de la reprogramación..."
                required
              />
            </div>

            {/* Cuota Parcial */}
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border-2 border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={esCuotaParcial}
                  onChange={(e) => {
                    setEsCuotaParcial(e.target.checked);
                    if (!e.target.checked) setMontoParcial('');
                  }}
                  className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/20"
                />
                <div className="flex-1">
                  <p className="text-sm font-black text-slate-900">Pago Parcial</p>
                  <p className="text-xs text-slate-500 font-medium">
                    El cliente pagará un monto menor a la cuota completa
                  </p>
                </div>
              </label>

              {esCuotaParcial && (
                <div className="space-y-2 pl-4 animate-in slide-in-from-top-2 duration-200">
                  <label className="text-sm font-bold text-slate-700 uppercase">
                    Monto a Pagar
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      inputMode="numeric"
                      value={montoParcial}
                      onChange={(e) => setMontoParcial(formatCOPInputValue(e.target.value))}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-slate-200 bg-white font-bold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      placeholder="Monto del pago parcial"
                      required={esCuotaParcial}
                    />
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    Valor total de la cuota: {formatCurrency(montoCuota)}
                  </p>
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl">
                <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                <p className="text-sm font-medium text-rose-700">{error}</p>
              </div>
            )}

            {/* Información Importante */}
            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-bold text-blue-900 mb-1">Importante</p>
                <p className="text-blue-700 font-medium">
                  La reprogramación será registrada en el historial del préstamo. 
                  Si es pago parcial, el saldo restante se agregará a la siguiente cuota.
                </p>
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || validacionFecha?.estado === 'invalido'}
                className="flex-1 py-3 bg-white border-2 border-blue-600 text-blue-600 font-black rounded-2xl hover:bg-blue-50 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Confirmar Reprogramación
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
