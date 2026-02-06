'use client';

import { useState, useEffect } from 'react';
import { X, BarChart3 } from 'lucide-react';
import ClienteDetalleElegante, { Cliente as ClienteUI, Prestamo, Pago, Comentario } from './DetalleCliente';
import { clientesService } from '@/services/clientes-service';
import { Smartphone, DollarSign } from 'lucide-react';
import { createPortal } from 'react-dom';

interface ClientePortalModalProps {
  clientId: string;
  onClose: () => void;
  rolUsuario?: string;
}

const MODAL_Z_INDEX = 2147483647;

function Portal({ children }: { children: React.ReactNode }) {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}

export default function ClientePortalModal({ clientId, onClose, rolUsuario = 'contador' }: ClientePortalModalProps) {
  const [clienteData, setClienteData] = useState<ClienteUI | null>(null);
  const [loading, setLoading] = useState(true);
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);

  useEffect(() => {
    const fetchCliente = async () => {
        try {
            const data = await clientesService.obtenerPorId(clientId);
            if (data) {
                // Adaptar data backend a UI
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
                    estadoAprobacion: 'APROBADO', // Default si no viene
                    fechaRegistro: (data as any).fechaRegistro ? new Date((data as any).fechaRegistro).toISOString() : new Date().toISOString(),
                    ocupacion: 'No especificada',
                    avatarColor: 'bg-blue-600',
                    ruta: data.rutaId ? `Ruta ${data.rutaId}` : 'Sin Ruta'
                });
                
                // Si el backend devolviera prestamos y pagos (actualmente obtenerPorId retorna Cliente con include?)
                // Por ahora inicializamos vacios o mocked si no vienen
                const prestamosBackend: any[] = (data as any).prestamos || [];
                setPrestamos(prestamosBackend.map(p => ({
                    id: p.id,
                    producto: 'Préstamo Personal', // Default
                    montoTotal: Number(p.monto || 0),
                    montoPagado: 0, // Mock
                    montoPendiente: Number(p.monto || 0),
                    cuotasTotales: 10, // Mock
                    cuotasPagadas: 0,
                    cuotasPendientes: 10,
                    fechaInicio: p.fechaInicio ? new Date(p.fechaInicio).toLocaleDateString() : new Date().toLocaleDateString(),
                    fechaVencimiento: new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString(),
                    proximoPago: new Date(Date.now() + 24*60*60*1000).toLocaleDateString(),
                    estado: p.estado || 'ACTIVO',
                    tasaInteres: 20,
                    frecuencia: 'DIARIO',
                    icono: <Smartphone className="w-5 h-5" />,
                    categoria: 'Personal'
                })));
                
                const pagosBackend: any[] = (data as any).pagos || [];
                setPagos(pagosBackend.map(p => ({
                    id: String(p.id),
                    fecha: p.fecha ? new Date(p.fecha).toLocaleDateString() : new Date().toLocaleDateString(),
                    monto: Number(p.monto || 0),
                    cuota: 1, // Default
                    referencia: `Pago ${p.id}`,
                    metodo: 'EFECTIVO',
                    estado: 'confirmado',
                    comprobante: undefined,
                    icono: <DollarSign className="w-5 h-5" />
                })));
            }
        } catch (error) {
            console.error("Error cargando cliente full", error);
        } finally {
            setLoading(false);
        }
    };
    fetchCliente();
  }, [clientId]);
  
  const comentarios: Comentario[] = []; 

  if (loading) return null;

  if (!clienteData) {
    return (
      <Portal>
        <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
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
            />
          </div>
        </div>
      </div>
    </Portal>
  );
}
