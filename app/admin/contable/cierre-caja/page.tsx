'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { logger } from '@/lib/logger'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, AlertCircle, Calculator, Wallet, Receipt, Eye } from 'lucide-react'
import { formatCOPInputValue, formatCurrency, parseCOPInputToNumber, cn } from '@/lib/utils'
import MoneyAmount from '@/components/contable/MoneyAmount'
import { getResumenFinanciero, getHistorialCierres, getHistorialCierresFiltrado, getCajas, getMovimientosLedger, getArqueoPreview, confirmarArqueo, getArqueoById } from '@/services/contabilidad-service';
import { Portal, MODAL_Z_INDEX } from '@/components/dashboards/shared/CobradorElements'
import { getBogotaDateKey } from '@/lib/rutas-core'
import { getEntradaCajaFisica, getSalidaCajaFisica } from '@/lib/contabilidad-clasificacion'
import { useRealtimeData } from '@/hooks/useRealtimeData'

const parseSaldoCaja = (raw: any): number => {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0
  if (typeof raw === 'string') {
    const cleaned = raw.replace(/[\s.,$]/g, '')
    const n = Number(cleaned)
    return Number.isFinite(n) ? n : 0
  }
  const n = Number(raw)
  return Number.isFinite(n) ? n : 0
}

const getNombreUsuario = (usuario: any) => {
  if (!usuario) return '—'
  if (typeof usuario === 'string') return usuario
  return `${usuario.nombres ?? ''} ${usuario.apellidos ?? ''}`.trim() || '—'
}

// Helper to get principal caja (strict, no Oficina fallback)
const getCajaPrincipal = (cajas: any[]) => {
  if (!Array.isArray(cajas)) return null;

  return (
    cajas.find(
      (c: any) => 
        String(c?.codigo || '').trim().toUpperCase() === 'CAJA-PRINCIPAL'
    ) || 
    cajas.find(
      (c: any) => 
        String(c?.nombre || '').trim().toUpperCase() === 'CAJA PRINCIPAL'
    ) || 
    cajas.find(
      (c: any) => 
        String(c?.tipo || '').trim().toUpperCase() === 'PRINCIPAL' && 
        String(c?.nombre || '').trim().toUpperCase() !== 'CAJA BANCO' && 
        String(c?.nombre || '').trim().toUpperCase() !== 'CAJA DE OFICINA'
    ) || 
    null
  );
};

// Helper to get saldo from various fields using parseSaldoCaja
const getSaldoCaja = (caja: any) => {
  if (!caja) return 0;

  const raw = 
    caja.saldoActual ??
    caja.saldo ??
    caja.saldoCaja ??
    caja.balance ??
    caja.monto ??
    caja.total ??
    0;

  return parseSaldoCaja(raw);
};

