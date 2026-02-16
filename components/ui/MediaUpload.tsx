'use client';

import { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { Upload, X, Check, Loader2, Image as ImageIcon, Video, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { uploadService, UploadResponse } from '@/services/upload-service';

export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export interface MediaFile {
  file: File;
  preview: string;
  status: UploadStatus;
  progress?: number;
  url?: string; // URL del servidor después de subir
}

export interface MediaUploadProps {
  label?: string;
  accept?: string;
  maxSize?: number; // en MB
  existingUrl?: string; // URL de imagen existente (al editar)
  onChange?: (file: File | null) => void;
  onUploadComplete?: (data: UploadResponse) => void; // AHORA RECIBE DATA REAL
  className?: string;
  disabled?: boolean;
  multiple?: boolean;
}

/**
 * ============================================================================
 * COMPONENTE DE CARGA DE MEDIOS CON PREVIEW Y ESTADOS
 * ============================================================================
 */
export default function MediaUpload({
  label = 'Cargar Archivo',
  accept = 'image/*',
  maxSize = 50, // 50MB por defecto
  existingUrl,
  onChange,
  onUploadComplete,
  className,
  disabled = false,
  multiple = false
}: MediaUploadProps) {
  const [media, setMedia] = useState<MediaFile | null>(null);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [videoError, setVideoError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Determinar si hay una imagen (existente o nueva)
  const currentPreview = media?.preview || existingUrl;
  const hasMedia = !!currentPreview;

  // Función de subida REAL
  const handleUpload = useCallback(async (file: File) => {
    setStatus('uploading');
    setProgress(10); // Inicio visual

    try {
      // 1. Subir al servidor real
      const result = await uploadService.uploadFile(file);
      
      setProgress(100);
      setStatus('success');
      setShowSuccess(true);
      
      // 2. Notificar al padre con los datos reales
      if (onUploadComplete) {
        onUploadComplete(result);
      }

      // Quitar brillo de éxito luego
      setTimeout(() => setShowSuccess(false), 2000);

    } catch (error) {
      console.error('Upload failed:', error);
      setStatus('error');
      setErrorMessage('Error al subir el archivo. Intente nuevamente.');
      setShowErrorModal(true);
      
      // Resetear estado visual parcial
      setMedia(prev => prev ? { ...prev, status: 'error' } : null);
    }
  }, [onUploadComplete]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tamaño
    if (file.size > maxSize * 1024 * 1024) {
      setErrorMessage(
        `El archivo seleccionado es demasiado grande.\n\nTamaño máximo permitido: ${maxSize}MB\nTamaño del archivo: ${(file.size / 1024 / 1024).toFixed(2)}MB\n\nPor favor, seleccione un archivo más pequeño.`
      );
      setShowErrorModal(true);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
      return;
    }

    // Crear preview local inmediata
    const preview = URL.createObjectURL(file);
    const newMedia: MediaFile = {
      file,
      preview,
      status: 'idle'
    };

    setMedia(newMedia);
    onChange?.(file);

    // INICIAR SUBIDA AUTOMÁTICA
    handleUpload(file);
  }, [maxSize, onChange, handleUpload]);

  const handleRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (media?.preview) {
      URL.revokeObjectURL(media.preview);
    }
    
    setMedia(null);
    setStatus('idle');
    setProgress(0);
    setShowSuccess(false);
    setVideoError(false);
    onChange?.(null);
    
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, [media, onChange]);

  const handleClick = () => {
    // Si hay media (imagen/video), no abrir el selector de archivos
    // El usuario debe usar el botón de eliminar para cambiar
    if (hasMedia) return;
    
    if (!disabled) {
      inputRef.current?.click();
    }
  };

  // Detectar tipo de archivo basado en el archivo actual, la url existente o el accept
  const isUrlVideo = existingUrl?.match(/\.(mp4|webm|ogg|mov)$/i);
  
  const isImage = media?.file 
    ? media.file.type.startsWith('image/') 
    : (existingUrl ? !isUrlVideo : accept.includes('image'));

  const isVideo = media?.file 
    ? media.file.type.startsWith('video/') 
    : (existingUrl ? !!isUrlVideo : accept.includes('video'));

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label className="block text-sm font-bold text-slate-700">
          {label}
        </label>
      )}

      {/* Contenedor SIN onClick cuando hay media (permite interacción con video) */}
      {hasMedia ? (
        <div
          className={cn(
            "relative rounded-2xl border-2 border-dashed transition-all duration-300 group overflow-hidden border-slate-200 bg-slate-50",
            disabled && "opacity-50 cursor-not-allowed",
            showSuccess && "border-emerald-500 shadow-lg shadow-emerald-500/20 ring-4 ring-emerald-500/10"
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={handleFileSelect}
            disabled={disabled}
            multiple={multiple}
            className="hidden"
          />

          {/* Vista previa */}
          <div className="relative">
            {/* Preview de imagen */}
            {isImage && (
              <div className="relative aspect-video w-full">
                <Image
                  src={currentPreview!}
                  alt="Preview"
                  fill
                  className="object-cover rounded-xl"
                  unoptimized
                />
                
                {/* Overlay de estado */}
                {status === 'uploading' && (
                  <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl">
                    <Loader2 className="w-8 h-8 text-white animate-spin mb-2" />
                    <p className="text-white text-sm font-bold mb-2">Subiendo...</p>
                    <div className="w-48 h-2 bg-white/20 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-white transition-all duration-300 rounded-full"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-white text-xs mt-2">{progress}%</p>
                  </div>
                )}

                {/* Checkmark de éxito */}
                {status === 'success' && (
                  <div className={cn(
                    "absolute top-2 right-2 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg transition-all duration-300",
                    showSuccess ? "scale-100 opacity-100" : "scale-90 opacity-70"
                  )}>
                    <Check className="w-5 h-5 text-white" strokeWidth={3} />
                  </div>
                )}
              </div>
            )}

            {/* Preview de video */}
            {isVideo && !videoError && (
              <div className="relative aspect-video w-full bg-slate-900 rounded-xl overflow-hidden">
                <video
                  src={currentPreview}
                  controls
                  controlsList="nodownload"
                  preload="metadata"
                  playsInline
                  onError={() => setVideoError(true)}
                  className="w-full h-full object-contain rounded-xl"
                  style={{ maxHeight: '400px', pointerEvents: 'auto' }}
                >
                  Tu navegador no soporta la reproducción de videos.
                </video>
                
                {/* Overlay de estado - solo durante upload */}
                {status === 'uploading' && (
                  <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl pointer-events-none">
                    <Loader2 className="w-8 h-8 text-white animate-spin mb-2" />
                    <p className="text-white text-sm font-bold mb-2">Subiendo video...</p>
                    <div className="w-48 h-2 bg-white/20 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-white transition-all duration-300 rounded-full"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-white text-xs mt-2">{progress}%</p>
                  </div>
                )}

                {/* Checkmark de éxito */}
                {status === 'success' && (
                  <div className={cn(
                    "absolute top-2 right-2 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 pointer-events-none",
                    showSuccess ? "scale-100 opacity-100" : "scale-90 opacity-70"
                  )}>
                    <Check className="w-5 h-5 text-white" strokeWidth={3} />
                  </div>
                )}
              </div>
            )}

            {/* Fallback para videos no soportados (ej. WMV) */}
            {isVideo && videoError && (
              <div className="relative aspect-video w-full bg-slate-100 rounded-xl overflow-hidden flex flex-col items-center justify-center p-4 text-center border border-slate-200">
                <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-3">
                  <Video className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-sm font-bold text-slate-700 mb-1">
                  Vista previa no disponible
                </p>
                <p className="text-xs text-slate-500 max-w-[200px] truncate">
                  {media?.file?.name}
                </p>
                <p className="text-[10px] text-slate-400 mt-2">
                  El formato puede no ser compatible con el navegador, pero se subirá correctamente.
                </p>
                
                {/* Checkmark de éxito en fallback */}
                {status === 'success' && (
                  <div className={cn(
                    "absolute top-2 right-2 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg transition-all duration-300",
                    showSuccess ? "scale-100 opacity-100" : "scale-90 opacity-70"
                  )}>
                    <Check className="w-5 h-5 text-white" strokeWidth={3} />
                  </div>
                )}
              </div>
            )}

            {/* Botón de eliminar */}
            {!disabled && (
              <button
                type="button"
                onClick={handleRemove}
                className="absolute top-2 left-2 w-8 h-8 bg-rose-500 text-white rounded-full flex items-center justify-center hover:bg-rose-600 transition-all shadow-lg hover:scale-110 active:scale-95 z-20"
              >
                <X className="w-4 h-4" strokeWidth={3} />
              </button>
            )}

            {/* Nombre del archivo */}
            {media?.file && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900/80 to-transparent p-4 rounded-b-xl pointer-events-none">
                <p className="text-white text-xs font-medium truncate">
                  {media.file.name}
                </p>
                <p className="text-white/60 text-xs">
                  {(media.file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Contenedor CON onClick cuando NO hay media */
        <div
          onClick={handleClick}
          className={cn(
            "relative rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer group overflow-hidden border-slate-300 bg-white hover:border-primary/50 hover:bg-primary/5",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={handleFileSelect}
            disabled={disabled}
            multiple={multiple}
            className="hidden"
          />

          {/* Zona de drop vacía */}
          <div className="p-8 flex flex-col items-center justify-center text-center min-h-[200px]">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors">
              {isImage && <ImageIcon className="w-8 h-8 text-slate-400 group-hover:text-primary transition-colors" />}
              {isVideo && <Video className="w-8 h-8 text-slate-400 group-hover:text-primary transition-colors" />}
              {!isImage && !isVideo && <Upload className="w-8 h-8 text-slate-400 group-hover:text-primary transition-colors" />}
            </div>
            
            <p className="text-sm font-bold text-slate-700 mb-1">
              Haz clic o arrastra un archivo aquí
            </p>
            <p className="text-xs text-slate-500">
              {isImage && `Imágenes hasta ${maxSize}MB`}
              {isVideo && `Videos hasta ${maxSize}MB`}
              {!isImage && !isVideo && `Archivos hasta ${maxSize}MB`}
            </p>
          </div>
        </div>
      )}

      {/* Mensaje de ayuda */}
      {!hasMedia && (
        <p className="text-xs text-slate-500 text-center">
          Formatos aceptados: {accept.replace('image/', '.').replace('video/', '.').toUpperCase()}
        </p>
      )}

      {/* Modal de Error - Portal directo con z-index superior */}
      {showErrorModal && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ zIndex: 2147483647 }}
          onClick={() => setShowErrorModal(false)}
        >
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
            aria-hidden="true"
          />
          
          {/* Modal Content */}
          <div 
            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl transform transition-all"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Archivo muy grande</h3>
              <button
                onClick={() => setShowErrorModal(false)}
                className="p-2 -mr-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6">
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
                <p className="text-center text-slate-700 whitespace-pre-line leading-relaxed">
                  {errorMessage}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 rounded-b-2xl flex justify-end">
              <button
                onClick={() => setShowErrorModal(false)}
                className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
