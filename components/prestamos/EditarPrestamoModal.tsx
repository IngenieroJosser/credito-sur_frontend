'use client';

import { useState } from 'react';
import { X, Save, DollarSign } from 'lucide-react';
import Portal, { MODAL_Z_INDEX } from '@/components/ui/Portal';
import { formatCOPInputValue, formatMilesCOP, parseCOPInputToNumber } from '@/lib/utils';

interface EditarPrestamoModalProps {
  id: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function EditarPrestamoModal({ id, onClose, onSuccess }: EditarPrestamoModalProps) {
  const [montoInput, setMontoInput] = useState(formatMilesCOP(1500000));
  const [tasaInput, setTasaInput] = useState('20');
  const [cuotasInput, setCuotasInput] = useState('6');
  const [frecuencia, setFrecuencia] = useState('MENSUAL');
  const [estado, setEstado] = useState('ACTIVO');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const payload = {
      monto: parseCOPInputToNumber(montoInput),
      duracionMeses: Number(cuotasInput || '0'),
      frecuencia,
      tasa: Number(tasaInput || '0'),
      estado,
    };
    
    console.log('Actualizar préstamo:', id, payload);
    
    // Simulate API delay
    setTimeout(() => {
        setLoading(false);
        alert('Préstamo actualizado (Simulado)');
        if (onSuccess) onSuccess();
        onClose();
    }, 1000);
  };

  return (
    <Portal>
      <div
        className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
        style={{ zIndex: MODAL_Z_INDEX }}
        onClick={onClose}
      >
        <div
          className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 md:p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-bold text-slate-900">Editar Préstamo</h3>
                <p className="text-slate-500">ID de Operación: {id}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Monto Original</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                    <input
                      type="text"
                      inputMode="numeric"
                      value={montoInput}
                      onChange={(e) => setMontoInput(formatCOPInputValue(e.target.value))}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Tasa Interés (%)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={tasaInput}
                    onChange={(e) => setTasaInput(e.target.value.replace(/[^0-9.]/g, ''))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Cuotas</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={cuotasInput}
                    onChange={(e) => setCuotasInput(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Frecuencia</label>
                  <select
                    value={frecuencia}
                    onChange={e => setFrecuencia(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900"
                  >
                    <option value="DIARIO">Diario</option>
                    <option value="SEMANAL">Semanal</option>
                    <option value="QUINCENAL">Quincenal</option>
                    <option value="MENSUAL">Mensual</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Estado</label>
                <select
                  value={estado}
                  onChange={e => setEstado(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900"
                >
                  <option value="ACTIVO">Activo</option>
                  <option value="PENDIENTE">Pendiente</option>
                  <option value="PAGADO">Pagado</option>
                  <option value="EN_MORA">En Mora</option>
                </select>
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-white border border-slate-200 text-slate-700 font-bold py-3.5 rounded-xl hover:bg-slate-50 transition-all"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#08557f] text-white font-bold py-3.5 rounded-xl shadow-xl shadow-[#08557f]/20 hover:bg-[#063a58] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Save className="w-5 h-5" />
                  )}
                  {loading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Portal>
  );
}
