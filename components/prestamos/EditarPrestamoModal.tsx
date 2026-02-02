'use client';

import { useState } from 'react';
import { Save, DollarSign, Calendar, Percent, Activity } from 'lucide-react';
import { useNotification } from '@/components/providers/NotificationProvider';
import { Modal } from '@/components/ui/Modal';
import { formatCOPInputValue, formatMilesCOP, parseCOPInputToNumber } from '@/lib/utils';

interface EditarPrestamoModalProps {
  id: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function EditarPrestamoModal({ id, onClose, onSuccess }: EditarPrestamoModalProps) {
  const { showNotification } = useNotification();
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
        showNotification('success', 'El préstamo ha sido actualizado correctamente', 'Préstamo Actualizado');
        if (onSuccess) onSuccess();
        onClose();
    }, 1000);
  };

  const footer = (
    <>
      <button
        type="button"
        onClick={onClose}
        className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all text-sm"
        disabled={loading}
      >
        Cancelar
      </button>
      <button
        onClick={handleSubmit}
        className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center gap-2 text-sm"
        disabled={loading}
      >
        {loading ? (
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <Save className="w-4 h-4" />
        )}
        {loading ? 'Guardando...' : 'Guardar Cambios'}
      </button>
    </>
  );

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Editar Préstamo"
      size="lg"
      footer={footer}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 mb-6 flex items-center gap-3">
          <Activity className="h-5 w-5 text-blue-600" />
          <p className="text-sm text-blue-900 font-medium">
            Editando operación <span className="font-bold">{id}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wide mb-2">Monto Original</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
              <input
                type="text"
                inputMode="numeric"
                value={montoInput}
                onChange={(e) => setMontoInput(formatCOPInputValue(e.target.value))}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 font-bold text-slate-900 transition-all"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wide mb-2">Tasa Interés (%)</label>
            <div className="relative">
              <Percent className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
              <input
                type="text"
                inputMode="decimal"
                value={tasaInput}
                onChange={(e) => setTasaInput(e.target.value.replace(/[^0-9.]/g, ''))}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 font-bold text-slate-900 transition-all"
                required
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wide mb-2">Cuotas</label>
            <div className="relative">
               <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
               <input
                type="text"
                inputMode="numeric"
                value={cuotasInput}
                onChange={(e) => setCuotasInput(e.target.value.replace(/\D/g, ''))}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 font-bold text-slate-900 transition-all"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wide mb-2">Frecuencia</label>
            <select
              value={frecuencia}
              onChange={e => setFrecuencia(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 font-bold text-slate-900 transition-all appearance-none"
            >
              <option value="DIARIO">Diario</option>
              <option value="SEMANAL">Semanal</option>
              <option value="QUINCENAL">Quincenal</option>
              <option value="MENSUAL">Mensual</option>
            </select>
          </div>
        </div>

        <div>
           <label className="block text-xs font-black text-slate-500 uppercase tracking-wide mb-2">Estado</label>
           <select
             value={estado}
             onChange={e => setEstado(e.target.value)}
             className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 font-bold text-slate-900 transition-all appearance-none"
           >
             <option value="ACTIVO">Activo</option>
             <option value="PENDIENTE">Pendiente</option>
             <option value="PAGADO">Pagado</option>
             <option value="EN_MORA">En Mora</option>
           </select>
        </div>
      </form>
    </Modal>
  );
}
