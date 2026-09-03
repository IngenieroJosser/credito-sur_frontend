'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useNotification } from '@/components/providers/NotificationProvider';
import Portal, { MODAL_Z_INDEX } from '@/components/ui/Portal';
import { clientesService, CrearClienteDto, Cliente } from '@/services/clientes-service';
import MediaUpload from '@/components/ui/MediaUpload';
import FieldLabel from '@/components/ui/FieldLabel';
import { enqueueClienteUpdate } from '@/lib/offline/offlineQueue';
import { toBogotaDateTimeOffsetIso } from '@/lib/rutas-core';

import { resolveMediaUrl } from '@/lib/utils';

import { UploadResponse } from '@/services/upload-service';

interface NuevoClienteModalProps {
  onClose: () => void;
  onClienteCreado: (cliente: Cliente) => void;
  cliente?: Cliente | null;
  esEdicion?: boolean;
}

import { useAuth } from '@/hooks/useAuth';

/**
 * Estilo unico de los campos del formulario.
 *
 * Antes cada campo repetia la clase entera, y todos llevaban `focus:ring-0`,
 * que borra el indicador de foco: navegando con el teclado no se veia en que
 * campo estabas. Ahora el campo enfocado se marca con el azul de la marca.
 */
const CLASE_CAMPO =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium text-slate-900 transition-colors placeholder:text-slate-400 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20';



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
    referencia1Nombre: (cliente as any)?.referencia1Nombre || '',
    referencia1Telefono: (cliente as any)?.referencia1Telefono || '',
    referencia2Nombre: (cliente as any)?.referencia2Nombre || '',
    referencia2Telefono: (cliente as any)?.referencia2Telefono || '',
    enListaNegra: (cliente as any)?.enListaNegra || false,
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
      // Evitar recargas si ya tenemos los datos y el ID no ha cambiado
      if (archivosOriginales.fotoPerfil || archivosOriginales.documentoFrente) {
         // Ya cargado, opcionalmente podrías comparar IDs
      }

      clientesService.obtenerPorId(cliente.id).then((fullClient: any) => {
        if (fullClient.archivos) {
          const newExisting = { ...existingFiles };
          const newOriginales: any = {
            fotoPerfil: null,
            documentoFrente: null,
            documentoReverso: null,
            comprobanteDomicilio: null,
          };

          let changed = false;
          fullClient.archivos.forEach((file: any) => {
             const url = file.url || file.path || file.ruta;
             if (!url) return;
             const fullUrl = resolveMediaUrl(url);
             
             changed = true;
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
          
          if (changed) {
            setExistingFiles(newExisting);
            setArchivosOriginales(newOriginales);
          }
        }
      }).catch(err => console.error('Error fetching full client details:', err));
    }
  }, [esEdicion, cliente?.id]); // Usar ID como dependencia para mayor estabilidad

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
          url: (upload as any).path || (upload as any).url,
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
      referencia1Nombre: formulario.referencia1Nombre || undefined,
      referencia1Telefono: formulario.referencia1Telefono || undefined,
      referencia2Nombre: formulario.referencia2Nombre || undefined,
      referencia2Telefono: formulario.referencia2Telefono || undefined,
      enListaNegra: formulario.enListaNegra,
      creadoPorId: currentUser?.id || undefined,
    };

    if (archivos.length > 0) {
      payload.archivos = archivos;
    }

    // Control de conflictos: al editar, mandamos la versión que cargamos. Si el
    // servidor tiene una más nueva (otro editó mientras tanto / edición offline
    // desincronizada), el backend rechaza como conflicto en vez de sobrescribir.
    if (esEdicion && cliente && (cliente as any).version != null) {
      (payload as any).version = (cliente as any).version;
    }

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
            creadoEn: toBogotaDateTimeOffsetIso(new Date()),
          } as any);
          
          onClose();
          return;
        } catch (queueError) {
          console.error('[NuevoClienteModal] Falló el guardado en cola:', queueError);
        }
      }

      if (error?.statusCode === 409) {
        showNotification('warning', error.message || `Ya existe un cliente con el documento: ${formulario.dni}`, 'Conflicto de Datos');
      } else {
        showNotification('error', error.message || 'No se pudo procesar la solicitud del cliente', 'Error Interno');
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
          className="flex w-full max-w-4xl max-h-[90vh] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Cabecera sobria: un rótulo gris sobre el título, como en el resto
              de modales de gestión. Va fuera del área que se desplaza para que
              el título siga a la vista al bajar por el formulario, que es largo. */}
          <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-100 px-6 py-4 md:px-8">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Gestión de clientes</p>
              <h3 className="text-lg font-bold text-slate-900">{esEdicion ? 'Editar cliente' : 'Nuevo cliente'}</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="shrink-0 rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6 md:p-8">
              {/* Datos personales */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-500">Datos personales</p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <FieldLabel required>CC o Documento</FieldLabel>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formulario.dni}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        setFormulario(prev => ({ ...prev, dni: val }));
                      }}
                      className={CLASE_CAMPO}
                      placeholder="Solo números"
                      required
                    />
                  </div>
                  <div>
                    <FieldLabel required>Teléfono</FieldLabel>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formulario.telefono}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        setFormulario(prev => ({ ...prev, telefono: val }));
                      }}
                      className={CLASE_CAMPO}
                      placeholder="Solo números"
                      required
                    />
                  </div>
                  <div>
                    <FieldLabel required>Nombres</FieldLabel>
                    <input
                      value={formulario.nombres}
                      onChange={(e) => setFormulario(prev => ({ ...prev, nombres: e.target.value }))}
                      className={CLASE_CAMPO}
                      required
                    />
                  </div>
                  <div>
                    <FieldLabel required>Apellidos</FieldLabel>
                    <input
                      value={formulario.apellidos}
                      onChange={(e) => setFormulario(prev => ({ ...prev, apellidos: e.target.value }))}
                      className={CLASE_CAMPO}
                      required
                    />
                  </div>
                  <div>
                    <FieldLabel>Correo (Opcional)</FieldLabel>
                    <input
                      type="email"
                      value={formulario.correo}
                      onChange={(e) => setFormulario(prev => ({ ...prev, correo: e.target.value }))}
                      className={CLASE_CAMPO}
                      placeholder="correo@dominio.com"
                    />
                  </div>
                  <div>
                    <FieldLabel required>Dirección</FieldLabel>
                    <input
                      value={formulario.direccion}
                      onChange={(e) => setFormulario(prev => ({ ...prev, direccion: e.target.value }))}
                      className={CLASE_CAMPO}
                      placeholder="Dirección del cliente"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <FieldLabel className="mb-1">Referencias Personales</FieldLabel>
                <p className="text-xs text-slate-400 mb-4">Complete el nombre completo y teléfono de cada referencia</p>

                {/* Referencia 1 */}
                <div className="mb-4">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black flex items-center justify-center">1</span>
                    Referencia Personal 1
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <FieldLabel required className="text-xs text-slate-500 mb-1">Nombre Completo</FieldLabel>
                      <input
                        value={formulario.referencia1Nombre}
                        onChange={(e) => setFormulario(prev => ({ ...prev, referencia1Nombre: e.target.value }))}
                        className={CLASE_CAMPO}
                        placeholder="Ej: María López"
                        required
                      />
                    </div>
                    <div>
                      <FieldLabel required className="text-xs text-slate-500 mb-1">Teléfono</FieldLabel>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formulario.referencia1Telefono}
                        onChange={(e) => setFormulario(prev => ({ ...prev, referencia1Telefono: e.target.value.replace(/\D/g, '') }))}
                        className={CLASE_CAMPO}
                        placeholder="Ej: 3001234567"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Referencia 2 */}
                <div>
                  <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-black flex items-center justify-center">2</span>
                    Referencia Personal 2
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <FieldLabel required className="text-xs text-slate-500 mb-1">Nombre Completo</FieldLabel>
                      <input
                        value={formulario.referencia2Nombre}
                        onChange={(e) => setFormulario(prev => ({ ...prev, referencia2Nombre: e.target.value }))}
                        className={CLASE_CAMPO}
                        placeholder="Ej: Carlos Martínez"
                        required
                      />
                    </div>
                    <div>
                      <FieldLabel required className="text-xs text-slate-500 mb-1">Teléfono</FieldLabel>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formulario.referencia2Telefono}
                        onChange={(e) => setFormulario(prev => ({ ...prev, referencia2Telefono: e.target.value.replace(/\D/g, '') }))}
                        className={CLASE_CAMPO}
                        placeholder="Ej: 3109876543"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {esEdicion && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-700">Lista Negra</p>
                    <p className="text-xs text-slate-500">Activa o desactiva la restricción para este cliente</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormulario(prev => ({ ...prev, enListaNegra: !prev.enListaNegra }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      formulario.enListaNegra ? 'bg-rose-500' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formulario.enListaNegra ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              )}

              {/* Sección de Fotos */}
              <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Documentos y fotos (opcionales)</h4>
                  <p className="mt-1 text-xs font-medium text-slate-400">
                    Formatos soportados: JPG, JPEG, PNG, WEBP. (Comprobante: también MP4, WEBM)
                  </p>
                </div>
                
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

            </div>

            {/* Los botones tampoco se desplazan: en un formulario largo obligaba
                a bajar hasta el final para encontrar el de guardar. */}
            <div className="flex shrink-0 gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 md:px-8">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 rounded-xl border border-slate-300 bg-white py-3 font-bold text-slate-700 transition-all hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 font-bold text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary-dark active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  esEdicion ? 'Guardar cambios' : 'Registrar cliente'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
}
