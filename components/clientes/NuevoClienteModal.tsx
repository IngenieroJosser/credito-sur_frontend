'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { useNotification } from '@/components/providers/NotificationProvider';
import Portal, { MODAL_Z_INDEX } from '@/components/ui/Portal';
import { Cliente } from '@/services/clientes-service';

interface NuevoClienteModalProps {
  onClose: () => void;
  onClienteCreado: (cliente: Cliente) => void;
}

export default function NuevoClienteModal({ onClose, onClienteCreado }: NuevoClienteModalProps) {
  const { showNotification } = useNotification();
  const [formulario, setFormulario] = useState({
    dni: '',
    nombres: '',
    apellidos: '',
    telefono: '',
    correo: '',
    direccion: '',
    referencia: '',
  });

  const [fotos, setFotos] = useState({
    fotoPerfil: null as File | null,
    documentoFrente: null as File | null,
    documentoReverso: null as File | null,
    comprobanteDomicilio: null as File | null,
  });

  // Keep for future implementation of photo uploads
  if (false && fotos) setFotos(fotos);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulation of creation
    const nuevoCliente: Cliente = {
      id: `NEW-${Date.now()}`,
      nombres: formulario.nombres,
      apellidos: formulario.apellidos,
      dni: formulario.dni,
      telefono: formulario.telefono,
      correo: formulario.correo || null,
      direccion: formulario.direccion || null,
      referencia: formulario.referencia || null,
      codigo: `CL-${Math.floor(Math.random() * 1000)}`,
      nivelRiesgo: 'VERDE', 
      puntaje: 100,
      enListaNegra: false,
      estadoAprobacion: 'APROBADO'
    };
    
    // Simulate API delay
    setTimeout(() => {
        showNotification('success', 'El cliente ha sido registrado exitosamente', 'Cliente Registrado');
        onClienteCreado(nuevoCliente);
        onClose();
    }, 500);
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
                <h3 className="text-2xl font-bold text-slate-900">Nuevo Cliente</h3>
                <p className="text-slate-500">Complete la información para registrar un cliente</p>
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
                  <label className="block text-sm font-bold text-slate-700 mb-2">CC o Documento</label>
                  <input
                    value={formulario.dni}
                    onChange={(e) => setFormulario(prev => ({ ...prev, dni: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900"
                    placeholder="1234567890"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Teléfono</label>
                  <input
                    value={formulario.telefono}
                    onChange={(e) => setFormulario(prev => ({ ...prev, telefono: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900"
                    placeholder="300 123 4567"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Nombres</label>
                  <input
                    value={formulario.nombres}
                    onChange={(e) => setFormulario(prev => ({ ...prev, nombres: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Apellidos</label>
                  <input
                    value={formulario.apellidos}
                    onChange={(e) => setFormulario(prev => ({ ...prev, apellidos: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Correo (Opcional)</label>
                <input
                  type="email"
                  value={formulario.correo}
                  onChange={(e) => setFormulario(prev => ({ ...prev, correo: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900 placeholder:text-slate-400"
                  placeholder="correo@dominio.com"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Dirección</label>
                <input
                  value={formulario.direccion}
                  onChange={(e) => setFormulario(prev => ({ ...prev, direccion: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900 placeholder:text-slate-400"
                  placeholder="Dirección del cliente"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Referencia</label>
                <textarea
                  value={formulario.referencia}
                  onChange={(e) => setFormulario(prev => ({ ...prev, referencia: e.target.value }))}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-sl ate-900 placeholder:text-slate-400 resize-none"
                  rows={3}
                  placeholder="Punto de referencia / observaciones"
                  required
                />
              </div>

              {/* Sección de Fotos */}
              <div className="space-y-4 border-t border-slate-200 pt-6">
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Documentos y Fotos (Obligatorias)</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-2">Foto de Perfil</label>
                    <input
                      type="file"
                      accept="image/*"
                      required
                      onChange={(e) => setFotos(prev => ({ ...prev, fotoPerfil: e.target.files?.[0] || null }))}
                      className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-2">Documento Frente</label>
                    <input
                      type="file"
                      accept="image/*"
                      required
                      onChange={(e) => setFotos(prev => ({ ...prev, documentoFrente: e.target.files?.[0] || null }))}
                      className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-2">Documento Reverso</label>
                    <input
                      type="file"
                      accept="image/*"
                      required
                      onChange={(e) => setFotos(prev => ({ ...prev, documentoReverso: e.target.files?.[0] || null }))}
                      className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-2">Comprobante Domicilio</label>
                    <input
                      type="file"
                      accept="image/*"
                      required
                      onChange={(e) => setFotos(prev => ({ ...prev, comprobanteDomicilio: e.target.files?.[0] || null }))}
                      className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-white border border-slate-200 text-slate-700 font-bold py-3.5 rounded-xl hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#08557f] text-white font-bold py-3.5 rounded-xl shadow-xl shadow-[#08557f]/20 hover:bg-[#063a58] active:scale-[0.98] transition-all"
                >
                  Guardar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Portal>
  );
}
