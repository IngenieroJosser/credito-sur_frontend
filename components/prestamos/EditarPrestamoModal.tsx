'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Save, Clock, Edit3, Lock, User, Loader2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useNotification } from '@/components/providers/NotificationProvider';
import { formatCurrency } from '@/lib/utils';
import { prestamosService } from '@/services/prestamos-service';
import { formatErrorForComponent } from '@/lib/api/api';

interface EditarPrestamoModalProps {
  id: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const formatCOPInput = (val: number | undefined) => {
  if (val === undefined || val === 0) return '';
  return val.toLocaleString('es-CO');
};

const parseCOP = (val: string) => Number(val.replace(/\D/g, ''));

export default function EditarPrestamoModal({ id, onClose, onSuccess }: EditarPrestamoModalProps) {
  const { showNotification } = useNotification();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(true);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // Form state
  const [monto, setMonto] = useState(0);
  const [tasaStr, setTasaStr] = useState('');
  const [cuotasStr, setCuotasStr] = useState('');
  const [frecuencia, setFrecuencia] = useState('MENSUAL');
  const [estado, setEstado] = useState('ACTIVO');

  // Client info from backend
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteDni, setClienteDni] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [numeroPrestamo, setNumeroPrestamo] = useState('');

  // Original values for comparison (set after fetch)
  const originalRef = useRef({ monto: 0, tasa: 0, cuotas: 0, frecuencia: 'MENSUAL', estado: 'ACTIVO' });

  const tasa = Number(tasaStr) || 0;
  const cuotas = Number(cuotasStr) || 0;
  const hasChanges = monto !== originalRef.current.monto || tasa !== originalRef.current.tasa || cuotas !== originalRef.current.cuotas || frecuencia !== originalRef.current.frecuencia || estado !== originalRef.current.estado;

  // Computed preview
  const totalRecaudar = monto * (1 + tasa / 100);
  const cobroPorCuota = cuotas > 0 ? totalRecaudar / cuotas : 0;
  const interesTotal = totalRecaudar - monto;

