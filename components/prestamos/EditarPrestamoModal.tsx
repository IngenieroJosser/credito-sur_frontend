'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Save, Clock, Edit3, Lock, User, Loader2, Package } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useNotification } from '@/components/providers/NotificationProvider';
import { useNotificaciones } from '@/components/providers/NotificacionesProvider';
import { formatCurrency, formatLoanTerm, formatMilesCOP } from '@/lib/utils';
import { prestamosService } from '@/services/prestamos-service';
import { formatErrorForComponent } from '@/lib/api/api';
import { articulosService } from '@/services/articulos-service';
import { normalizeDateKey } from '@/lib/rutas-core';
import { TipoAmortizacion } from '@/types/enums';

interface EditarPrestamoModalProps {
  id: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const formatCOPInput = (val: number | undefined) => {
  if (val === undefined || val === 0) return '';
  return formatMilesCOP(val);
};

const parseCOP = (val: string) => Number(val.replace(/\D/g, ''));

const calcularAmortizacionPreview = (
  capital: number,
  tasaTotal: number,
  numCuotas: number
) => {
  if (!capital || capital <= 0 || !numCuotas || numCuotas <= 0) {
    return { cuotaFija: 0, interesTotal: 0, total: 0 };
  }

  const tasaPeriodo = (Number(tasaTotal) || 0) / 100;

  if (tasaPeriodo === 0) {
    const cuotaFija = capital / numCuotas;
    return {
      cuotaFija,
      interesTotal: 0,
      total: capital,
    };
  }

  const cuotaFijaDecimal = (capital * tasaPeriodo) / (1 - Math.pow(1 + tasaPeriodo, -numCuotas));
  const cuotaFija = Math.round(cuotaFijaDecimal);
  const total = cuotaFija * numCuotas;
  const interesTotal = Math.max(0, total - capital);
  return { cuotaFija, interesTotal, total };
};

const calcularInteresPlanoPreview = (
  capital: number,
  tasaTotal: number,
  numCuotas: number
) => {
  if (!capital || capital <= 0 || !numCuotas || numCuotas <= 0) {
    return { cuotaFija: 0, interesTotal: 0, total: 0 };
  }
  
  // Interés plano truncado (Math.trunc), como el backend.
  const interesTotal = Math.trunc(capital * (tasaTotal / 100));
  const total = capital + interesTotal;
  const cuotaFija = Math.floor(total / numCuotas);
  return { cuotaFija, interesTotal, total };
};

export default function EditarPrestamoModal({ id, onClose, onSuccess }: EditarPrestamoModalProps) {
  const { showNotification } = useNotification();
  const { refreshNotificaciones } = useNotificaciones();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(true);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const [backendInteresTotal, setBackendInteresTotal] = useState(0);
  const [backendTotalFinal, setBackendTotalFinal] = useState(0);
  const [backendCuotaProyectada, setBackendCuotaProyectada] = useState(0);

  // Form state
  const [monto, setMonto] = useState(0);
  const [tasaStr, setTasaStr] = useState('');
  const [cuotasStr, setCuotasStr] = useState('');
  const [plazoMeses, setPlazoMeses] = useState(0);  
  const [frecuencia, setFrecuencia] = useState('MENSUAL');
  const [estado, setEstado] = useState('ACTIVO');
  const [tipoAmortizacion, setTipoAmortizacion] = useState<TipoAmortizacion>(TipoAmortizacion.INTERES_SIMPLE);

  // Client info from backend
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteDni, setClienteDni] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [numeroPrestamo, setNumeroPrestamo] = useState('');
  const [tipoPrestamo, setTipoPrestamo] = useState('EFECTIVO');
  const [productoNombre, setProductoNombre] = useState('');
  
  // New editable fields
  const [cuotaInicial, setCuotaInicial] = useState(0);
  const [fechaInicio, setFechaInicio] = useState('');
  const [notas, setNotas] = useState('');
  const [garantia, setGarantia] = useState('');

  // Original values for comparison
  const originalRef = useRef<{ 
    monto: number, tasa: number, cuotas: number, frecuencia: string, estado: string,
    cuotaInicial: number, fechaInicio: string, notas: string, garantia: string, 
    tipoAmortizacion: TipoAmortizacion, plazoMeses: number
  }>({ 
    monto: 0, tasa: 0, cuotas: 0, frecuencia: 'MENSUAL', estado: 'ACTIVO',
    cuotaInicial: 0, fechaInicio: '', notas: '', garantia: '', 
    tipoAmortizacion: TipoAmortizacion.INTERES_SIMPLE, plazoMeses: 0
  });
  // Versión del préstamo al cargarlo, para el control de conflictos al guardar.
  const versionRef = useRef<number | undefined>(undefined);

