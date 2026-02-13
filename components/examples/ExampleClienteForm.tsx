'use client';

/**
 * ============================================================================
 * EJEMPLO DE INTEGRACIÓN: MediaUpload en Formulario de Cliente
 * ============================================================================
 * 
 * Este es un ejemplo completo de cómo usar el componente MediaUpload
 * en un formulario real de cliente con todas las características:
 * 
 * ✅ Vista previa de imágenes
 * ✅ Estados de carga visual
 * ✅ Animación de éxito (iluminación verde)
 * ✅ Conservación de imágenes existentes al editar
 * ✅ Grid responsive de 4 campos de upload
 */

import { useState } from 'react';
import MediaUpload from '@/components/ui/MediaUpload';
import { User, FileText, Camera } from 'lucide-react';

interface ExampleClienteFormProps {
  cliente?: {
    id: string;
    fotoPerfilUrl?: string;
    documentoFrenteUrl?: string;
    documentoReversoUrl?: string;
    comprobanteDomicilioUrl?: string;
  };
  esEdicion?: boolean;
}

export default function ExampleClienteForm({ cliente, esEdicion = false }: ExampleClienteFormProps) {
  const [formData, setFormData] = useState({
    nombres: '',
    apellidos: '',
    dni: '',
    telefono: ''
  });

  const [archivos, setArchivos] = useState({
    fotoPerfil: null as File | null,
    documentoFrente: null as File | null,
    documentoReverso: null as File | null,
    comprobanteDomicilio: null as File | null
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('📤 Datos del formulario:', formData);
    console.log('📸 Archivos adjuntos:', archivos);
    
    // Aquí iría la lógica de envío al backend
    const formDataToSend = new FormData();
    
    // Agregar campos de texto
    Object.entries(formData).forEach(([key, value]) => {
      formDataToSend.append(key, value);
    });

    // Agregar archivos solo si fueron seleccionados
    if (archivos.fotoPerfil) {
      formDataToSend.append('fotoPerfil', archivos.fotoPerfil);
    }
    if (archivos.documentoFrente) {
      formDataToSend.append('documentoFrente', archivos.documentoFrente);
    }
    if (archivos.documentoReverso) {
      formDataToSend.append('documentoReverso', archivos.documentoReverso);
    }
    if (archivos.comprobanteDomicilio) {
      formDataToSend.append('comprobanteDomicilio', archivos.comprobanteDomicilio);
    }

    // await clientesService.crear(formDataToSend);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            {esEdicion ? '📝 Editar Cliente' : '✨ Nuevo Cliente'}
          </h1>
          <p className="text-slate-600">
            {esEdicion 
              ? 'Las imágenes existentes se conservan. Solo sube nuevas si deseas reemplazarlas.'
              : 'Complete la información y adjunte los documentos requeridos'
            }
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Información Básica */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <User className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold text-slate-900">Información Personal</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Nombres</label>
                <input
                  type="text"
                  value={formData.nombres}
                  onChange={(e) => setFormData(prev => ({ ...prev, nombres: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="Juan Carlos"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Apellidos</label>
                <input
                  type="text"
                  value={formData.apellidos}
                  onChange={(e) => setFormData(prev => ({ ...prev, apellidos: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="Pérez García"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">DNI / Cédula</label>
                <input
                  type="text"
                  value={formData.dni}
                  onChange={(e) => setFormData(prev => ({ ...prev, dni: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="1234567890"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Teléfono</label>
                <input
                  type="tel"
                  value={formData.telefono}
                  onChange={(e) => setFormData(prev => ({ ...prev, telefono: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="3001234567"
                  required
                />
              </div>
            </div>
          </div>

          {/* Documentos y Fotografías */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <Camera className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold text-slate-900">Documentos y Fotografías</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Foto de Perfil */}
              <MediaUpload
                label="📸 Foto de Perfil"
                accept="image/*"
                maxSize={2}
                existingUrl={cliente?.fotoPerfilUrl}
                onChange={(file) => setArchivos(prev => ({ ...prev, fotoPerfil: file }))}
              />

              {/* Documento Frente */}
              <MediaUpload
                label="🪪 Documento de Identidad (Frente)"
                accept="image/*"
                maxSize={5}
                existingUrl={cliente?.documentoFrenteUrl}
                onChange={(file) => setArchivos(prev => ({ ...prev, documentoFrente: file }))}
              />

              {/* Documento Reverso */}
              <MediaUpload
                label="🪪 Documento de Identidad (Reverso)"
                accept="image/*"
                maxSize={5}
                existingUrl={cliente?.documentoReversoUrl}
                onChange={(file) => setArchivos(prev => ({ ...prev, documentoReverso: file }))}
              />

              {/* Comprobante Domicilio */}
              <MediaUpload
                label="🏠 Comprobante de Domicilio"
                accept="image/*,application/pdf"
                maxSize={10}
                existingUrl={cliente?.comprobanteDomicilioUrl}
                onChange={(file) => setArchivos(prev => ({ ...prev, comprobanteDomicilio: file }))}
              />
            </div>

            {/* Info helper */}
            <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                <div className="text-sm text-blue-900">
                  <p className="font-bold mb-1">💡 Instrucciones:</p>
                  <ul className="space-y-1 text-blue-800">
                    <li>• Las imágenes deben ser claras y legibles</li>
                    <li>• Formatos aceptados: JPG, PNG, PDF</li>
                    <li>• Al editar, solo sube imágenes si deseas reemplazarlas</li>
                    <li>• Verás una ✅ iluminación verde cuando la imagen se haya cargado</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center justify-end gap-4">
            <button
              type="button"
              className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
            >
              Cancelar
            </button>
            
            <button
              type="submit"
              className="px-8 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30"
            >
              {esEdicion ? 'Actualizar Cliente' : 'Crear Cliente'}
            </button>
          </div>
        </form>

        {/* Preview de datos (para demo) */}
        <div className="mt-8 p-6 bg-slate-900 text-white rounded-2xl">
          <h3 className="text-sm font-bold text-slate-400 mb-4">📊 PREVIEW DE DATOS (Demo)</h3>
          <div className="grid grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <p className="text-slate-400">Form Data:</p>
              <pre className="text-emerald-400">{JSON.stringify(formData, null, 2)}</pre>
            </div>
            <div>
              <p className="text-slate-400">Archivos:</p>
              <pre className="text-blue-400">
                {JSON.stringify({
                  fotoPerfil: archivos.fotoPerfil?.name || 'No seleccionado',
                  documentoFrente: archivos.documentoFrente?.name || 'No seleccionado',
                  documentoReverso: archivos.documentoReverso?.name || 'No seleccionado',
                  comprobanteDomicilio: archivos.comprobanteDomicilio?.name || 'No seleccionado'
                }, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
