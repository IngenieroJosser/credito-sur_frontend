'use client';

import { useState, useEffect } from 'react';
import { X, BarChart3 } from 'lucide-react';
import ClienteDetalleElegante, { Cliente as ClienteUI, Prestamo, Pago, Comentario } from './DetalleCliente';
import { clientesService } from '@/services/clientes-service';
import { Smartphone, DollarSign } from 'lucide-react';
import { createPortal } from 'react-dom';
import { offlineStore } from '@/lib/offline/offlineDb';

interface ClientePortalModalProps {
  clientId: string;
  onClose: () => void;
  rolUsuario?: string;
}

const MODAL_Z_INDEX = 2147483600;

function Portal({ children }: { children: React.ReactNode }) {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}

export default function ClientePortalModal({ clientId, onClose, rolUsuario = 'contador' }: ClientePortalModalProps) {
  const [clienteData, setClienteData] = useState<ClienteUI | null>(null);
  const [loading, setLoading] = useState(true);
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);

  const [comentarios, setComentarios] = useState<Comentario[]>([]);

  useEffect(() => {
    const fetchCliente = async () => {
        try {
            const data = await clientesService.obtenerPorId(clientId);
            if (data) {
                // Adaptar data backend a UI
                // Adaptar data backend a UI
                const fotos: string[] = Array.from(
                  new Set(
                    ((data as any).archivos || [])
                      .map((a: any) => a.url || a.path || a.ruta)
                      .filter(Boolean),
                  ),
                );

                setClienteData({
                    id: data.id,
                    codigo: data.codigo || 'S/C',
                    dni: data.dni,
                    nombres: data.nombres,
                    apellidos: data.apellidos,
                    correo: data.correo,
                    telefono: data.telefono,
                    direccion: data.direccion || null,
                    referencia: data.referencia || null,
                    nivelRiesgo: (data.nivelRiesgo as any) || 'VERDE',
                    puntaje: data.puntaje || 0,
                    enListaNegra: data.enListaNegra || false,
                    estadoAprobacion: data.estadoAprobacion || 'APROBADO',
                    fechaRegistro: data.creadoEn || new Date().toISOString(),
                    ocupacion: 'No especificada',
                    avatarColor: 'bg-blue-600',
                    ruta: (data as any).asignacionesRuta?.[0]?.ruta?.nombre || 'Sin Ruta',
                    fotos: fotos
                });
                
                const prestamosBackend: any[] = (data as any).prestamos || [];
                setPrestamos(prestamosBackend.map(p => {
                    const cuotas = p.cuotas || [];
                    const cuotasPagadas = cuotas.filter((c: any) => c.estado === 'PAGADO' || c.estado === 'PAGADA').length;
                    const totalCuotas = p.cantidadCuotas || cuotas.length || 0;
                    
                    const principal = Number(p.monto || 0);
                    const tasa = Number(p.tasaInteres || 0);
                    const meses = Number(p.plazoMeses || 1);
                    let interesTotal = Number(p.interesTotal || 0);
                    
                    if (interesTotal === 0 && tasa > 0 && meses > 0) {
                      interesTotal = (principal * tasa * meses) / 100;
                    }
                
                    const montoTotal = principal + interesTotal;
                    const saldoPendiente = Number(p.saldoPendiente || 0);

                    return {
                        id: p.id,
                        producto: p.tipoPrestamo === 'ARTICULO' ? (p.producto?.nombre || 'Artículo') : 'Préstamo Efectivo',
                        montoTotal: montoTotal,
                        montoPagado: Number(p.totalPagado || 0),
                        montoPendiente: (saldoPendiente === principal && interesTotal > 0) ? montoTotal : saldoPendiente,
                        cuotasTotales: totalCuotas,
                        cuotasPagadas: cuotasPagadas,
                        cuotasPendientes: Math.max(0, totalCuotas - cuotasPagadas),
                        fechaInicio: p.fechaInicio,
                        fechaVencimiento: p.fechaFin,
                        proximoPago: cuotas.find((c: any) => c.estado === 'PENDIENTE' || c.estado === 'PARCIAL' || c.estado === 'VENCIDA' || c.estado === 'VENCIDO')?.fechaVencimiento || p.fechaFin,
                        estado: p.estado || 'ACTIVO',
                        tasaInteres: tasa,
                        frecuencia: p.frecuenciaPago || 'SEMANAL',
                        icono: <Smartphone className="w-5 h-5" />,
                        categoria: p.tipoPrestamo || 'General'
                    };
                }));
                
                const pagosBackend: any[] = (data as any).pagos || [];
                setPagos(pagosBackend.map(p => ({
                    id: String(p.id),
                    fecha: p.fechaPago,
                    monto: Number(p.montoTotal || 0),
                    cuota: p.detalles?.[0]?.cuota?.numeroCuota || 1,
                    referencia: p.numeroPago,
                    metodo: p.metodoPago || 'EFECTIVO',
                    estado: 'confirmado',
                    icono: <DollarSign className="w-5 h-5" />
                })));
            }
        } catch (error) {
            console.error("Error cargando cliente full", error);
            // Fallback offline: cargar de IndexedDB
            try {
              const offCliente = await offlineStore.getById<any>('clientes', clientId);
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
                  referencia: offCliente.referencia || null,
                  nivelRiesgo: offCliente.nivelRiesgo || 'VERDE',
                  puntaje: offCliente.puntaje || 0,
                  enListaNegra: offCliente.enListaNegra || false,
                  estadoAprobacion: offCliente.estadoAprobacion || 'APROBADO',
                  fechaRegistro: offCliente.creadoEn || new Date().toISOString(),
                  ocupacion: 'No especificada',
                  avatarColor: 'bg-blue-600',
                  ruta: offCliente.rutaNombre || 'Sin Ruta',
                  fotos: [],
                });
                // Cargar préstamos offline
                const offPrestamos = await offlineStore.getByIndex<any>('prestamos', 'by-clienteId', clientId);
                setPrestamos(offPrestamos.map((p: any) => ({
                  id: p.id,
                  producto: p.tipoPrestamo === 'ARTICULO' ? 'Artículo' : 'Préstamo Efectivo',
                  montoTotal: Number(p.montoTotal || p.monto || 0),
                  montoPagado: Number(p.totalPagado || 0),
                  montoPendiente: Number(p.saldoPendiente || 0),
                  cuotasTotales: p.cantidadCuotas || 0,
                  cuotasPagadas: 0,
                  cuotasPendientes: p.cantidadCuotas || 0,
                  fechaInicio: p.fechaInicio || '',
                  fechaVencimiento: p.fechaFin || '',
                  proximoPago: '',
                  estado: p.estado || 'ACTIVO',
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
        <div className="fixed inset-0 z-[2147483600] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
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
        className="fixed inset-0 flex items-center justify-center p-0 md:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
        style={{ zIndex: MODAL_Z_INDEX }}
        onClick={onClose}
      >
        <div 
          className="w-full h-full md:h-[95vh] max-w-6xl bg-white md:rounded-3xl shadow-2xl relative flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header del Modal */}
          <div className="absolute top-6 right-6 z-[60]">
            <button 
              onClick={onClose}
              className="p-3 bg-white/80 backdrop-blur-xl border border-slate-200 rounded-2xl text-slate-400 hover:text-slate-900 shadow-xl hover:scale-110 transition-all active:scale-95"
            >
              <X className="w-6 h-6" />
            </button>
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