  const tasa = Number(tasaStr) || 0;
  const cuotas = Number(cuotasStr) || 0;
  const [opcionesCuotas, setOpcionesCuotas] = useState<any[]>([]);
  const [planIndex, setPlanIndex] = useState<number | null>(null);
  const [autoCuotas, setAutoCuotas] = useState(true);

  const hasChanges = monto !== originalRef.current.monto 
    || tasa !== originalRef.current.tasa 
    || cuotas !== originalRef.current.cuotas 
    || frecuencia !== originalRef.current.frecuencia 
    || estado !== originalRef.current.estado
    || cuotaInicial !== originalRef.current.cuotaInicial
    || fechaInicio !== originalRef.current.fechaInicio
    || notas !== originalRef.current.notas
    || garantia !== originalRef.current.garantia
    || tipoAmortizacion !== originalRef.current.tipoAmortizacion
    || plazoMeses !== originalRef.current.plazoMeses;

  const isArticle = tipoPrestamo?.toUpperCase() === 'ARTICULO';
  const themeColor = isArticle ? 'orange' : 'blue';

  const previewAmortizacion = (!isArticle && hasChanges && tipoAmortizacion === TipoAmortizacion.FRANCESA)
    ? calcularAmortizacionPreview(monto, tasa, cuotas)
    : null;
    
  const previewInteresPlano = (!isArticle && hasChanges && tipoAmortizacion === TipoAmortizacion.INTERES_PLANO)
    ? calcularInteresPlanoPreview(monto, tasa, cuotas)
    : null;

  // Computed preview (si no hay cambios, usar backend para que coincida con el detalle)
  const interesTotal = hasChanges
    ? (isArticle
      ? 0
      : (tipoAmortizacion === TipoAmortizacion.FRANCESA
        ? Number(previewAmortizacion?.interesTotal || 0)
        : tipoAmortizacion === TipoAmortizacion.INTERES_PLANO
        ? Number(previewInteresPlano?.interesTotal || 0)
        // Interés simple truncado (Math.trunc), igual que el backend.
        : Math.trunc((monto * tasa * Math.max(1, plazoMeses || 0)) / 100)))
    : backendInteresTotal;

  const totalRecaudar = hasChanges
    ? (isArticle
      ? monto
      : (tipoAmortizacion === TipoAmortizacion.FRANCESA
        ? Number(previewAmortizacion?.total || 0)
        : tipoAmortizacion === TipoAmortizacion.INTERES_PLANO
        ? Number(previewInteresPlano?.total || 0)
        : monto + interesTotal))
    : backendTotalFinal;

  const cobroPorCuota = hasChanges
    ? (tipoAmortizacion === TipoAmortizacion.FRANCESA
      ? Number(previewAmortizacion?.cuotaFija || 0)
      : tipoAmortizacion === TipoAmortizacion.INTERES_PLANO
      ? Number(previewInteresPlano?.cuotaFija || 0)
      : (cuotas > 0 ? totalRecaudar / cuotas : 0))
    : backendCuotaProyectada;

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
        versionRef.current = (data as any)?.version;
        const cuotasData = await prestamosService.obtenerCuotas(id).catch(() => []);
        const m = Number(data.monto) || 0;
        const t = Number(data.tasaInteres) || 0;
        const c = Number(data.cantidadCuotas) || 0;
        const p = Number(data.plazoMeses) || 0;
        const f = data.frecuenciaPago || 'MENSUAL';
        const e = data.estado || 'ACTIVO';
        const ci = Number(data.cuotaInicial || 0);
        const fi = data.fechaInicio ? normalizeDateKey(data.fechaInicio) : '';
        const n = data.notas || '';
        const g = data.garantia || '';
        const ta = (data.tipoAmortizacion || TipoAmortizacion.INTERES_SIMPLE) as TipoAmortizacion;