export default function CierreCajaPage() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  // Datos se obtienen de resumen y de la caja principal real
  const [form, setForm] = useState({
    fechaOperativa: getBogotaDateKey(new Date()),
    efectivoContado: '',
    observaciones: 'Cierre normal sin novedades.'
  })
  const [resumen, setResumen] = useState<any | null>(null)
  const [ultimoCierre, setUltimoCierre] = useState<any | null>(null)
  const [cierres, setCierres] = useState<any[]>([])
  const [showHistorialModal, setShowHistorialModal] = useState(false)
  const [selectedCierre, setSelectedCierre] = useState<any | null>(null)
  const [cargando, setCargando] = useState(false)
  const [principalCaja, setPrincipalCaja] = useState<any | null>(null)
  const [rutaCajas, setRutaCajas] = useState<any[]>([])
  const [selectedRutaCaja, setSelectedRutaCaja] = useState<any | null>(null)
  const [arqueoPreview, setArqueoPreview] = useState<any | null>(null)
  const [arqueoResult, setArqueoResult] = useState<any | null>(null)
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'ARQUEO' | 'CONSOLIDACION'>('TODOS')
  const [soloRutas, setSoloRutas] = useState<boolean>(false)
  const [estadoFiltro, setEstadoFiltro] = useState<'TODOS' | 'CUADRADA' | 'DESCUADRADA'>('TODOS')
  const [fechaInicio, setFechaInicio] = useState<string>('')
  const [fechaFin, setFechaFin] = useState<string>('')
  const stats = useMemo(() => {
    const total = cierres.length
    let cuadradas = 0
    let descuadradas = 0
    cierres.forEach((c: any) => {
      if (String(c.estado) === 'DESCUADRADA') descuadradas++
      else cuadradas++
    })
    return { total, cuadradas, descuadradas }
  }, [cierres])
  const [showDetalleCierreModal, setShowDetalleCierreModal] = useState(false)
  const [ingresosHoyCalc, setIngresosHoyCalc] = useState<number | null>(null)
  const [egresosHoyCalc, setEgresosHoyCalc] = useState<number | null>(null)

  const loadCierreCaja = useCallback(async () => {
    try {
      setCargando(true)
      const hoyKey = getBogotaDateKey(new Date())
      
      const [res, cierresResp, cajasResp] = await Promise.all([
        getResumenFinanciero(),
        getHistorialCierres(),
        getCajas(),
      ])
      setResumen(res)

      const list = Array.isArray(cierresResp) ? cierresResp : []
      setCierres(list)
      setUltimoCierre(list.length ? list[0] : null)
      // Load cajas with support for different response structures (with type assertions)
      const cajasRespAny = cajasResp as any
      const cajasList = Array.isArray(cajasRespAny)
        ? cajasRespAny
        : Array.isArray(cajasRespAny?.data)
          ? cajasRespAny.data
          : Array.isArray(cajasRespAny?.cajas)
            ? cajasRespAny.cajas
            : []

      // Strict selection of principal caja (no fallback to Oficina)
      const principal = getCajaPrincipal(cajasList)
      setPrincipalCaja(principal)
      
      const rutas = cajasList.filter((c: any) => String(c?.tipo || '').trim().toUpperCase() === 'RUTA')
      setRutaCajas(rutas)
      
      // Detailed debug: log all caja fields (only in dev)
      if (process.env.NODE_ENV === 'development') {
        logger.log('[loadCierreCaja] Starting load...')
        logger.log('[loadCierreCaja] Fetched data:', { res, cierresResp, cajasResp })
        console.table(cajasList.map((c: any) => ({
          id: c.id,
          nombre: c.nombre,
          tipo: c.tipo,
          saldoActual: c.saldoActual,
          saldo: c.saldo,
          balance: c.balance,
          monto: c.monto,
        })))
        logger.log('[loadCierreCaja] Selected principal caja:', principal)
        logger.log('[loadCierreCaja] Ruta cajas:', rutas)
      }

      if (principal?.id) {
        const movimientosCaja = await getMovimientosLedger({
          cajaId: principal.id,
          fechaInicio: hoyKey,
          fechaFin: hoyKey,
          limit: 1000,
        })
        const data = Array.isArray(movimientosCaja?.data) ? movimientosCaja.data : []
        setIngresosHoyCalc(data.reduce((acc: number, m: any) => acc + getEntradaCajaFisica(m), 0))
        setEgresosHoyCalc(data.reduce((acc: number, m: any) => acc + getSalidaCajaFisica(m), 0))
      } else {
        setIngresosHoyCalc(0)
        setEgresosHoyCalc(0)
      }
    } finally {
      setCargando(false)
    }
  }, [])

  const selectRutaCaja = useCallback(async (caja: any) => {
    setSelectedRutaCaja(caja)
    setForm((prev) => ({
      ...prev,
      efectivoContado: '',
    }))
    setArqueoPreview(null)
    try {
      const preview = await getArqueoPreview(caja.id, form.fechaOperativa)
      setArqueoPreview(preview)
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[selectRutaCaja] Error loading arqueo preview:', e)
      }
      setArqueoPreview(null)
    }
  }, [form.fechaOperativa])

  useEffect(() => {
    loadCierreCaja()
  }, [loadCierreCaja])

  useRealtimeData(['dashboards_actualizados', 'pagos_actualizados', 'prestamos_actualizados', 'rutas_actualizadas'], loadCierreCaja)
  
  const rutasPendientesCount = useMemo(() => {
    return rutaCajas.filter((caja: any) => getSaldoCaja(caja) > 0).length
  }, [rutaCajas])

  useEffect(() => {
    if (!showHistorialModal) return
    const fetchFilter = async () => {
      const data = await getHistorialCierresFiltrado({
        tipo: filtroTipo === 'TODOS' ? undefined : filtroTipo,
        soloRutas,
        estado: estadoFiltro === 'TODOS' ? undefined : estadoFiltro,
        fechaInicio: fechaInicio || undefined,
        fechaFin: fechaFin || undefined
      })
      setCierres(Array.isArray(data) ? data : [])
      setSelectedCierre(null)
    }
    fetchFilter()
  }, [showHistorialModal, filtroTipo, soloRutas, estadoFiltro, fechaInicio, fechaFin])

  const saldoSistema = useMemo(() => {
    const caja: any = selectedRutaCaja as any
    const rawSaldo = arqueoPreview?.saldoEsperado ?? caja?.saldo ?? caja?.saldoActual ?? caja?.saldoCaja ?? caja?.cajaSaldo
    return parseSaldoCaja(rawSaldo)
  }, [selectedRutaCaja, arqueoPreview])

  const real = form.efectivoContado ? parseCOPInputToNumber(form.efectivoContado) : 0
  const diferencia = form.efectivoContado
    ? parseCOPInputToNumber(form.efectivoContado) - saldoSistema
    : 0
  const ingresosHoy = useMemo(() => ingresosHoyCalc ?? (resumen ? resumen.ingresosHoy : 0), [ingresosHoyCalc, resumen])
  const egresosHoy = useMemo(() => egresosHoyCalc ?? (resumen ? resumen.egresosHoy : 0), [egresosHoyCalc, resumen])

  const formatTipoDiferencia = (tipo?: string) => {
    switch (tipo) {
      case 'SIN_DIFERENCIA':
        return 'Sin diferencia'
      case 'FALTANTE':
        return 'Faltante'
      case 'SOBRANTE':
        return 'Sobrante'
      default:
        return '—'
    }
  };

  const handleImprimirComprobante = async (arqueo?: any) => {
    let data = arqueo ?? arqueoResult;
    if (!data) return;

    // If we're using an item from the historial and it doesn't have full fields, fetch it by ID
    if (arqueo && !arqueo.cajaOrigen && arqueo.id) {
      try {
        const fullArqueo = await getArqueoById(arqueo.id);
        if (fullArqueo) {
          data = fullArqueo;
        }
      } catch (err) {
        console.error('Failed to fetch full arqueo for printing:', err);
      }
    }

    const responsable = getNombreUsuario(data.responsable);
    const creadoPor = getNombreUsuario(data.creadoPor);
    const recibidoPor = getNombreUsuario(data.recibidoPor);

    // Get full URL for logo to fix loading in new window
    const logoUrl = `${window.location.origin}/logo.png`;

    // Unique document name
    const codigoComprobante =
      data.numeroComprobanteTraslado ??
      `ARQ-${new Date().getTime()}`;
    const nombreDocumento = `arqueo-${codigoComprobante}`
      .toLowerCase()
      .replace(/\s+/g, '-');

    // Status badge class
    const getBadgeClass = (tipo: string) => {
      switch (tipo) {
        case 'SIN_DIFERENCIA':
          return 'sin_diferencia';
        case 'FALTANTE':
          return 'faltante';
        case 'SOBRANTE':
          return 'sobrante';
        default:
          return '';
      }
    };

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${nombreDocumento}</title>
          <style>
            @page {
              size: letter;
              margin: 8mm;
            }

            * {
              box-sizing: border-box;
            }

            body {
              font-family: Arial, sans-serif;
              color: #0f172a;
              margin: 0;
              padding: 0;
              background: #ffffff;
              font-size: 10.5px;
              line-height: 1.25;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            .comprobante {
              width: 100%;
              max-width: 100%;
              margin: 0 auto;
              position: relative;
              border: 1px solid #e2e8f0;
              border-radius: 18px;
              padding: 12px;
              background: #ffffff;
              page-break-inside: avoid;
              break-inside: avoid;
            }

            .watermark {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: 450px;
              height: 450px;
              opacity: 0.06;
              pointer-events: none;
              z-index: 0;
              background-image: url('${logoUrl}');
              background-size: contain;
              background-position: center;
              background-repeat: no-repeat;
            }

            .content {
              position: relative;
              z-index: 1;
            }

            .header {
              border-radius: 16px;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              padding: 12px;
              margin-bottom: 10px;
            }

            .brand-row {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 10px;
            }

            .brand {
              font-size: 16px;
              font-weight: 800;
              color: #0f172a;
            }

            .subtitle {
              font-size: 9.5px;
              color: #64748b;
              margin-top: 1px;
            }

            .code-pill {
              border-radius: 999px;
              background: #dbeafe;
              color: #1d4ed8;
              font-size: 9.5px;
              font-weight: 800;
              padding: 5px 8px;
              white-space: nowrap;
            }

            .main-title {
              font-size: 14px;
              font-weight: 800;
              margin-top: 8px;
            }

            .flow {
              margin-top: 8px;
              border-radius: 12px;
              background: #ffffff;
              border: 1px solid #e2e8f0;
              padding: 7px 10px;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
              font-size: 10.5px;
              font-weight: 700;
              color: #334155;
            }

            .flow strong {
              color: #2563eb;
              font-size: 14px;
            }

            .section {
              margin-bottom: 8px;
              page-break-inside: avoid;
              break-inside: avoid;
            }

            .section-title {
              font-size: 9.5px;
              font-weight: 800;
              color: #475569;
              text-transform: uppercase;
              letter-spacing: 0.06em;
              margin-bottom: 5px;
            }

            .grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 6px;
            }

            .grid-2 {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 6px;
            }

            .grid-full {
              grid-template-columns: 1fr;
            }

            .item {
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 7px 8px;
              background: #f8fafc;
              page-break-inside: avoid;
              break-inside: avoid;
            }

            .item.highlight {
              background: #eff6ff;
              border-color: #bfdbfe;
            }

            .label {
              font-size: 8px;
              color: #64748b;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.04em;
              margin-bottom: 2px;
            }

            .value {
              font-size: 10.5px;
              font-weight: 800;
              color: #0f172a;
              word-break: break-word;
            }

            .amount {
              font-size: 13px;
            }

            .status-badge {
              display: inline-flex;
              align-items: center;
              border-radius: 999px;
              padding: 4px 8px;
              font-size: 9.5px;
              font-weight: 800;
            }

            .status-badge.sin_diferencia {
              background: #dcfce7;
              color: #166534;
            }

            .status-badge.faltante {
              background: #fee2e2;
              color: #991b1b;
            }

            .status-badge.sobrante {
              background: #fef3c7;
              color: #92400e;
            }

            .footer {
              margin-top: 8px;
              border-radius: 12px;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              padding: 7px 10px;
              font-size: 8.8px;
              color: #64748b;
              text-align: center;
              page-break-inside: avoid;
              break-inside: avoid;
            }
          </style>
        </head>

        <body>
          <div class="comprobante">
            <div class="watermark"></div>
            <div class="content">
              <div class="header">
                <div class="brand-row">
                  <div>
                    <div class="brand">Créditos del Sur</div>
                    <div class="subtitle">Sistema CrediSur</div>
                  </div>
                  <div class="code-pill">${codigoComprobante}</div>
                </div>
                <div class="main-title">
                  Comprobante de Arqueo y Traslado de Efectivo
                </div>
                <div class="flow">
                  <span>${data.cajaOrigen?.nombre ?? 'Caja origen'}</span>
                  <strong>→</strong>
                  <span>${data.cajaDestino?.nombre ?? 'Caja Principal'}</span>
                </div>
              </div>

              <div class="section">
                <div class="section-title">Información general</div>
                <div class="grid">
                  <div class="item">
                    <div class="label">Fecha operativa</div>
                    <div class="value">${data.fechaOperativa ?? form.fechaOperativa}</div>
                  </div>
                  <div class="item">
                    <div class="label">Fecha de generación</div>
                    <div class="value">${new Date(data.creadoEn).toLocaleString('es-CO')}</div>
                  </div>
                  <div class="item highlight">
                    <div class="label">Estado</div>
                    <div class="value">Confirmado</div>
                  </div>
                </div>
                <div style="margin-top: 6px;">
                  <div class="item highlight">
                    <div class="label">Tipo de movimiento</div>
                    <div class="value">Arqueo con traslado a Caja Principal</div>
                  </div>
                </div>
              </div>

              <div class="section">
                <div class="section-title">Resumen del arqueo</div>
                <div class="grid">
                  <div class="item">
                    <div class="label">Resultado</div>
                    <div class="status-badge ${getBadgeClass(data.tipoDiferencia)}">
                      ${formatTipoDiferencia(data.tipoDiferencia)}
                    </div>
                  </div>
                  <div class="item">
                    <div class="label">Saldo esperado</div>
                    <div class="value amount">${formatCurrency(Number(data.saldoEsperado || 0))}</div>
                  </div>
                  <div class="item highlight">
                    <div class="label">Efectivo contado</div>
                    <div class="value amount">${formatCurrency(Number(data.efectivoContado || 0))}</div>
                  </div>
                </div>
                <div style="margin-top: 6px;">
                  <div class="grid">
                    <div class="item">
                      <div class="label">Diferencia</div>
                      <div class="value amount">${formatCurrency(Number(data.diferencia || 0))}</div>
                    </div>
                    <div class="item highlight">
                      <div class="label">Monto transferido</div>
                      <div class="value amount">${formatCurrency(Number(data.montoTransferido || 0))}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="grid-2">
                <div>
                  <div class="section-title">Caja origen</div>
                  <div class="item" style="margin-bottom: 6px;">
                    <div class="label">Nombre</div>
                    <div class="value">${data.cajaOrigen?.nombre ?? '—'}</div>
                  </div>
                  <div class="grid">
                    <div class="item">
                      <div class="label">Saldo anterior</div>
                      <div class="value">${formatCurrency(Number(data.cajaOrigen?.saldoAnterior || 0))}</div>
                    </div>
                    <div class="item">
                      <div class="label">Salida</div>
                      <div class="value">${formatCurrency(Number(data.cajaOrigen?.salida || 0))}</div>
                    </div>
                    <div class="item" style="grid-column: span 2;">
                      <div class="label">Saldo nuevo</div>
                      <div class="value">${formatCurrency(Number(data.cajaOrigen?.saldoNuevo || 0))}</div>
                    </div>
                  </div>
                </div>

                <div>
                  <div class="section-title">Caja destino</div>
                  <div class="item" style="margin-bottom: 6px;">
                    <div class="label">Nombre</div>
                    <div class="value">${data.cajaDestino?.nombre ?? 'Caja Principal'}</div>
                  </div>
                  <div class="grid">
                    <div class="item highlight">
                      <div class="label">Ingreso</div>
                      <div class="value">${formatCurrency(Number(data.cajaDestino?.ingreso || 0))}</div>
                    </div>
                    <div class="item highlight" style="grid-column: span 2;">
                      <div class="label">Saldo nuevo</div>
                      <div class="value">${formatCurrency(Number(data.cajaDestino?.saldoNuevo || 0))}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="section" style="margin-top: 8px;">
                <div class="section-title">Responsables</div>
                <div class="grid">
                  <div class="item">
                    <div class="label">Responsable de caja</div>
                    <div class="value">${responsable}</div>
                  </div>
                  <div class="item">
                    <div class="label">Recibido por</div>
                    <div class="value">${recibidoPor}</div>
                  </div>
                  <div class="item">
                    <div class="label">Creado por</div>
                    <div class="value">${creadoPor}</div>
                  </div>
                </div>
                <div style="margin-top: 6px;">
                  <div class="item">
                    <div class="label">Asiento contable</div>
                    <div class="value" style="font-family: monospace; word-break: break-all; font-size: 9.5px;">${data.journalEntryId ?? '—'}</div>
                  </div>
                </div>
              </div>

              ${
                data.observaciones
                  ? `
                    <div class="section">
                      <div class="section-title">Observaciones</div>
                      <div class="grid-full">
                        <div class="item">
                          <div class="value" style="font-weight: normal;">${data.observaciones}</div>
                        </div>
                      </div>
                    </div>
                  `
                  : ''
              }

              <div class="footer">
                Documento generado automáticamente por el sistema CrediSur.
                Este comprobante respalda el arqueo y traslado de efectivo registrado contablemente.
              </div>
            </div>
          </div>

          <script>
            window.onload = function () {
              window.print();
              window.onafterprint = function () {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=950,height=850');

    if (!printWindow) {
      alert('El navegador bloqueó la ventana de impresión. Permite ventanas emergentes para imprimir el comprobante.');
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.title = nombreDocumento;
    printWindow.document.close();
  }

  const handleCierre = async () => {
    setLoading(true)
    try {
      if (selectedRutaCaja) {
        const result = await confirmarArqueo(selectedRutaCaja.id, {
          fechaOperativa: form.fechaOperativa,
          efectivoContado: real,
          observaciones: form.observaciones || undefined
        })
        setArqueoResult(result)
      }
      setStep(3)
      // Reload all data after successful arqueo!
      await loadCierreCaja()
    } catch (e) {
      console.error('Error confirming arqueo:', e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 relative pb-20">
      {/* Fondo arquitectónico suave */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-blue-500 opacity-[0.08] blur-[100px]"></div>
      </div>

      <div className="relative z-10 w-full p-4 sm:p-6 md:p-8 space-y-6 md:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <Link 
            href="/contable"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              <span className="text-blue-600">Cierre de</span> <span className="text-orange-500">Caja</span>
            </h1>
            <p className="text-slate-500 font-medium mt-1">
              {'Caja Principal'}
              <span className="mx-2 text-slate-300">•</span>
              {new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Warning if principal caja not found */}
            {!principalCaja && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                No se encontró una caja de tipo PRINCIPAL. Verifica la configuración de cajas.
              </div>
            )}
            {/* Resumen del Día - Caja Principal */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                <div className="text-xs font-bold text-slate-500 uppercase mb-1">Saldo Caja Oficina</div>
                <div className="text-xl font-bold text-slate-900">
                  <MoneyAmount value={getSaldoCaja(principalCaja)} amountClassName="text-xl font-bold text-slate-900" />
                </div>
              </div>
              <div className="bg-emerald-50 p-5 rounded-3xl border border-emerald-100 shadow-sm">
                <div className="text-xs font-bold text-emerald-600 uppercase mb-1">Efectivo recibido hoy</div>
                <div className="text-xl font-bold text-slate-900 tabular-nums">+{formatCurrency(Math.abs(Number(ingresosHoy || 0)))}</div>
              </div>
              <div className="bg-rose-50 p-5 rounded-3xl border border-rose-100 shadow-sm">
                <div className="text-xs font-bold text-rose-600 uppercase mb-1">Efectivo retirado hoy</div>
                <div className="text-xl font-bold text-slate-900">
                  <MoneyAmount value={egresosHoy} meaning="expense" amountClassName="text-xl font-bold text-slate-900" />
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm transition-all duration-300">
                <div className="text-xs font-bold text-slate-500 uppercase mb-1">Cajas Abiertas</div>
                <div className="text-2xl font-bold text-slate-900">{resumen ? resumen.cajasAbiertasCount : 0}</div>
              </div>
              <div className="bg-white rounded-3xl p-6 border border-orange-100 shadow-sm transition-all duration-300">
                <div className="text-xs font-bold text-orange-600 uppercase mb-1">Rutas Pendientes</div>
                <div className="text-2xl font-bold text-slate-900">{rutasPendientesCount}</div>
              </div>
              <button
                type="button"
                onClick={() => setShowHistorialModal(true)}
                className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:border-blue-200 transition-all duration-300 text-left focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <div className="text-xs font-bold text-slate-500 uppercase mb-1">Historial de Cierres</div>
                <div className="text-sm font-bold text-slate-900">
                  {ultimoCierre ? new Date(ultimoCierre.fecha).toLocaleString('es-CO') : '—'}
                </div>
                <div className="text-xs font-medium text-blue-600 mt-1 flex items-center gap-1">
                  <Eye className="h-3 w-3" /> Ver detalles
                </div>
              </button>
            </div>

            {/* Lista de Cajas de Ruta para Seleccionar */}
            {!selectedRutaCaja ? (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/60">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-blue-600" />
                    Seleccione la Caja de Ruta para Arqueo
                  </h3>
                </div>
                <div className="p-6">
                  {rutaCajas.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {rutaCajas.map((caja: any) => (
                        <button
                          key={caja.id}
                          type="button"
                          onClick={() => selectRutaCaja(caja)}
                          className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-left hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        >
                          <div className="text-sm font-bold text-slate-900 mb-1">{caja.nombre}</div>
                          <div className="text-xs font-medium text-slate-600 mb-2">Responsable: {getNombreUsuario(caja.responsable)}</div>
                          <div className="text-lg font-bold text-slate-900">
                            Saldo: {formatCurrency(parseSaldoCaja(caja.saldo ?? caja.saldoActual ?? 0))}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-500">
                      No hay cajas de ruta disponibles para arqueo
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Formulario de Conteo de Caja de Ruta */
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-blue-600" />
                    Arqueo de Caja de Ruta
                  </h3>
                  {arqueoPreview?.arqueoExistente && (
                    <span className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 px-3 py-1.5 rounded-xl">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Arqueo ya realizado
                    </span>
                  )}
                </div>
                
                <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    {/* Caja Origen y Destino */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs font-bold text-slate-500 uppercase mb-1">Caja Origen</div>
                        <div className="text-sm font-bold text-slate-900 bg-slate-50 p-3 rounded-xl border border-slate-200">{selectedRutaCaja.nombre}</div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-500 uppercase mb-1">Caja Destino</div>
                        <div className="text-sm font-bold text-slate-900 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                          {arqueoPreview?.cajaPrincipal?.nombre ?? principalCaja?.nombre ?? 'Caja Principal'}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-slate-500 uppercase mb-1">Saldo Esperado de la Caja Origen</div>
                      <div className="text-lg font-bold text-slate-900 bg-slate-50 p-3 rounded-xl border border-slate-200">
                        {formatCurrency(saldoSistema)}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        Efectivo Contado de la Caja Origen
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <span className="text-slate-400 font-bold text-xl">$</span>
                        </div>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={form.efectivoContado}
                          onChange={(e) => setForm({ ...form, efectivoContado: formatCOPInputValue(e.target.value) })}
                          className="pl-9 w-full rounded-2xl border border-slate-200 py-3.5 text-2xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent shadow-sm outline-none"
                          placeholder="0"
                          autoFocus
                        />
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        Este valor corresponde al dinero físico entregado por el responsable de la caja ruta. Al confirmar, el sistema trasladará el efectivo contado a Caja Principal y cerrará la jornada.
                      </p>
                    </div>

                    {form.efectivoContado && (
                      <div className={cn(
                        "p-4 rounded-xl border flex items-start gap-3 transition-all",
                        diferencia === 0 
                          ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                          : diferencia > 0 
                            ? "bg-blue-50 border-blue-200 text-blue-800"
                            : "bg-rose-50 border-rose-200 text-rose-800"
                      )}>
                        {diferencia === 0 ? (
                          <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <div className="font-bold text-sm">
                            {diferencia === 0 ? 'Cuadre Perfecto' : diferencia > 0 ? 'Sobrante detectado' : 'Faltante detectado'}
                          </div>
                          <div className="text-sm font-medium opacity-90">
                            Diferencia de {formatCurrency(Math.abs(diferencia))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Observaciones
                    </label>
                    <textarea
                      value={form.observaciones}
                      onChange={(e) => setForm({...form, observaciones: e.target.value})}
                      className="w-full rounded-2xl border border-slate-200 py-3 px-4 text-sm text-slate-600 focus:ring-2 focus:ring-blue-600 focus:border-transparent min-h-[160px] resize-none outline-none shadow-sm"
                      placeholder="Detalles sobre diferencias, billetes falsos, o notas del turno..."
                    />
                  </div>
                </div>
                
                <div className="p-6 border-t border-slate-100 bg-slate-50/60 flex gap-3 justify-between">
                  <button
                    onClick={() => setSelectedRutaCaja(null)}
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
                  >
                    Cambiar Caja de Ruta
                  </button>
                  <button
                    onClick={() => setStep(2)}
                    disabled={loading || !selectedRutaCaja || !form.efectivoContado || Boolean(arqueoPreview?.arqueoExistente)}
                    className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-200"
                  >
                    {arqueoPreview?.arqueoExistente ? 'Arqueo ya realizado' : loading ? 'Procesando...' : 'Continuar a Confirmación'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-8 text-center border-b border-slate-100">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Wallet className="h-8 w-8" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Confirmar Arqueo</h2>
                <p className="text-slate-500 text-sm">
                  Verifique los valores antes de registrar permanentemente en el Ledger.
                </p>
              </div>

              <div className="p-8 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs font-bold text-slate-500 uppercase mb-1">Caja Origen</div>
                    <div className="text-sm font-bold text-slate-900 bg-slate-50 p-3 rounded-xl border border-slate-200">{selectedRutaCaja?.nombre || '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-500 uppercase mb-1">Caja Destino</div>
                    <div className="text-sm font-bold text-slate-900 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                      {arqueoPreview?.cajaPrincipal?.nombre ?? principalCaja?.nombre ?? 'Caja Principal'}
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                  <span className="text-slate-500 font-medium text-sm">Responsable</span>
                  <span className="font-bold text-slate-900">{getNombreUsuario(selectedRutaCaja?.responsable)}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                  <span className="text-slate-500 font-medium text-sm">Saldo Esperado</span>
                  <span className="font-bold text-slate-900">{formatCurrency(Math.abs(Number(saldoSistema || 0)))}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                  <span className="text-slate-500 font-medium text-sm">Efectivo Contado</span>
                  <span className="font-bold text-slate-900">{formatCurrency(real)}</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-slate-500 font-medium text-sm">Diferencia</span>
                  <span className={cn(
                    "font-bold px-3 py-1 rounded-lg",
                    diferencia === 0 
                      ? "bg-emerald-100 text-emerald-700" 
                      : diferencia > 0 
                        ? "bg-blue-100 text-blue-700" 
                        : "bg-rose-100 text-rose-700"
                  )}>
                    <MoneyAmount value={diferencia} amountClassName="font-bold" />
                  </span>
                </div>
                
                {form.observaciones && (
                  <div className="mt-4 p-4 bg-slate-50 rounded-2xl text-sm font-medium text-slate-700 border border-slate-200">
                    &ldquo;{form.observaciones}&rdquo;
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3 justify-end">
                <button
                  onClick={() => setStep(1)}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
                >
                  Volver
                </button>
                <button
                  onClick={handleCierre}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-8 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-all shadow-sm disabled:opacity-70"
                >
                  {loading ? 'Procesando...' : 'Confirmar Arqueo'}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-8 text-center border-b border-slate-100 bg-emerald-50">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">¡Arqueo Exitoso!</h2>
                <p className="text-slate-500 text-sm">
                  El arqueo ha sido registrado en el Ledger correctamente.
                </p>
              </div>
              
              {arqueoResult && (
                <div className="p-8 space-y-5">
                  {/* Comprobante */}
                  {arqueoResult.numeroComprobanteTraslado && (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Número de Comprobante</div>
                      <div className="text-lg font-black text-slate-900 mt-1">{arqueoResult.numeroComprobanteTraslado}</div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Caja Origen</div>
                      <div className="text-sm font-bold text-slate-900 mt-1">{arqueoResult.cajaOrigen?.nombre || principalCaja?.nombre || '-'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Caja Destino</div>
                      <div className="text-sm font-bold text-slate-900 mt-1">{arqueoResult.cajaDestino?.nombre || 'Caja Principal'}</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="bg-white border border-slate-200 rounded-2xl px-4 py-4 shadow-sm">
                      <div className="text-[10px] font-bold text-slate-500 uppercase">Saldo Esperado</div>
                      <div className="text-lg font-bold text-slate-900 mt-1">{formatCurrency(Number(arqueoResult.saldoEsperado || 0))}</div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl px-4 py-4 shadow-sm">
                      <div className="text-[10px] font-bold text-slate-500 uppercase">Efectivo Contado</div>
                      <div className="text-lg font-bold text-slate-900 mt-1">{formatCurrency(Number(arqueoResult.efectivoContado || 0))}</div>
                    </div>
                    <div className={cn(
                      "rounded-2xl px-4 py-4 border shadow-sm", 
                      Number(arqueoResult.diferencia || 0) === 0 
                        ? "bg-emerald-50 border-emerald-100" 
                        : Number(arqueoResult.diferencia || 0) > 0 
                          ? "bg-blue-50 border-blue-100" 
                          : "bg-rose-50 border-rose-100"
                    )}>
                      <div className={cn(
                        "text-[10px] font-bold uppercase", 
                        Number(arqueoResult.diferencia || 0) === 0 
                          ? "text-emerald-600" 
                          : Number(arqueoResult.diferencia || 0) > 0 
                            ? "text-blue-600" 
                            : "text-rose-600"
                      )}>Diferencia</div>
                      <div className={cn(
                        "text-lg font-bold mt-1", 
                        Number(arqueoResult.diferencia || 0) === 0 
                          ? "text-emerald-800" 
                          : Number(arqueoResult.diferencia || 0) > 0 
                            ? "text-blue-800" 
                            : "text-rose-800"
                      )}>{formatCurrency(Number(arqueoResult.diferencia || 0))}</div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl px-4 py-4 shadow-sm">
                      <div className="text-[10px] font-bold text-slate-500 uppercase">Monto Transferido</div>
                      <div className="text-lg font-bold text-slate-900 mt-1">{formatCurrency(Number(arqueoResult.montoTransferido || 0))}</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Responsable</div>
                      <div className="text-sm font-bold text-slate-900 mt-1">{arqueoResult.responsable?.nombres} {arqueoResult.responsable?.apellidos || '-'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Creado Por</div>
                      <div className="text-sm font-bold text-slate-900 mt-1">{arqueoResult.creadoPor?.nombres} {arqueoResult.creadoPor?.apellidos || '-'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Recibido Por</div>
                      <div className="text-sm font-bold text-slate-900 mt-1">{arqueoResult.recibidoPor?.nombres} {arqueoResult.recibidoPor?.apellidos || '-'}</div>
                    </div>
                  </div>
                  
                  {arqueoResult.journalEntryId && (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">ID de Asiento Contable (Journal)</div>
                      <div className="text-sm font-bold text-slate-700 mt-1 font-mono break-all">{arqueoResult.journalEntryId}</div>
                    </div>
                  )}
                  
                  {arqueoResult.observaciones && (
                    <div className="mt-4 p-4 bg-slate-50 rounded-2xl text-sm font-medium text-slate-900 border border-slate-200">
                      <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Observaciones</div>
                      {arqueoResult.observaciones}
                    </div>
                  )}
                </div>
              )}
              
              <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-3 sm:justify-end">
                <Link 
                  href="/contable"
                  className="w-full sm:w-auto inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
                >
                  Volver al Tablero
                </Link>
                <button 
                  type="button" 
                  onClick={() => handleImprimirComprobante()} 
                  disabled={!arqueoResult} 
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 text-white font-semibold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm">
                  <Receipt className="h-4 w-4" />
                  Imprimir Comprobante
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ... Modal del Historial (Omitido para legibilidad, mantenemos el actual) ... */}
        {showHistorialModal && (
          <Portal>
          <div className="fixed inset-0 flex items-end sm:items-center justify-center p-3 sm:p-6 md:p-8 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" style={{ zIndex: MODAL_Z_INDEX }} onClick={() => setShowHistorialModal(false)}>
            <div className="w-full max-w-5xl 2xl:max-w-6xl max-h-[92vh] bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
              <div className="p-4 sm:p-6 md:p-7 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 leading-tight">Historial de Cierres</h3>
                  <div className="text-sm font-medium text-slate-500 mt-1">
                    Filtra por tipo, estado y fechas
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHistorialModal(false)}
                  className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
                >
                  Cerrar
                </button>
              </div>
              <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(92vh-90px)]">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-6">
                  <div className="md:col-span-4 flex items-center gap-1 bg-white border border-slate-200 rounded-2xl p-1 shadow-sm">
                    <button
                      type="button"
                      onClick={() => setFiltroTipo('TODOS')}
                      className={cn("text-xs font-bold px-3 py-1.5 rounded-xl transition-colors", filtroTipo === 'TODOS' ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50")}
                    >Todos</button>
                    <button
                      type="button"
                      onClick={() => setFiltroTipo('ARQUEO')}
                      className={cn("text-xs font-bold px-3 py-1.5 rounded-xl transition-colors", filtroTipo === 'ARQUEO' ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50")}
                    >Arqueos</button>
                    <button
                      type="button"
                      onClick={() => setFiltroTipo('CONSOLIDACION')}
                      className={cn("text-xs font-bold px-3 py-1.5 rounded-xl transition-colors", filtroTipo === 'CONSOLIDACION' ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50")}
                    >Consolidaciones</button>
                  </div>
                  <div className="md:col-span-4 flex items-center gap-1 bg-white border border-slate-200 rounded-2xl p-1 shadow-sm">
                    <button
                      type="button"
                      onClick={() => setEstadoFiltro('TODOS')}
                      className={cn("text-xs font-bold px-3 py-1.5 rounded-xl transition-colors", estadoFiltro === 'TODOS' ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50")}
                    >Estado: Todos</button>
                    <button
                      type="button"
                      onClick={() => setEstadoFiltro('DESCUADRADA')}
                      className={cn("text-xs font-bold px-3 py-1.5 rounded-xl transition-colors", estadoFiltro === 'DESCUADRADA' ? "bg-rose-50 text-rose-700" : "text-slate-600 hover:bg-slate-50")}
                    >Descuadradas</button>
                    <button
                      type="button"
                      onClick={() => setEstadoFiltro('CUADRADA')}
                      className={cn("text-xs font-bold px-3 py-1.5 rounded-xl transition-colors", estadoFiltro === 'CUADRADA' ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-50")}
                    >Cuadradas</button>
                  </div>
                  <div className="md:col-span-4 flex items-center justify-between gap-3">
                    <label className="flex-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Desde</span>
                      <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none shadow-sm" />
                    </label>
                    <label className="flex-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Hasta</span>
                      <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none shadow-sm" />
                    </label>
                  </div>
                </div>

                <div className="max-h-[60vh] overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {cierres.map((c, i) => (
                      <div
                        key={c.id || i}
                        className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all"
                      >
                        {/* Comprobante number and tipo */}
                        <div className="flex items-center justify-between mb-3">
                          {c.numeroComprobanteTraslado ? (
                            <span className="bg-blue-50 border border-blue-100 rounded-full px-3 py-1 text-[10px] font-bold text-blue-700">
                              {c.numeroComprobanteTraslado}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400">Cierre anterior</span>
                          )}
                          {typeof c.estado !== 'undefined' && (
                            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md", c.estado === 'DESCUADRADA' ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700")}>
                              {c.estado}
                            </span>
                          )}
                        </div>
                        
                        {/* Caja origen/destino (if available) */}
                        {(c.cajaOrigen?.nombre || c.caja) && (
                          <div className="mb-2">
                            <div className="text-[10px] font-bold text-slate-400 uppercase">
                              {c.cajaDestino?.nombre ? 'Movimiento' : 'Caja'}
                            </div>
                            <div className="text-sm font-bold text-slate-900">
                              {c.cajaOrigen?.nombre || c.caja}
                              {c.cajaDestino?.nombre && (
                                <>
                                  {' '}→ {c.cajaDestino.nombre}
                                </>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Resultado y monto (if available) */}
                        {c.tipoDiferencia && (
                          <div className="mb-2">
                            <div className="text-[10px] font-bold text-slate-400 uppercase">Resultado</div>
                            <div className="text-sm font-bold">
                              <span className={cn(
                                "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold",
                                c.tipoDiferencia === 'SIN_DIFERENCIA'
                                  ? "bg-emerald-50 text-emerald-700"
                                  : c.tipoDiferencia === 'SOBRANTE'
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-rose-50 text-rose-700"
                              )}>
                                {formatTipoDiferencia(c.tipoDiferencia)}
                              </span>
                            </div>
                          </div>
                        )}
                        
                        {c.montoTransferido && (
                          <div className="mb-2">
                            <div className="text-[10px] font-bold text-slate-400 uppercase">Monto transferido</div>
                            <div className="text-sm font-bold text-slate-900">
                              {formatCurrency(Number(c.montoTransferido))}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex flex-col gap-1 mb-3">
                          <span className="text-[12px] font-medium text-slate-600">
                            {c.responsable ? `Resp: ${getNombreUsuario(c.responsable)}` : ''}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {new Date(c.fecha || c.creadoEn || c.fechaOperativa).toLocaleString('es-CO')}
                          </span>
                        </div>
                        
                        {/* Buttons */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setSelectedCierre(c); setShowDetalleCierreModal(true) }}
                            className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-100 transition-colors text-center"
                          >
                            Ver Detalles
                          </button>
                          
                          {c.numeroComprobanteTraslado && (
                            <button
                              onClick={() => handleImprimirComprobante(c)}
                              className="flex-1 px-3 py-2 bg-blue-50 border border-blue-200 text-xs font-bold text-blue-700 rounded-xl hover:bg-blue-100 transition-colors text-center"
                            >
                              Imprimir Comprobante
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {cierres.length === 0 && (
                      <div className="col-span-full p-8 text-center text-slate-400">
                        <span className="text-sm font-bold text-slate-500 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">Sin registros</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          </Portal>
        )}

        {showDetalleCierreModal && selectedCierre && (
          <Portal>
          <div className="fixed inset-0 flex items-end sm:items-center justify-center p-3 sm:p-6 md:p-8 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" style={{ zIndex: MODAL_Z_INDEX }} onClick={() => setShowDetalleCierreModal(false)}>
            <div className="w-full max-w-4xl max-h-[92vh] bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
              <div className="p-4 sm:p-6 md:p-7 border-b border-slate-100 bg-slate-50/60 flex justify-between items-center gap-3">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {selectedCierre.numeroComprobanteTraslado ? 'Detalle de Arqueo' : 'Detalle de Cierre'}
                  </h3>
                  {selectedCierre.numeroComprobanteTraslado && (
                    <div className="text-sm font-bold text-blue-600 mt-1">
                      {selectedCierre.numeroComprobanteTraslado}
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2 items-center">
                  {selectedCierre.numeroComprobanteTraslado && (
                    <button onClick={() => handleImprimirComprobante(selectedCierre)} className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2">
                      <Receipt className="h-4 w-4" />
                      Imprimir Comprobante
                    </button>
                  )}
                  <button onClick={() => setShowDetalleCierreModal(false)} className="px-4 py-2 bg-white border border-slate-200 text-sm font-bold text-slate-600 rounded-xl hover:bg-slate-50 transition-colors">
                    Cerrar
                  </button>
                </div>
              </div>

              <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(92vh-150px)]">
                <div className="space-y-5">
                  {/* Comprobante number and estado */}
                  <div className="flex flex-wrap gap-4">
                    {selectedCierre.fechaOperativa && (
                      <div className="flex-1 min-w-[150px]">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Fecha operativa</div>
                        <div className="text-sm font-bold text-slate-900">{selectedCierre.fechaOperativa}</div>
                      </div>
                    )}
                    <div className="flex-1 min-w-[150px]">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Fecha generación</div>
                      <div className="text-sm font-bold text-slate-900">
                        {new Date(selectedCierre.creadoEn || selectedCierre.fecha).toLocaleString('es-CO')}
                      </div>
                    </div>
                    <div className="flex-1 min-w-[150px]">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Estado</div>
                      <div className="text-sm font-bold text-emerald-700">Confirmado</div>
                    </div>
                  </div>

                  {/* Caja origen/destino */}
                  {(selectedCierre.cajaOrigen || selectedCierre.cajaDestino || selectedCierre.caja) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedCierre.cajaOrigen?.nombre || selectedCierre.caja ? (
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase">Caja origen</div>
                          <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4">
                            <div className="text-sm font-bold text-slate-900">{selectedCierre.cajaOrigen?.nombre || selectedCierre.caja}</div>
                            {selectedCierre.cajaOrigen?.saldoAnterior != null && (
                              <div className="text-xs text-slate-600 mt-2">
                                Saldo anterior: {formatCurrency(Number(selectedCierre.cajaOrigen.saldoAnterior))}
                              </div>
                            )}
                            {selectedCierre.cajaOrigen?.salida != null && (
                              <div className="text-xs text-slate-600">
                                Salida: {formatCurrency(Number(selectedCierre.cajaOrigen.salida))}
                              </div>
                            )}
                            {selectedCierre.cajaOrigen?.saldoNuevo != null && (
                              <div className="text-xs font-bold text-slate-700">
                                Saldo nuevo: {formatCurrency(Number(selectedCierre.cajaOrigen.saldoNuevo))}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : null}
                      
                      {selectedCierre.cajaDestino?.nombre ? (
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase">Caja destino</div>
                          <div className="bg-blue-50 border border-blue-200 rounded-2xl px-4 py-4">
                            <div className="text-sm font-bold text-blue-900">{selectedCierre.cajaDestino.nombre}</div>
                            {selectedCierre.cajaDestino.ingreso != null && (
                              <div className="text-xs font-bold text-blue-700 mt-2">
                                Ingreso: {formatCurrency(Number(selectedCierre.cajaDestino.ingreso))}
                              </div>
                            )}
                            {selectedCierre.cajaDestino.saldoNuevo != null && (
                              <div className="text-xs font-bold text-blue-800">
                                Saldo nuevo: {formatCurrency(Number(selectedCierre.cajaDestino.saldoNuevo))}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* Resumen financiero */}
                  {(selectedCierre.saldoEsperado || selectedCierre.saldoSistema) && (
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase mb-3">Resumen del arqueo</div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
                          <div className="text-[10px] font-bold text-slate-500 uppercase">Saldo esperado</div>
                          <div className="text-sm font-bold text-slate-900">
                            {formatCurrency(Number(selectedCierre.saldoEsperado ?? selectedCierre.saldoSistema ?? 0))}
                          </div>
                        </div>
                        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3">
                          <div className="text-[10px] font-bold text-emerald-600 uppercase">Efectivo contado</div>
                          <div className="text-sm font-bold text-emerald-900">
                            {formatCurrency(Number(selectedCierre.efectivoContado ?? selectedCierre.saldoReal ?? 0))}
                          </div>
                        </div>
                        <div className={cn(
                          "rounded-2xl px-4 py-3 border", 
                          Number(selectedCierre.diferencia ?? 0) === 0 ? "bg-green-50 border-green-200" :
                          Number(selectedCierre.diferencia ?? 0) > 0 ? "bg-amber-50 border-amber-200" :
                          "bg-rose-50 border-rose-200"
                        )}>
                          <div className={cn(
                            "text-[10px] font-bold uppercase", 
                            Number(selectedCierre.diferencia ?? 0) === 0 ? "text-emerald-700" :
                            Number(selectedCierre.diferencia ?? 0) > 0 ? "text-amber-700" :
                            "text-rose-700"
                          )}>Diferencia</div>
                          <div className={cn(
                            "text-sm font-bold", 
                            Number(selectedCierre.diferencia ?? 0) === 0 ? "text-emerald-900" :
                            Number(selectedCierre.diferencia ?? 0) > 0 ? "text-amber-900" :
                            "text-rose-900"
                          )}>
                            {formatTipoDiferencia(selectedCierre.tipoDiferencia)} ({formatCurrency(Number(selectedCierre.diferencia ?? 0))})
                          </div>
                        </div>
                        {selectedCierre.montoTransferido != null && (
                          <div className="bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3">
                            <div className="text-[10px] font-bold text-blue-700 uppercase">Monto transferido</div>
                            <div className="text-sm font-bold text-blue-900">
                              {formatCurrency(Number(selectedCierre.montoTransferido))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Responsables */}
                  {(selectedCierre.responsable || selectedCierre.creadoPor || selectedCierre.recibidoPor) && (
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase mb-3">Responsables</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {selectedCierre.responsable && (
                          <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
                            <div className="text-[10px] font-bold text-slate-500 uppercase">Responsable de caja</div>
                            <div className="text-sm font-bold text-slate-900">{getNombreUsuario(selectedCierre.responsable)}</div>
                          </div>
                        )}
                        {selectedCierre.recibidoPor && (
                          <div className="bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3">
                            <div className="text-[10px] font-bold text-blue-700 uppercase">Recibido por</div>
                            <div className="text-sm font-bold text-blue-900">{getNombreUsuario(selectedCierre.recibidoPor)}</div>
                          </div>
                        )}
                        {selectedCierre.creadoPor && (
                          <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
                            <div className="text-[10px] font-bold text-slate-500 uppercase">Creado por</div>
                            <div className="text-sm font-bold text-slate-900">{getNombreUsuario(selectedCierre.creadoPor)}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ID de asiento contable */}
                  {selectedCierre.journalEntryId && (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Asiento contable (Journal Entry)</div>
                      <div className="text-sm font-bold text-slate-700 mt-1 font-mono break-all">{selectedCierre.journalEntryId}</div>
                    </div>
                  )}

                  {/* Observaciones */}
                  { (selectedCierre.observaciones || selectedCierre.descripcion) && (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Observaciones</div>
                      <div className="mt-1 text-sm font-medium text-slate-900 whitespace-pre-line">{selectedCierre.observaciones || selectedCierre.descripcion}</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 sm:p-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between sm:justify-end gap-2">
                {selectedCierre.numeroComprobanteTraslado && (
                  <button
                    onClick={() => handleImprimirComprobante(selectedCierre)}
                    className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors"
                  >
                    Imprimir comprobante
                  </button>
                )}
                
                <button
                  onClick={() => setShowDetalleCierreModal(false)}
                  className="w-full sm:w-auto px-6 py-2 bg-slate-100 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
          </Portal>
        )}
      </div>
    </div>
  )
}
