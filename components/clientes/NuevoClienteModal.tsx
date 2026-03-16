'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useNotification } from '@/components/providers/NotificationProvider';
import Portal, { MODAL_Z_INDEX } from '@/components/ui/Portal';
import { clientesService, CrearClienteDto, Cliente } from '@/services/clientes-service';
import MediaUpload from '@/components/ui/MediaUpload';
import { enqueueClienteUpdate } from '@/lib/offline/offlineQueue';

import { resolveMediaUrl } from '@/lib/utils';

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
  const mouseDownTargetRef = useRef<EventTarget | null>(null);
  const [formulario, setFormulario] = useState({
    dni: cliente?.dni || '',
    nombres: cliente?.nombres || '',
    apellidos: cliente?.apellidos || '',
    telefono: cliente?.telefono || '',
    correo: cliente?.correo || '',
    direccion: cliente?.direccion || '',
    referencia: cliente?.referencia || '',
    enListaNegra: cliente?.enListaNegra || false,
    nivelRiesgo: cliente?.nivelRiesgo || 'VERDE',
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

  // Guardar archivos originales que NO se pierden al limpiar estado
  const [archivosOriginales, setArchivosOriginales] = useState<{
    fotoPerfil: any | null;
    documentoFrente: any | null;
    documentoReverso: any | null;
    comprobanteDomicilio: any | null;
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
          const newOriginales: any = {
            fotoPerfil: null,
            documentoFrente: null,
            documentoReverso: null,
            comprobanteDomicilio: null,
          };

          fullClient.archivos.forEach((file: any) => {
             const url = file.url || file.path || file.ruta;
             const fullUrl = resolveMediaUrl(url);
             
             if (file.tipoContenido === 'FOTO_PERFIL') {
               newExisting.fotoPerfil = fullUrl;
               newOriginales.fotoPerfil = file;
             }
             if (file.tipoContenido === 'DOCUMENTO_IDENTIDAD_FRENTE') {
               newExisting.documentoFrente = fullUrl;
               newOriginales.documentoFrente = file;
             }
             if (file.tipoContenido === 'DOCUMENTO_IDENTIDAD_REVERSO') {
               newExisting.documentoReverso = fullUrl;
               newOriginales.documentoReverso = file;
             }
             if (file.tipoContenido === 'COMPROBANTE_DOMICILIO') {
               newExisting.comprobanteDomicilio = fullUrl;
               newOriginales.comprobanteDomicilio = file;
             }
          });
          setExistingFiles(newExisting);
          setArchivosOriginales(newOriginales);
        }
      });
    }
  }, [esEdicion, cliente]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Preparar arreglo de archivos
    const archivos: any[] = [];
    const mapeoArchivos = [
      { key: 'fotoPerfil', tipo: 'FOTO_PERFIL' },
      { key: 'documentoFrente', tipo: 'DOCUMENTO_IDENTIDAD_FRENTE' },
      { key: 'documentoReverso', tipo: 'DOCUMENTO_IDENTIDAD_REVERSO' },
      { key: 'comprobanteDomicilio', tipo: 'COMPROBANTE_DOMICILIO' },
    ];

    for (const map of mapeoArchivos) {
      // Primero verificar si hay un archivo nuevo cargado
      const upload = archivosCargados[map.key as keyof typeof archivosCargados];
      if (upload) {
        // Archivo NUEVO subido
        archivos.push({
          tipoContenido: map.tipo,
          tipoArchivo: upload.mimetype,
          nombreOriginal: (upload as any).originalName || upload.filename,
          nombreAlmacenamiento: (upload as any).publicId || upload.filename,
          ruta: (upload as any).publicId || upload.filename,
          url: upload.path,
          tamanoBytes: upload.size,
        });
      } else if (esEdicion && archivosOriginales[map.key as keyof typeof archivosOriginales]) {
        // Archivo EXISTENTE que NO se cambió (usar archivosOriginales que no se limpian)
        const archivoOriginal = archivosOriginales[map.key as keyof typeof archivosOriginales];
        if (archivoOriginal) {
          archivos.push({
            tipoContenido: archivoOriginal.tipoContenido,
            tipoArchivo: archivoOriginal.tipoArchivo,
            nombreOriginal: archivoOriginal.nombreOriginal,
            nombreAlmacenamiento: archivoOriginal.nombreAlmacenamiento,
            ruta: archivoOriginal.ruta,
            url: archivoOriginal.url,
            tamanoBytes: archivoOriginal.tamanoBytes,
          });
        }
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
      enListaNegra: esEdicion ? formulario.enListaNegra : undefined,
      nivelRiesgo: esEdicion ? formulario.nivelRiesgo : (formulario.nivelRiesgo as any),
    };

    try {
      let resultado: Cliente;
      
      if (esEdicion && cliente?.id) {
        // Enviar archivos junto con los datos al actualizar
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
      console.error('[NuevoClienteModal] Error:', error);
      
      // Si el servicio no pudo manejar el modo offline automáticamente (ej. navigator.onLine es true pero falló)
      // o si queremos asegurar que se guarde localmente ante cualquier error de conexión
      const isNetworkError = !navigator.onLine || error?.statusCode === 0 || error?.code === 'ERR_NETWORK';
      
      if (isNetworkError) {
        try {
          const { enqueueClienteCreate, enqueueClienteUpdate } = await import('@/lib/offline/offlineQueue');
          
          if (esEdicion && cliente?.id) {
            await enqueueClienteUpdate(cliente.id, payload as any, `${formulario.nombres} ${formulario.apellidos}`);
          } else {
            await enqueueClienteCreate(payload as any, `${formulario.nombres} ${formulario.apellidos}`);
          }
          
          showNotification('warning', 'Sin conexión con el servidor. La operación se guardó localmente y se enviará automáticamente al reconectar.', 'Modo Offline');
          
          onClienteCreado({
            ...formulario,
            id: `offline-${Date.now()}`,
            codigo: 'OFFLINE',
            estadoAprobacion: 'PENDIENTE',
            creadoEn: new Date().toISOString(),
          } as any);
          
          onClose();
          return;
        } catch (queueError) {
          console.error('[NuevoClienteModal] Falló el guardado en cola:', queueError);
        }
      }

      if (error?.statusCode === 409) {
        showNotification('warning', error.message || 'El cliente ya existe.', 'Conflicto');
      } else {
        showNotification('error', error.message || 'No se pudo guardar el cliente', 'Error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Portal>
      <div
        className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
        style={{ zIndex: MODAL_Z_INDEX }}
        onMouseDown={(e) => { mouseDownTargetRef.current = e.target }}
        onMouseUp={(e) => {
          if (e.target === e.currentTarget && mouseDownTargetRef.current === e.currentTarget) {
            onClose();
          }
          mouseDownTargetRef.current = null;
        }}
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
                  required
                />
              </div>

              {esEdicion && (
                <div className="space-y-4 border-t border-slate-200 pt-6">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <div>
                      <h4 className="font-bold text-slate-900">Lista Negra</h4>
                      <p className="text-xs text-slate-500">Bloquea al cliente para nuevos créditos</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const newEnListaNegra = !formulario.enListaNegra;
                        setFormulario(prev => ({ 
                          ...prev, 
                          enListaNegra: newEnListaNegra,
                          nivelRiesgo: newEnListaNegra ? 'LISTA_NEGRA' : (prev.nivelRiesgo === 'LISTA_NEGRA' ? 'VERDE' : prev.nivelRiesgo)
                        }));
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                        formulario.enListaNegra ? 'bg-red-500' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          formulario.enListaNegra ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}

              {/* Sección de Fotos */}
              <div className="space-y-4 border-t border-slate-200 pt-6">
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Documentos y Fotos (Opcionales)</h4>
                <p className="text-xs text-slate-500 font-medium">
                  Formatos soportados: JPG, JPEG, PNG, WEBP. (Comprobante: también MP4, WEBM)
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <MediaUpload
                    label="Foto de Perfil"
                    accept="image/jpeg,image/png,image/webp"
                    maxSize={2}
                    existingUrl={existingFiles.fotoPerfil || undefined}
                    uploadMeta={{
                      dni: formulario.dni,
                      nombres: formulario.nombres,
                      apellidos: formulario.apellidos,
                      tipoContenido: 'FOTO_PERFIL',
                    }}
                    onChange={(file) => {
                      if (!file) {
                        setExistingFiles(prev => ({ ...prev, fotoPerfil: null }));
                        setArchivosCargados(prev => ({ ...prev, fotoPerfil: null }));
                        setArchivosOriginales(prev => ({ ...prev, fotoPerfil: null }));
                      }
                    }}
                    onUploadComplete={(data) => setArchivosCargados(prev => ({ ...prev, fotoPerfil: data }))}
                  />

                  <MediaUpload
                    label="Documento Frente"
                    accept="image/jpeg,image/png,image/webp"
                    maxSize={5}
                    existingUrl={existingFiles.documentoFrente || undefined}
                    uploadMeta={{
                      dni: formulario.dni,
                      nombres: formulario.nombres,
                      apellidos: formulario.apellidos,
                      tipoContenido: 'DOCUMENTO_IDENTIDAD_FRENTE',
                    }}
                    onChange={(file) => {
                      if (!file) {
                        setExistingFiles(prev => ({ ...prev, documentoFrente: null }));
                        setArchivosCargados(prev => ({ ...prev, documentoFrente: null }));
                        setArchivosOriginales(prev => ({ ...prev, documentoFrente: null }));
                      }
                    }}
                    onUploadComplete={(data) => setArchivosCargados(prev => ({ ...prev, documentoFrente: data }))}
                  />

                  <MediaUpload
                    label="Documento Reverso"
                    accept="image/jpeg,image/png,image/webp"
                    maxSize={5}
                    existingUrl={existingFiles.documentoReverso || undefined}
                    uploadMeta={{
                      dni: formulario.dni,
                      nombres: formulario.nombres,
                      apellidos: formulario.apellidos,
                      tipoContenido: 'DOCUMENTO_IDENTIDAD_REVERSO',
                    }}
                    onChange={(file) => {
                      if (!file) {
                        setExistingFiles(prev => ({ ...prev, documentoReverso: null }));
                        setArchivosCargados(prev => ({ ...prev, documentoReverso: null }));
                        setArchivosOriginales(prev => ({ ...prev, documentoReverso: null }));
                      }
                    }}
                    onUploadComplete={(data) => setArchivosCargados(prev => ({ ...prev, documentoReverso: data }))}
                  />

                  <MediaUpload
                    label="Comprobante Domicilio"
                    accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
                    maxSize={50}
                    existingUrl={existingFiles.comprobanteDomicilio || undefined}
                    uploadMeta={{
                      dni: formulario.dni,
                      nombres: formulario.nombres,
                      apellidos: formulario.apellidos,
                      tipoContenido: 'COMPROBANTE_DOMICILIO',
                    }}
                    onChange={(file) => {
                      if (!file) {
                        setExistingFiles(prev => ({ ...prev, comprobanteDomicilio: null }));
                        setArchivosCargados(prev => ({ ...prev, comprobanteDomicilio: null }));
                        setArchivosOriginales(prev => ({ ...prev, comprobanteDomicilio: null }));
                      }
                    }}
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