        const interesBackend = Number(data.interesTotal || 0);
        setBackendInteresTotal(interesBackend);
        setBackendTotalFinal(((data.tipoPrestamo || '').toUpperCase() === 'ARTICULO') ? (m + ci) : (m + interesBackend));
        const primeraCuota = Array.isArray(cuotasData) && cuotasData.length > 0 ? Number(cuotasData[0].monto || 0) : 0;
        setBackendCuotaProyectada(primeraCuota);

        setMonto(m); setTasaStr(String(t)); setCuotasStr(String(c)); setPlazoMeses(p);
        setFrecuencia(f); setEstado(e); setTipoAmortizacion(ta);
        setCuotaInicial(ci); setFechaInicio(fi); setNotas(n); setGarantia(g);
        setTipoPrestamo(data.tipoPrestamo || 'EFECTIVO');
        setProductoNombre(data.producto?.nombre || '');
        setNumeroPrestamo(data.numeroPrestamo || id);
        setClienteNombre(data.cliente ? `${data.cliente.nombres || ''} ${data.cliente.apellidos || ''}`.trim() : '');
        setClienteDni(data.cliente?.dni || '');
        setClienteTelefono(data.cliente?.telefono || '');
        const isArticleNext = (data.tipoPrestamo || '').toUpperCase() === 'ARTICULO';
        setAutoCuotas(isArticleNext);
        if (data.producto?.id) {
          const art = await articulosService.obtenerArticuloPorId(String(data.producto.id));
          const ops = art?.opcionesCuotas || [];
          setOpcionesCuotas(ops);
          const idx = ops.findIndex((op: any) => Number(op.numeroCuotas) === Number(p));
          setPlanIndex(idx >= 0 ? idx : null);
        }
        
