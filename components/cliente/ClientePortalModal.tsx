'use client';

import React from 'react';
import { X, BarChart3 } from 'lucide-react';
import ClienteDetalleElegante, { Cliente, Prestamo, Pago, Comentario } from './DetalleCliente';
import { MOCK_CLIENTES } from '@/services/clientes-service';
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
  // Buscar datos del cliente (mismo patrón que en la página)
  // En un entorno real, esto sería un fetch
  const clienteEncontrado = MOCK_CLIENTES.find(c => c.id === clientId) || MOCK_CLIENTES[0];
  
  if (!clienteEncontrado) {
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

  // Preparar datos para el componente DetalleCliente
  const cliente: Cliente = {
    ...clienteEncontrado,
    fechaRegistro: clienteEncontrado.fechaRegistro || 'No disponible',
    avatarColor: 'bg-blue-600'
  };

  const prestamos: Prestamo[] = (((clienteEncontrado as unknown) as Record<string, unknown>).prestamos as Record<string, unknown>[] || []).map((p) => ({
    ...(p as Record<string, unknown>),
    icono: <Smartphone className="w-5 h-5" />,
    categoria: 'General',
  })) as Prestamo[];

  const pagos: Pago[] = (((clienteEncontrado as unknown) as Record<string, unknown>).pagos as Record<string, unknown>[] || []).map((p) => ({
    ...(p as Record<string, unknown>),
    icono: <DollarSign className="w-5 h-5" />,
    estado: 'confirmado',
  })) as Pago[];

  const comentarios: Comentario[] = [];

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
              cliente={cliente}
              prestamos={prestamos}
              pagos={pagos}
              comentarios={comentarios}
              rolUsuario={rolUsuario}
              viewOnly={true}
            />
          </div>
        </div>
      </div>
    </Portal>
  );
}
