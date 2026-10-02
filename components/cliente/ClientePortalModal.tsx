'use client';

import { useState, useEffect } from 'react';
import { X, BarChart3 } from 'lucide-react';
import ClienteDetalleElegante, {
  Cliente as ClienteUI,
  Prestamo,
  Pago,
  Comentario,
  type EstadoPrestamo,
  type NivelRiesgo,
} from './DetalleCliente';
import { clientesService } from '@/services/clientes-service';
import type {
  PagoDeCliente,
  PrestamoDeCliente,
} from '@/services/clientes-service';
import type { CuotaOperativa } from '@/lib/types/cobranza';
import { Smartphone, DollarSign } from 'lucide-react';
import { createPortal } from 'react-dom';
import {
  offlineStore,
  type OfflineCliente,
  type OfflinePrestamo,
} from '@/lib/offline/offlineDb';
import Tooltip from '@/components/ui/Tooltip';
import { useModalDialog } from '@/hooks/use-modal-dialog';
import {
  computeDiasMoraFromCuotas,
  getBogotaDateKey,
  isCuotaNoPagada,
  normalizeDateKey,
  resolveFechaEfectivaCuota,
  toBogotaDateTimeOffsetIso,
} from '@/lib/rutas-core'

interface ClientePortalModalProps {
  clientId: string;
  onClose: () => void;
  rolUsuario?: string;
}

const MODAL_Z_INDEX = 2147483600;

/**
 * El estado del prestamo, normalizado contra la union que la pantalla sabe pintar.
 *
 * La copia offline lo guarda como texto libre, asi que un valor que no este en la union
 * dejaba a la pantalla sin color ni etiqueta. El `|| 'ACTIVO'` de antes solo cubria el caso
 * vacio, no el de un texto inesperado.
 */
const ESTADOS_DE_PRESTAMO: readonly EstadoPrestamo[] = [
  'BORRADOR',
  'PENDIENTE_APROBACION',
  'ACTIVO',
  'EN_MORA',
  'PAGADO',
  'INCUMPLIDO',
  'PERDIDA',
]

const estadoPrestamoDeUi = (valor: unknown): EstadoPrestamo => {
  const estado = String(valor ?? '').trim().toUpperCase()
  return (ESTADOS_DE_PRESTAMO as readonly string[]).includes(estado)
    ? (estado as EstadoPrestamo)
    : 'ACTIVO'
}

/**
 * El nivel de riesgo del CLIENTE, normalizado contra su propia union.
 *
 * No se usa `mapNivelRiesgo` de `lib/types/cobranza` a proposito: ese devuelve el riesgo
 * OPERATIVO de una ruta (minimo/leve/precaucion/moderado/critico), que es otro enum con el
 * mismo nombre de campo. Mezclarlos pinta el semaforo del cliente con los colores de la ruta.
 */
const nivelRiesgoDeCliente = (valor: unknown): NivelRiesgo => {
  const nivel = String(valor ?? '').trim().toUpperCase()
  if (nivel === 'AMARILLO' || nivel === 'ROJO' || nivel === 'LISTA_NEGRA') return nivel
  return 'VERDE'
}

function Portal({ children }: { children: React.ReactNode }) {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}