        originalRef.current = { 
          monto: m, tasa: t, cuotas: c, frecuencia: f, estado: e,
          cuotaInicial: ci, fechaInicio: fi, notas: n, garantia: g,
          tipoAmortizacion: ta, plazoMeses: p
        };
      } catch (err) {
        console.error('Error cargando préstamo para editar:', err);
        showNotification('error', 'No se pudo cargar el préstamo', 'Error');
      } finally {
        setFetching(false);
      }
    };
    fetchLoan();
  }, [id]);

  useEffect(() => {
    if (!isArticle) return;
    const meses = Number(plazoMeses || 0);
    const f = frecuencia;
    let c = 0;
    if (meses > 0) {
      if (f === 'DIARIO') c = meses * 30;
      else if (f === 'SEMANAL') c = meses * 4;
      else if (f === 'QUINCENAL') c = meses * 2;
      else if (f === 'MENSUAL') c = meses;
      else c = meses * 4;
    }
    if (c > 0 && autoCuotas && c !== cuotas) setCuotasStr(String(c));
  }, [plazoMeses, frecuencia, isArticle, autoCuotas, cuotas]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const payload: any = {};

      if (monto !== originalRef.current.monto) payload.monto = monto;
      if (tasa !== originalRef.current.tasa) payload.tasaInteres = tasa;
      if (cuotas !== originalRef.current.cuotas) payload.cantidadCuotas = cuotas;
      if (frecuencia !== originalRef.current.frecuencia) payload.frecuenciaPago = frecuencia;
      if (estado !== originalRef.current.estado) payload.estado = estado;
      if (cuotaInicial !== originalRef.current.cuotaInicial) payload.cuotaInicial = cuotaInicial;
      if (fechaInicio !== originalRef.current.fechaInicio) payload.fechaInicio = fechaInicio;
      if (notas !== originalRef.current.notas) payload.notas = notas;
      if (garantia !== originalRef.current.garantia) payload.garantia = garantia;
      if (tipoAmortizacion !== originalRef.current.tipoAmortizacion) payload.tipoAmortizacion = tipoAmortizacion;
      if (plazoMeses !== originalRef.current.plazoMeses) payload.plazoMeses = plazoMeses;

      // Control de conflictos: mandamos la versión cargada. Si el servidor tiene
      // una más nueva (otro editó / edición offline desincronizada), el backend
      // rechaza como conflicto (409) en vez de sobrescribir en silencio.
      if (versionRef.current != null) payload.version = versionRef.current;

      await prestamosService.actualizarPrestamo(id, payload as any);
      showNotification('success', 'El crédito ha sido actualizado correctamente', 'Éxito');
      
      // Intentar descargar contrato si es artículo a cuotas tras la edición
      if (isArticle) {
        try {
          // Re-importar exportService si no está disponible o usar el importado
          const { exportService } = await import('@/services/export-service');
          await exportService.exportContrato(id);
        } catch (err) {
          console.error('Error al descargar contrato tras edición:', err);
        }
      }

      try {
        refreshNotificaciones();
      } catch {}
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
      case 'PENDIENTE':
      case 'PENDIENTE_APROBACION':
        return 'bg-amber-100 text-amber-900 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.3)] ring-2 ring-amber-200 animate-pulse';
      case 'PAGADO': return 'bg-blue-100/50 text-blue-700 border-blue-200';
      case 'EN_MORA': return 'bg-rose-100/50 text-rose-700 border-rose-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200 motion-reduce:animate-none" onClick={handleClose}>
      <div
        className={`flex flex-col bg-white shadow-2xl w-full overflow-hidden border border-slate-200 transition-all duration-300 h-[100dvh] sm:h-auto sm:max-h-[92vh] rounded-none sm:rounded-2xl sm:max-w-3xl ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: mismo estilo claro que el modal de usuario — icono en
            recuadro, título grande bicolor y subtítulo legible. */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-6 py-5 md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className={`shrink-0 rounded-xl p-2.5 ${isArticle ? 'bg-orange-50 text-orange-500' : 'bg-blue-50 text-blue-600'}`}>
              {isArticle ? <Package className="h-6 w-6" /> : <Edit3 className="h-6 w-6" />}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-xl font-bold tracking-tight md:text-2xl">
                <span className="text-blue-600">Editar </span>
                <span className="text-orange-500">{isArticle ? 'Crédito de Artículo' : 'Préstamo'}</span>
              </h2>
              <p className="truncate text-xs font-medium text-slate-500">{numeroPrestamo || id}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className={`rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                isEditing
                  ? 'bg-slate-900 text-white shadow-lg'
                  : `bg-white border text-${themeColor}-600 border-${themeColor}-200 hover:bg-${themeColor}-50`
              }`}
            >
              {isEditing ? (
                <span className="flex items-center gap-1.5"><Lock className="h-3 w-3" /> Bloquear</span>
              ) : (
                <span className="flex items-center gap-1.5"><Edit3 className="h-3 w-3" /> Habilitar edición</span>
              )}
            </button>
            <button type="button" onClick={handleClose} aria-label="Cerrar" className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-white/50">
          {fetching ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className={`w-8 h-8 text-${themeColor}-600 animate-spin`} />
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Sincronizando datos...</p>
            </div>
          ) : (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* LEFT COLUMN: Cliente + Estado + Resumen */}
            <div className="space-y-6">
              {/* Bloque Cliente */}
              <div className="p-5 rounded-3xl border bg-white border-slate-100 shadow-sm relative overflow-hidden group">
                <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-[0.03] transition-transform duration-700 group-hover:scale-150 ${isArticle ? 'bg-orange-500' : 'bg-blue-500'}`}></div>
                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 mb-4 flex items-center gap-2">
                  <User className={`w-3 h-3 ${isArticle ? 'text-orange-500' : 'text-blue-500'}`} />
                  Titular del Crédito
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="text-[8px] text-slate-400 uppercase font-black tracking-widest block mb-1">Nombre Completo</label>
                    <p className="text-sm font-black text-slate-900 leading-none">{clienteNombre || '—'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[8px] text-slate-400 uppercase font-black tracking-widest block mb-1">Cédula</label>
                      <p className="text-[11px] font-bold text-slate-700">{clienteDni || '—'}</p>
                    </div>
                    <div>
                      <label className="text-[8px] text-slate-400 uppercase font-black tracking-widest block mb-1">Contacto</label>
                      <p className="text-[11px] font-bold text-slate-700">{clienteTelefono || '—'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Estado Block */}
              <div className={`p-5 rounded-3xl border transition-all duration-300 ${isEditing ? 'bg-white border-orange-200 shadow-xl' : 'bg-white border-slate-100 shadow-sm'}`}>
                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 mb-4 flex items-center gap-2">
                  <Clock className={`w-3 h-3 ${isArticle ? 'text-orange-500' : 'text-blue-500'}`} />
                  Estado del Crédito
                </p>
                {isEditing ? (
                  <div className="grid grid-cols-2 gap-2">
                    {['ACTIVO', 'PENDIENTE_APROBACION'].map((e) => (
                      <button
                        key={e}
                        onClick={() => setEstado(e)}
                        className={`py-2 px-3 rounded-2xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                          estado === e || (estado === 'PENDIENTE' && e === 'PENDIENTE_APROBACION')
                            ? `${getEstadoColor(e)} shadow-md ring-2 ring-slate-100`
                            : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-white hover:border-slate-200'
                        }`}
                      >
                        {e === 'PENDIENTE_APROBACION' ? 'PENDIENTE' : e}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border ${getEstadoColor(estado)}`}>
                      {estado === 'PENDIENTE_APROBACION' ? 'Pendiente de Aprobación' : estado.replace(/_/g, ' ')}
                    </span>
                  </div>
                )}
              </div>

               {/* Resumen Proyectado (Nueva Ubicación) */}
               <div className={`p-5 rounded-[2rem] border-2 border-dashed shadow-inner ${isArticle ? 'bg-orange-50/50 border-orange-100' : 'bg-emerald-50/50 border-emerald-100'}`}>
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-start border-b border-black/5 pb-3">
                    <div className="space-y-1 min-w-0 flex-1">
                      <label className={`text-[8px] font-black uppercase tracking-[0.2em] ${isArticle ? 'text-orange-400' : 'text-emerald-500'}`}>Cuota Proyectada</label>
                      <p className={`text-xl font-black tabular-nums leading-none truncate ${isArticle ? 'text-orange-900' : 'text-emerald-900'}`}>{formatCurrency(cobroPorCuota)}</p>
                      <p className={`text-[8px] font-bold uppercase tracking-widest mt-1 ${isArticle ? 'text-orange-600' : 'text-emerald-600'}`}>
                        Frecuencia {frecuencia.toLowerCase()}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <label className={`text-[8px] font-black uppercase tracking-[0.2em] ${isArticle ? 'text-orange-400' : 'text-emerald-500'}`}>{isArticle ? 'Total a Financiar' : 'Total al Finalizar'}</label>
                    <p className={`text-xl font-black tabular-nums leading-none truncate ${isArticle ? 'text-orange-900' : 'text-emerald-900'}`}>{formatCurrency(isArticle ? (totalRecaudar - cuotaInicial) : totalRecaudar)}</p>
                    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full mt-1.5 ${isArticle ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      <div className="w-1 h-1 rounded-full bg-current animate-pulse"></div>
                      <span className="text-[9px] font-black uppercase whitespace-nowrap">{isArticle ? `Financiando con ${formatCurrency(cuotaInicial)} inicial` : `Gana +${formatCurrency(interesTotal)}`}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Changes indicator */}
              {hasChanges && (
                <div className={`p-4 rounded-2xl border-2 border-dashed flex items-center justify-center gap-3 animate-pulse ${isArticle ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'}`}>
                  <div className={`w-2 h-2 rounded-full ${isArticle ? 'bg-orange-500' : 'bg-blue-600'}`}></div>
                  <p className={`text-[10px] font-black uppercase tracking-widest ${isArticle ? 'text-orange-700' : 'text-blue-700'}`}>
                    Cambios Pendientes
                  </p>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: Financial Block */}
            <div className="space-y-6">
              <div className={`p-5 rounded-3xl border transition-all duration-300 ${isEditing ? 'bg-white border-blue-200 shadow-xl' : 'bg-white border-slate-100 shadow-sm'}`}>
                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 mb-4 flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full flex items-center justify-center text-[8px] text-white ${isArticle ? 'bg-orange-500' : 'bg-blue-600'}`}>$</span>
                  Parámetros del Crédito
                </p>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className={`text-[8px] font-black uppercase tracking-widest block ${isArticle ? 'text-orange-500' : 'text-blue-600'}`}>Capital</label>
                    {isEditing ? (
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                        <input
                          type="text"
                          value={formatCOPInput(monto)}
                          onChange={(e) => setMonto(parseCOP(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-100 text-slate-900 rounded-2xl pl-7 pr-4 py-3 text-lg font-black outline-none focus:ring-2 focus:ring-blue-500/10 focus:bg-white transition-all shadow-inner"
                        />
                      </div>
                    ) : (
                      <p className="text-3xl font-black text-slate-900 tabular-nums tracking-tighter leading-none">{formatCurrency(monto)}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[8px] text-slate-400 font-black uppercase tracking-widest block">N° de Cuotas</label>
                      {isEditing ? (
                        <input
                          type="text"
                          inputMode="numeric"
                          value={cuotasStr}
                          onChange={(e) => {
                            setCuotasStr(e.target.value.replace(/[^0-9]/g, ''));
                            setAutoCuotas(false);
                          }}
                          className="w-full bg-slate-50 border border-slate-100 text-slate-900 rounded-2xl px-4 py-2.5 text-base font-black outline-none focus:ring-2 focus:ring-blue-500/10 focus:bg-white"
                        />
                      ) : (
                        <p className="text-lg font-black text-slate-900">{cuotas} <span className="text-[10px] text-slate-400 font-bold">CUOTAS</span></p>
                      )}
                    </div>
                    {!isArticle && (
                      <div className="space-y-1">
                        <label className="text-[8px] text-slate-400 font-black uppercase tracking-widest block">Tasa Interés (%)</label>
                        {isEditing ? (
                          <div className="relative">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={tasaStr}
                              onChange={(e) => setTasaStr(e.target.value.replace(/[^0-9.]/g, ''))}
                              className="w-full bg-slate-50 border border-slate-100 text-slate-900 rounded-2xl px-4 py-2.5 text-base font-black outline-none focus:ring-2 focus:ring-blue-500/10 focus:bg-white"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                          </div>
                        ) : (
                          <p className="text-lg font-black text-slate-900">{tasa}%</p>
                        )}
                      </div>
                    )}
                  </div>

                  {!isArticle && (
                    <div className="space-y-1">
                      <label className="text-[8px] text-slate-400 font-black uppercase tracking-widest block">Tipo de Interés</label>
                      {isEditing ? (
                        <select
                          value={tipoAmortizacion}
                          onChange={(e) => setTipoAmortizacion(e.target.value as TipoAmortizacion)}
                          className="w-full bg-slate-50 border border-slate-100 text-slate-900 rounded-2xl px-4 py-2.5 text-base font-black outline-none focus:ring-2 focus:ring-blue-500/10 focus:bg-white"
                        >
                          <option value={TipoAmortizacion.INTERES_SIMPLE}>Interés Simple</option>
                          <option value={TipoAmortizacion.INTERES_PLANO}>Amortización (cuota fija)</option>
                          <option value={TipoAmortizacion.FRANCESA}>Amortización Francesa (Histórico)</option>
                        </select>
                      ) : (
                        <p className="text-sm font-black text-slate-900">
                          {tipoAmortizacion === TipoAmortizacion.FRANCESA
                            ? 'Amortización Francesa (Histórico)'
                            : tipoAmortizacion === TipoAmortizacion.INTERES_PLANO
                            ? 'Amortización (cuota fija)'
                            : 'Interés Simple'}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[8px] text-slate-400 font-black uppercase tracking-widest block">Plazo Total (Meses)</label>
                    {isEditing ? (
                      isArticle && opcionesCuotas.length > 0 ? (
                        <select
                          value={planIndex !== null ? planIndex : ''}
                          onChange={(e) => {
                            const idx = e.target.value ? parseInt(e.target.value) : null;
                            setPlanIndex(idx);
                            if (idx !== null) {
                              const op = opcionesCuotas[idx];
                              const meses = Number(op.numeroCuotas);
                              const precioTotal = Number(op.precioTotal);
                              setPlazoMeses(meses);
                              setMonto(Math.max(0, precioTotal - cuotaInicial));
                              setAutoCuotas(true);
                            }
                          }}
                          className="w-full bg-slate-50 border border-slate-100 text-slate-900 rounded-2xl px-4 py-2.5 text-base font-black outline-none focus:ring-2 focus:ring-blue-500/10 focus:bg-white"
                        >
                          <option value="">Seleccionar plazo...</option>
                          {opcionesCuotas.map((op: any, i: number) => {
                            const meses = Number(op.numeroCuotas);
                            if (isNaN(meses)) return null;
                            return (
                              <option key={i} value={i}>
                                {meses} {meses === 1 ? 'Mes' : 'Meses'} - Total: {formatCurrency(op.precioTotal)}
                              </option>
                            );
                          })}
                        </select>
                      ) : (
                        <input
                          type="number"
                          min="1"
                          value={plazoMeses}
                          onChange={(e) => setPlazoMeses(Math.max(1, parseInt(e.target.value) || 0))}
                          className="w-full bg-slate-50 border border-slate-100 text-slate-900 rounded-2xl px-4 py-2.5 text-base font-black outline-none focus:ring-2 focus:ring-blue-500/10 focus:bg-white"
                        />
                      )
                    ) : (
                      <p className="text-lg font-black text-slate-900">
                        {formatLoanTerm({
                          plazoMeses,
                          cantidadCuotas: cuotas,
                          frecuenciaPago: frecuencia,
                        })}
                      </p>
                    )}
                  </div>

                  {/* Sistema Amortización removido por requerimiento */}

                  <div className="space-y-1">
                    <label className="text-[8px] text-slate-400 font-black uppercase tracking-widest block">Frecuencia de Pago</label>
                    {isEditing ? (
                      <select
                        value={frecuencia}
                        onChange={(e) => { setFrecuencia(e.target.value); setAutoCuotas(true); }}
                        className="w-full bg-slate-50 border border-slate-100 text-slate-900 rounded-2xl px-4 py-2.5 text-xs font-black outline-none focus:ring-2 focus:ring-blue-500/10 focus:bg-white"
                      >
                        <option value="DIARIO">DIARIO</option>
                        <option value="SEMANAL">SEMANAL</option>
                        <option value="QUINCENAL">QUINCENAL</option>
                        <option value="MENSUAL">MENSUAL</option>
                      </select>
                    ) : (
                      <p className="text-xs font-black text-blue-600 uppercase tracking-wider">{frecuencia}</p>
                    )}
                  </div>

                  {isArticle && (
                    <div className="p-4 bg-orange-50/50 rounded-2xl border border-orange-100 space-y-3">
                      <div className="flex items-center gap-2 mb-1">
                         <Package className="w-3 h-3 text-orange-500" />
                         <span className="text-[9px] font-black text-orange-600 uppercase">Detalles de Venta</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[7px] text-orange-400 uppercase font-black block">Cuota Inicial</label>
                          {isEditing ? (
                            <input
                              type="text"
                              value={formatCOPInput(cuotaInicial)}
                              onChange={(e) => setCuotaInicial(parseCOP(e.target.value))}
                              className="w-full bg-white border border-orange-200 text-slate-900 rounded-xl px-3 py-1.5 text-xs font-black outline-none focus:ring-1 focus:ring-orange-400"
                            />
                          ) : (
                            <p className="text-[13px] font-black text-slate-900">{formatCurrency(cuotaInicial)}</p>
                          )}
                        </div>
                        <div>
                          <label className="text-[7px] text-orange-400 uppercase font-black block">Artículo / Combo</label>
                          <p className="text-[11px] font-bold text-orange-700 uppercase leading-tight mt-1">{productoNombre || 'ARTÍCULO SIN NOMBRE'}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-100">
                    <div className="space-y-1">
                      <label className="text-[8px] text-slate-400 font-black uppercase tracking-widest block">Fecha Inicio</label>
                      <input
                        type="date"
                        value={fechaInicio}
                        readOnly
                        className="w-full bg-slate-100 border border-slate-200 text-slate-500 rounded-2xl px-3 py-2 text-xs font-black outline-none cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[8px] text-slate-400 font-black uppercase tracking-widest block">Notas / Observaciones</label>
                    {isEditing ? (
                      <textarea
                        value={notas}
                        onChange={(e) => setNotas(e.target.value)}
                        rows={2}
                        className="w-full bg-slate-50 border border-slate-100 text-slate-900 rounded-2xl p-4 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500/10 focus:bg-white resize-none"
                        placeholder="Sin notas registradas..."
                      />
                    ) : (
                      <p className="text-[10px] text-slate-500 font-medium italic bg-slate-50 p-3 rounded-2xl">{notas || 'Sin notas.'}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-5 bg-white border-t border-slate-100 flex gap-4">
          <button
            onClick={handleClose}
            className="flex-1 py-3.5 bg-slate-50 text-slate-500 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-slate-100 transition-all border border-slate-100 active:scale-95"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !hasChanges}
            className={`flex-[2] py-3.5 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all shadow-xl flex items-center justify-center gap-2 active:scale-95 disabled:opacity-30 disabled:grayscale disabled:scale-100 ${
              isArticle 
                ? 'bg-gradient-to-r from-orange-500 to-orange-600 shadow-orange-500/20' 
                : 'bg-gradient-to-r from-blue-600 to-indigo-700 shadow-blue-500/20'
            }`}
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {loading ? 'Actualizando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
