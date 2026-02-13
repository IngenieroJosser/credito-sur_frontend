'use client';

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useNotification } from '@/components/providers/NotificationProvider';
import Portal, { MODAL_Z_INDEX } from '@/components/ui/Portal';
import { clientesService, CrearClienteDto, Cliente } from '@/services/clientes-service';
import MediaUpload from '@/components/ui/MediaUpload';

import { UploadResponse } from '@/services/upload-service';

interface NuevoClienteModalProps {
  onClose: () => void;
  onClienteCreado: (cliente: Cliente) => void;
  cliente?: Cliente | null;
  esEdicion?: boolean;
}

import { useAuth } from '@/hooks/useAuth';

export default function NuevoClienteModal({ onClose, onClienteCreado, cliente = null, esEdicion = false }: NuevoClienteModalProps) {
  const { showNotification } = useNotification();
  const { user: currentUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formulario, setFormulario] = useState({
    dni: cliente?.dni || '',
    nombres: cliente?.nombres || '',
    apellidos: cliente?.apellidos || '',
    telefono: cliente?.telefono || '',
    correo: cliente?.correo || '',
    direccion: cliente?.direccion || '',
    referencia: cliente?.referencia || '',

  });

  const [archivosCargados, setArchivosCargados] = useState<{
    fotoPerfil: UploadResponse | null;
    documentoFrente: UploadResponse | null;
    documentoReverso: UploadResponse | null;
    comprobanteDomicilio: UploadResponse | null;
  }>({
    fotoPerfil: null,
    documentoFrente: null,
    documentoReverso: null,
    comprobanteDomicilio: null,
  });

  /* State for existing files in edit mode */
  const [existingFiles, setExistingFiles] = useState<{
    fotoPerfil: string | null;
    documentoFrente: string | null;
    documentoReverso: string | null;
    comprobanteDomicilio: string | null;
  }>({
    fotoPerfil: null,
    documentoFrente: null,
    documentoReverso: null,
    comprobanteDomicilio: null,
  });

  useEffect(() => {
    if (esEdicion && cliente?.id) {
      // Fetch full client details to get archives
      clientesService.obtenerPorId(cliente.id).then((fullClient: any) => {
        if (fullClient.archivos) {
          const newExisting = { ...existingFiles };
          fullClient.archivos.forEach((file: any) => {
             const url = file.url || file.path || file.ruta; // Fallback
             // Ensure url has full path if needed
             const fullUrl = url.startsWith('http') ? url : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${url}`;
             
             if (file.tipoContenido === 'FOTO_PERFIL') newExisting.fotoPerfil = fullUrl;
             if (file.tipoContenido === 'DOCUMENTO_IDENTIDAD_FRENTE') newExisting.documentoFrente = fullUrl;
             if (file.tipoContenido === 'DOCUMENTO_IDENTIDAD_REVERSO') newExisting.documentoReverso = fullUrl;
             if (file.tipoContenido === 'COMPROBANTE_DOMICILIO') newExisting.comprobanteDomicilio = fullUrl;
          });
          setExistingFiles(newExisting);

        }
      });
    }
  }, [esEdicion, cliente]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Preparar arreglo de archivos
      const archivos = [];
      const mapeoArchivos = [
        { key: 'fotoPerfil', tipo: 'FOTO_PERFIL' },
        { key: 'documentoFrente', tipo: 'DOCUMENTO_IDENTIDAD_FRENTE' },
        { key: 'documentoReverso', tipo: 'DOCUMENTO_IDENTIDAD_REVERSO' },
        { key: 'comprobanteDomicilio', tipo: 'COMPROBANTE_DOMICILIO' },
      ];

      for (const map of mapeoArchivos) {
        const upload = archivosCargados[map.key as keyof typeof archivosCargados];
        if (upload) {
          archivos.push({
            tipoContenido: map.tipo,
            tipoArchivo: upload.mimetype,
            nombreOriginal: upload.filename, // Ajuste temporal
            nombreAlmacenamiento: upload.filename,
            ruta: upload.path,
            tamanoBytes: upload.size,
          });
        }
      }

      const payload: CrearClienteDto = {
        dni: formulario.dni,
        nombres: formulario.nombres,
        apellidos: formulario.apellidos,
        telefono: formulario.telefono,
        correo: formulario.correo || undefined,
        direccion: formulario.direccion || undefined,
        referencia: formulario.referencia || undefined,

        creadoPorId: currentUser?.id || undefined, 
        archivos: archivos.length > 0 ? archivos : undefined,
      };

      let resultado: Cliente;
      
      if (esEdicion && cliente?.id) {
        if (archivos.length > 0) {
           showNotification('warning', 'La actualización de archivos no está soportada aún. Solo se actualizarán los datos de texto.', 'Advertencia');
        }
        resultado = await clientesService.actualizar(cliente.id, payload as any);
      } else {
        resultado = await clientesService.crear(payload);
      }

      showNotification(
        'success', 
        esEdicion ? 'El cliente ha sido actualizado exitosamente' : 'Solicitud de cliente enviada correctamente', 
        esEdicion ? 'Cliente Actualizado' : 'Solicitud Enviada'
      );
      
      onClienteCreado({
        ...formulario,
        ...resultado,
      } as any);
      onClose();

    } catch (error: any) {
      console.error(error);
      const message = error?.message || 'Error al guardar el cliente';
      showNotification('error', message, 'Error');
    } finally {
      setIsSubmitting(false);
    }
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
                <h3 className="text-2xl font-bold text-slate-900">{esEdicion ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
                <p className="text-slate-500">{esEdicion ? 'Modifique la información necesaria del cliente' : 'Complete la información para registrar un cliente'}</p>
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
                    type="text"
                    inputMode="numeric"
                    value={formulario.dni}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setFormulario(prev => ({ ...prev, dni: val }));
                    }}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900"
                    placeholder="Solo números"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Teléfono</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formulario.telefono}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setFormulario(prev => ({ ...prev, telefono: val }));
                    }}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900"
                    placeholder="Solo números"
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
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900 placeholder:text-slate-400 resize-none"
                  rows={3}
                  placeholder="Punto de referencia / observaciones"
                  required
                />
              </div>

              {/* Sección de Fotos */}
              <div className="space-y-4 border-t border-slate-200 pt-6">
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Documentos y Fotos (Opcionales)</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <MediaUpload
                    label="Foto de Perfil"
                    accept="image/*"
                    maxSize={2}
                    existingUrl={existingFiles.fotoPerfil || undefined}
                    onUploadComplete={(data) => setArchivosCargados(prev => ({ ...prev, fotoPerfil: data }))}
                  />

                  <MediaUpload
                    label="Documento Frente"
                    accept="image/*"
                    maxSize={5}
                    existingUrl={existingFiles.documentoFrente || undefined}
                    onUploadComplete={(data) => setArchivosCargados(prev => ({ ...prev, documentoFrente: data }))}
                  />

                  <MediaUpload
                    label="Documento Reverso"
                    accept="image/*"
                    maxSize={5}
                    existingUrl={existingFiles.documentoReverso || undefined}
                    onUploadComplete={(data) => setArchivosCargados(prev => ({ ...prev, documentoReverso: data }))}
                  />

                  <MediaUpload
                    label="Comprobante Domicilio"
                    accept="image/*,video/mp4,video/webm"
                    maxSize={50}
                    existingUrl={existingFiles.comprobanteDomicilio || undefined}
                    onUploadComplete={(data) => setArchivosCargados(prev => ({ ...prev, comprobanteDomicilio: data }))}
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1 bg-white border border-slate-200 text-slate-700 font-bold py-3.5 rounded-xl hover:bg-slate-50 transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-[#08557f] text-white font-bold py-3.5 rounded-xl shadow-xl shadow-[#08557f]/20 hover:bg-[#063a58] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    esEdicion ? 'Guardar Cambios' : 'Registrar Cliente'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Portal>
  );
}