export default function ClientePortalModal({ clientId, onClose, rolUsuario = 'contador' }: ClientePortalModalProps) {
  const [clienteData, setClienteData] = useState<ClienteUI | null>(null);
  const [loading, setLoading] = useState(true);
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  // HALLAZGO: aqui vivian `estadoCuenta` y `loadingEstadoCuenta`, con su `useEffect` que
  // pedia `GET /clients/:id/estado-cuenta` con `cacheTTL: 0` cada vez que se abria el modal.
  // Ninguno de los dos se LEIA en ningun sitio: el resultado se guardaba y se tiraba. O sea
  // una peticion a la API por apertura, sin cache, para nada. Se quitan los dos estados y el
  // efecto. Con `useState<any>` no habia forma de notarlo.
  // Escape para salir y foco al abrir. El hook lleva una pila, asi que con
  // modales anidados Escape cierra solo el de encima.
  useModalDialog({
    onClose: onClose,
    // Modal de solo lectura: no hay campo que enfocar.
    enfocarAlAbrir: false,
  })


  const [comentarios, setComentarios] = useState<Comentario[]>([]);

  useEffect(() => {
    const fetchCliente = async () => {
        try {
            const data = await clientesService.obtenerPorId(clientId);
            if (data) {
                // Adaptar data backend a UI
                const fotos: string[] = Array.from(
                  new Set(
                    (data.archivos || [])
                      // El tipo se DERIVA del VALOR (`typeof data.archivos`) y no de un tipo
                      // con nombre: hay dos `Cliente` distintos en el proyecto y el del servicio
                      // no es el de `domain.ts`. Derivar del valor no se puede equivocar. El
                      // `|| ''` va porque los tres campos son opcionales y el destino es `string[]`.
                      .map(
                        (a: NonNullable<typeof data.archivos>[number]) =>
                          a.url || a.path || a.ruta || '',
                      )
                      .filter(Boolean),
                  ),
                );

                setClienteData({
                    id: data.id ?? '',
                    codigo: data.codigo || 'S/C',
                    dni: data.dni,
                    nombres: data.nombres,
                    apellidos: data.apellidos,
                    correo: data.correo,
                    telefono: data.telefono,
                    direccion: data.direccion || null,
                    referencia: data.referencia || null,
                    nivelRiesgo: (data.nivelRiesgo) || 'VERDE',
                    puntaje: data.puntaje || 0,
                    enListaNegra: data.enListaNegra || false,
                    estadoAprobacion: data.estadoAprobacion || 'APROBADO',
                    fechaRegistro: data.creadoEn || toBogotaDateTimeOffsetIso(new Date()),
                    ocupacion: 'No especificada',
                    avatarColor: 'bg-blue-600',
                    ruta: data.asignacionesRuta?.[0]?.ruta?.nombre || 'Sin Ruta',
                    fotos: fotos
                });
                
                const prestamosBackend: PrestamoDeCliente[] = data.prestamos || [];
                setPrestamos(prestamosBackend.map(p => {
                    const cuotas = p.cuotas || [];
                    const cuotasPagadas = cuotas.filter(
                      (c: CuotaOperativa) =>
                        c.estado === 'PAGADA' || c.estadoActual === 'PAGADA',
                    ).length;
                    const totalCuotas = p.cantidadCuotas || cuotas.length || 0;

                    const hoyKey = getBogotaDateKey(new Date())
                    const frecuencia = String(p.frecuenciaPago || 'DIARIO').toUpperCase()
                    const cuotasVencidas = (Array.isArray(cuotas) ? cuotas : []).filter((c) => {
                      if (!c || !isCuotaNoPagada(c)) return false
                      const raw = resolveFechaEfectivaCuota(c) || String(c?.fechaVencimiento || '')
                      const k = normalizeDateKey(raw)
                      return !!k && !!hoyKey && k < hoyKey
                    }).length
                    const diasMora = computeDiasMoraFromCuotas(cuotas, hoyKey, frecuencia)
                    // `estadoPrestamoDeUi` normaliza contra la union cerrada, igual que en el
                    // respaldo offline: `p.estado` es texto libre y el destino no.
                    const estadoUI =
                      cuotasVencidas > 0 || diasMora > 0
                        ? ('EN_MORA' as const)
                        : estadoPrestamoDeUi(p.estado)
                    
                    const principal = Number(p.monto || 0);
                    const tasa = Number(p.tasaInteres || 0);
                    const meses = Number(p.plazoMeses || 1);
                    let interesTotal = Number(p.interesTotal || 0);
                    
                    if (interesTotal === 0 && tasa > 0 && meses > 0) {
                      interesTotal = (principal * tasa * meses) / 100;
                    }
                
                    const montoTotal = principal + interesTotal;
                    const saldoPendiente = Number(p.saldoPendiente || 0);

                    const moraAcumulada = cuotas.reduce(
                      (sum: number, c: CuotaOperativa) =>
                        sum + Number(c.montoInteresMora || 0),
                      0,
                    );

                    return {
                        // Los `?? ''` los pidio el tipo: `PrestamoParcial` y `PagoParcial`
                        // los declaran opcionales (son parciales) y la UI los quiere
                        // obligatorios. Antes eran `any[]`, asi que nadie comprobaba nada.
                        id: p.id ?? '',
                        producto: p.tipoPrestamo === 'ARTICULO' ? (p.producto?.nombre || 'Artículo') : 'Préstamo Efectivo',
                        montoTotal: montoTotal,
                        montoPagado: Number(p.totalPagado || 0),
                        montoPendiente: (saldoPendiente === principal && interesTotal > 0) ? montoTotal : saldoPendiente,
                        cuotasTotales: totalCuotas,
                        cuotasPagadas: cuotasPagadas,
                        cuotasPendientes: Math.max(0, totalCuotas - cuotasPagadas),
                        fechaInicio: p.fechaInicio ?? '',
                        fechaVencimiento: p.fechaFin ?? '',
                        proximoPago:
                          cuotas.find((c: CuotaOperativa) => isCuotaNoPagada(c))
                            ?.fechaVencimiento ||
                          p.fechaFin ||
                          '',
                        estado: estadoUI,
                        tasaInteres: tasa,
                        frecuencia: p.frecuenciaPago || 'SEMANAL',
                        icono: <Smartphone className="w-5 h-5" />,
                        categoria: p.tipoPrestamo || 'General',
                        cuotasVencidas,
                        moraAcumulada,
                        diasMora,
                    };
                }));
                
                const pagosBackend: PagoDeCliente[] = data.pagos || [];
                setPagos(pagosBackend.map(p => ({
                    id: String(p.id ?? ''),
                    fecha: p.fechaPago ?? '',
                    monto: Number(p.montoTotal || 0),
                    // El `|| 1` de antes no era un respaldo: `pagos: true` no traia
                    // `detalles`, asi que TODOS los pagos mostraban "cuota 1". Ya llegan
                    // (ver el include de `findOne`).
                    //
                    // Se muestran todas las cuotas que cubrio el pago, no solo la
                    // primera: un pago puede repartirse entre varias y un solo numero
                    // seria mentira. Si no se sabe, no se inventa.
                    cuota: (Array.isArray(p.detalles) ? p.detalles : [])
                      // El tipo del detalle se DERIVA del pago, que ya lo declara.
                      .map(
                        (d: NonNullable<PagoDeCliente['detalles']>[number]) =>
                          d?.cuota?.numeroCuota,
                      )
                      .filter(
                        (n): n is number => typeof n === 'number',
                      )
                      .join(', ') || '—',
                    // El numero de pago puede llegar como numero y la UI lo quiere texto.
                    referencia:
                      p.numeroPago == null ? undefined : String(p.numeroPago),
                    metodo: p.metodoPago || 'EFECTIVO',
                    estado: 'confirmado',
                    icono: <DollarSign className="w-5 h-5" />
                })));
            }
        } catch (error) {
            console.error("Error cargando cliente full", error);
            // Fallback offline: cargar de IndexedDB
            try {
              const offCliente = await offlineStore.getById<OfflineCliente>(
                'clientes',
                clientId,
              );
              if (offCliente) {
                setClienteData({
                  id: offCliente.id,
                  codigo: offCliente.codigo || 'S/C',
                  dni: offCliente.dni,
                  nombres: offCliente.nombres,
                  apellidos: offCliente.apellidos,
                  correo: offCliente.correo,
                  telefono: offCliente.telefono,
                  direccion: offCliente.direccion || null,
                  // HALLAZGO, medido: la copia offline guarda DOCE campos del cliente
                  // (syncManager.ts:566-577) y ninguno de estos seis esta entre ellos.
                  // O sea que las cascadas `offCliente.campo || defecto` resolvian SIEMPRE
                  // por el defecto. Se escriben los defectos directos, que es lo que la
                  // pantalla venia mostrando sin conexion, en vez de aparentar que se lee
                  // un dato que no esta guardado. Si manana hacen falta de verdad, hay que
                  // agregarlos al descargador, no a esta lectura.
                  referencia: null,
                  // OJO: `mapNivelRiesgo` NO sirve aqui. Es el riesgo de la RUTA
                  // (minimo/leve/precaucion/moderado/critico) y este es el del CLIENTE
                  // (VERDE/AMARILLO/ROJO/LISTA_NEGRA): son dos enums distintos con el
                  // mismo nombre de campo. Se normaliza contra los valores de ESTE, y lo
                  // que no coincida cae en VERDE, que es lo que mostraba el `|| 'VERDE'`.
                  nivelRiesgo: nivelRiesgoDeCliente(offCliente.nivelRiesgo),
                  puntaje: 0,
                  enListaNegra: false,
                  estadoAprobacion: 'APROBADO',
                  fechaRegistro: toBogotaDateTimeOffsetIso(new Date()),
                  ocupacion: 'No especificada',
                  avatarColor: 'bg-blue-600',
                  ruta: 'Sin Ruta',
                  fotos: [],
                });
                // Cargar préstamos offline
                const offPrestamos = await offlineStore.getByIndex<OfflinePrestamo>(
                  'prestamos',
                  'by-clienteId',
                  clientId,
                );
                setPrestamos(offPrestamos.map((p) => ({
                  id: p.id,
                  producto: p.tipoPrestamo === 'ARTICULO' ? 'Artículo' : 'Préstamo Efectivo',
                  montoTotal: Number(p.montoTotal || p.monto || 0),
                  montoPagado: Number(p.montoPagado || 0),
                  montoPendiente: Number(p.saldoPendiente || 0),
                  cuotasTotales: p.cantidadCuotas || 0,
                  cuotasPagadas: 0,
                  cuotasPendientes: p.cantidadCuotas || 0,
                  fechaInicio: p.fechaInicio || '',
                  fechaVencimiento: p.fechaFin || '',
                  proximoPago: '',
                  // El estado de la copia offline es texto libre: se normaliza contra la
                  // union de la pantalla y lo que no coincida cae en ACTIVO, que es lo que
                  // ya hacia el `|| 'ACTIVO'`.
                  estado: estadoPrestamoDeUi(p.estado),
                  tasaInteres: p.tasaInteres || 0,
                  frecuencia: p.frecuenciaPago || 'SEMANAL',
                  icono: <Smartphone className="w-5 h-5" />,
                  categoria: p.tipoPrestamo || 'General',
                })));
              }
            } catch { /* ignore */ }
        } finally {
            setLoading(false);
        }
    };
    fetchCliente();
  }, [clientId]);

  
  if (loading) return null;

  if (!clienteData) {
    return (
      <Portal>
        <div className="fixed inset-0 z-[2147483600] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 motion-reduce:animate-none">
           <div className="bg-white p-8 rounded-2xl flex flex-col items-center gap-4">
              <BarChart3 className="w-10 h-10 text-red-500" />
              <p className="font-bold text-slate-800">Cliente no encontrado</p>
              <button onClick={onClose} className="px-4 py-2 bg-slate-900 text-white rounded-xl">Cerrar</button>
           </div>
        </div>
      </Portal>
    );
  }

  return (
    <Portal>
      <div 
        className="fixed inset-0 flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
        style={{ zIndex: MODAL_Z_INDEX }}
        onClick={onClose}
      >
        <div 
          className="w-full bg-white shadow-2xl relative flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 h-[100dvh] md:h-[95vh] rounded-none md:rounded-3xl md:max-w-6xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header del Modal */}
          <div className="absolute top-6 right-6 z-[60]">
            <Tooltip texto="Cerrar">
              <button 
                onClick={onClose}
                className="p-3 bg-white/80 backdrop-blur-xl border border-slate-200 rounded-2xl text-slate-400 hover:text-slate-900 shadow-xl hover:scale-110 transition-all active:scale-95 animate-in fade-in zoom-in-95 duration-200 ease-out motion-reduce:animate-none"
                aria-label="Cerrar"
              >
                <X className="w-6 h-6" />
              </button>
            </Tooltip>
          </div>

          {/* Contenido con Scroll */}
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <ClienteDetalleElegante 
              cliente={clienteData}
              prestamos={prestamos}
              pagos={pagos}
              comentarios={comentarios}
              onSaveNote={(note) => {
                const rol = (rolUsuario || '').toLowerCase();
                const autorNombre =
                  rol === 'admin' ? 'Administrador' :
                  rol === 'superadmin' ? 'Super Administrador' :
                  rol === 'supervisor' ? 'Supervisor' :
                  rol === 'coordinador' ? 'Coordinador' :
                  'Usuario';

                const rolEtiqueta =
                  rol === 'admin' ? 'Admin' :
                  rol === 'superadmin' ? 'SuperAdmin' :
                  rol === 'supervisor' ? 'Supervisor' :
                  rol === 'coordinador' ? 'Coordinador' :
                  'Usuario';

                const newComment: Comentario = {
                  id: Math.random().toString(36).substr(2, 9),
                  fecha: new Date().toLocaleDateString(),
                  autor: autorNombre,
                  rolAutor: rolEtiqueta,
                  contenido: note,
                  tipo: 'observacion',
                  avatarColor: 'bg-indigo-600'
                };
                setComentarios(prev => [newComment, ...prev]);
              }}
            />
          </div>
        </div>
      </div>
    </Portal>
  );
}