  useEffect(() => {
    setMounted(true);
    requestAnimationFrame(() => setVisible(true));
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  // Fetch real loan data from backend
  useEffect(() => {
    const fetchLoan = async () => {
      setFetching(true);
      try {
        const data = await prestamosService.obtenerPrestamoPorId(id);
        const m = Number(data.monto) || 0;
        const t = Number(data.tasaInteres) || 0;
        const p = Number(data.plazoMeses) || 0;
        const f = data.frecuenciaPago || 'MENSUAL';
        const e = data.estado || 'ACTIVO';
        setMonto(m); setTasaStr(String(t)); setCuotasStr(String(p));
        setFrecuencia(f); setEstado(e);
        setNumeroPrestamo(data.numeroPrestamo || id);
        setClienteNombre(data.cliente ? `${data.cliente.nombres || ''} ${data.cliente.apellidos || ''}`.trim() : '');
        setClienteDni(data.cliente?.dni || '');
        setClienteTelefono(data.cliente?.telefono || '');
        originalRef.current = { monto: m, tasa: t, cuotas: p, frecuencia: f, estado: e };
      } catch (err) {
        console.error('Error cargando préstamo para editar:', err);
        showNotification('error', 'No se pudo cargar el préstamo', 'Error');
      } finally {
        setFetching(false);
      }
    };
    fetchLoan();
  }, [id]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await prestamosService.actualizarPrestamo(id, {
        monto,
        tasaInteres: tasa,
        plazoMeses: cuotas,
        frecuenciaPago: frecuencia,
        estado,
      });
      showNotification('success', 'El préstamo ha sido actualizado correctamente', 'Préstamo Actualizado');
      if (onSuccess) onSuccess();
      handleClose();
    } catch (err) {
      const msg = formatErrorForComponent(err);
      showNotification('error', msg, 'Error al actualizar');
    } finally {
      setLoading(false);
    }
  };

  const getEstadoColor = (e: string) => {
    switch (e) {
      case 'ACTIVO': return 'bg-emerald-100/50 text-emerald-700 border-emerald-200';
      case 'PENDIENTE': return 'bg-amber-100/50 text-amber-700 border-amber-200';
      case 'PAGADO': return 'bg-blue-100/50 text-blue-700 border-blue-200';
      case 'EN_MORA': return 'bg-rose-100/50 text-rose-700 border-rose-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={handleClose}>
      <div
        className={`bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 transition-all duration-200 ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
          <div className="flex items-center gap-3">
            <h3 className="text-xs font-black text-slate-900 flex items-center gap-2 uppercase tracking-widest">
              <Edit3 className="h-4 w-4 text-blue-600" />
              Editar Crédito
            </h3>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">{numeroPrestamo || id}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                isEditing
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'bg-blue-600 text-white shadow-sm hover:bg-blue-700'
              }`}
            >
              {isEditing ? (
                <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> Bloquear</span>
              ) : (
                <span className="flex items-center gap-1"><Edit3 className="h-3 w-3" /> Editar</span>
              )}
            </button>
            <button onClick={handleClose} className="p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content - 2 column layout */}
        <div className="max-h-[75vh] overflow-y-auto">
          {fetching ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <p className="text-sm font-medium text-slate-500">Cargando datos del crédito...</p>
            </div>
          ) : (
          <div className="p-5 grid grid-cols-2 gap-4">
            {/* LEFT COLUMN: Cliente + Estado */}
            <div className="space-y-4">
              {/* Bloque Cliente */}
              <div className="p-4 rounded-2xl border bg-slate-50/50 border-slate-100">
                <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-3 block border-b border-slate-200/50 pb-1">Información del Cliente</p>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-purple-50 border border-purple-100 text-purple-600">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div>
                      <label className="text-[8px] text-slate-500 uppercase font-bold block mb-0.5">Nombre</label>
                      <p className="text-[13px] font-black text-slate-900 leading-none">{clienteNombre || '—'}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[8px] text-slate-500 uppercase font-bold block mb-0.5">Cédula</label>
                        <p className="text-[11px] font-black text-slate-800">{clienteDni || '—'}</p>
                      </div>
                      <div>
                        <label className="text-[8px] text-slate-500 uppercase font-bold block mb-0.5">Teléfono</label>
                        <p className="text-[11px] font-black text-slate-800">{clienteTelefono || '—'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Estado Block */}
              <div className={`p-4 rounded-2xl border transition-all duration-300 ${isEditing ? 'bg-white border-orange-200 shadow-lg' : 'bg-slate-50/50 border-slate-100'}`}>
                <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-3 block border-b border-slate-200/50 pb-1">Estado del Crédito</p>
                {isEditing ? (
                  <div className="grid grid-cols-2 gap-2">
                    {['ACTIVO', 'PENDIENTE', 'PAGADO', 'EN_MORA'].map((e) => (
                      <button
                        key={e}
                        onClick={() => setEstado(e)}
                        className={`py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                          estado === e
                            ? `${getEstadoColor(e)} ring-2 ring-offset-1 ring-blue-400`
                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        {e.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${getEstadoColor(estado)}`}>
                      {estado.replace('_', ' ')}
                    </span>
                  </div>
                )}
              </div>

              {/* Changes indicator */}
              {hasChanges && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 border-dashed">
                  <p className="text-[9px] font-black text-amber-700 uppercase tracking-widest text-center">
                    ⚡ Cambios detectados
                  </p>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: Financial Block */}
            <div className="space-y-4">
              <div className={`p-4 rounded-2xl border transition-all duration-300 ${isEditing ? 'bg-white border-blue-200 shadow-lg' : 'bg-blue-50/70 border-blue-100'}`}>
                <p className="text-[8px] font-black uppercase tracking-widest text-blue-700/70 mb-3 block border-b border-blue-200 pb-1">Condiciones Financieras</p>
                <div className="space-y-3">
                  {/* Capital */}
                  <div>
                    <label className="text-[8px] text-blue-700 uppercase font-bold block mb-0.5">Capital</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formatCOPInput(monto)}
                        onChange={(e) => setMonto(parseCOP(e.target.value))}
                        className="w-full bg-white border border-blue-200 text-slate-900 rounded-md px-2 py-1.5 text-sm font-black outline-none focus:ring-1 focus:ring-blue-400"
                      />
                    ) : (
                      <p className="text-2xl font-black text-slate-900 tabular-nums tracking-tighter leading-none">{formatCurrency(monto)}</p>
                    )}
                  </div>

                  {/* Cuotas + Interés */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-blue-200/50">
                    <div>
                      <label className="text-[8px] text-blue-700 uppercase font-bold block mb-0.5">Cuotas</label>
                      {isEditing ? (
                        <input
                          type="text"
                          inputMode="numeric"
                          value={cuotasStr}
                          onChange={(e) => setCuotasStr(e.target.value.replace(/[^0-9]/g, ''))}
                          placeholder="0"
                          className="w-full bg-white border border-blue-200 text-slate-900 rounded-md px-2 py-1.5 text-sm font-black outline-none focus:ring-1 focus:ring-blue-400"
                        />
                      ) : (
                        <p className="text-base font-black text-slate-900 leading-none">{cuotas} <span className="text-[9px] font-black text-slate-500">MESES</span></p>
                      )}
                    </div>
                    <div>
                      <label className="text-[8px] text-blue-700 uppercase font-bold block mb-0.5">Interés (%)</label>
                      {isEditing ? (
                        <input
                          type="text"
                          inputMode="decimal"
                          value={tasaStr}
                          onChange={(e) => setTasaStr(e.target.value.replace(/[^0-9.]/g, ''))}
                          placeholder="0"
                          className="w-full bg-white border border-blue-200 text-slate-900 rounded-md px-2 py-1.5 text-sm font-black outline-none focus:ring-1 focus:ring-blue-400"
                        />
                      ) : (
                        <p className="text-base font-black text-slate-900 leading-none">{tasa}%</p>
                      )}
                    </div>
                  </div>

                  {/* Frecuencia */}
                  <div>
                    <label className="text-[8px] text-blue-700 uppercase font-bold block mb-0.5">Frecuencia de Pago</label>
                    {isEditing ? (
                      <select
                        value={frecuencia}
                        onChange={(e) => setFrecuencia(e.target.value)}
                        className="w-full bg-white border border-blue-200 text-slate-900 rounded-md px-2 py-1.5 text-sm font-black outline-none focus:ring-1 focus:ring-blue-400"
                      >
                        <option value="DIARIO">DIARIO</option>
                        <option value="SEMANAL">SEMANAL</option>
                        <option value="QUINCENAL">QUINCENAL</option>
                        <option value="MENSUAL">MENSUAL</option>
                      </select>
                    ) : (
                      <p className="text-sm font-black text-blue-800 uppercase italic">{frecuencia}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Plan de Pago Proyectado */}
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 border-dashed">
                <p className="text-[8px] font-black text-emerald-600 uppercase mb-3 tracking-widest">Plan de Pago Proyectado</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[7px] text-emerald-500 uppercase font-bold block">Cobro / Cuota</label>
                    <p className="text-lg font-black text-emerald-900">{formatCurrency(cobroPorCuota)}</p>
                    <p className="text-[8px] font-bold text-emerald-600 uppercase mt-0.5">
                      {frecuencia === 'DIARIO' ? 'Pago diario' : frecuencia === 'SEMANAL' ? 'Pago semanal' : frecuencia === 'QUINCENAL' ? 'Pago quincenal' : 'Pago mensual'}
                    </p>
                  </div>
                  <div>
                    <label className="text-[7px] text-emerald-500 uppercase font-bold block">Total a Recaudar</label>
                    <p className="text-lg font-black text-emerald-900">{formatCurrency(totalRecaudar)}</p>
                  </div>
                  <div>
                    <label className="text-[7px] text-emerald-500 uppercase font-bold block">Interés Total</label>
                    <p className="text-sm font-black text-emerald-900">{formatCurrency(interesTotal)}</p>
                  </div>
                  <div>
                    <label className="text-[7px] text-emerald-500 uppercase font-bold block">Plazo Total</label>
                    <p className="text-sm font-black text-emerald-900">{cuotas} cuotas <span className="text-emerald-600">×</span> {frecuencia === 'DIARIO' ? 'día' : frecuencia === 'SEMANAL' ? 'semana' : frecuencia === 'QUINCENAL' ? 'quincena' : 'mes'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-600 font-black text-[11px] uppercase tracking-widest rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !hasChanges}
            className="flex-1 py-2.5 bg-blue-600 text-white font-black text-[11px] uppercase tracking-widest rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
