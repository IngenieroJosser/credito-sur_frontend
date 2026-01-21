'use client';

import React, { useCallback, useState } from 'react';
import { UploadCloud, X, File, Image as ImageIcon, Film, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploaderProps {
  files?: File[];
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  maxSize?: number; // in bytes
  onFilesChange: (files: File[]) => void;
  label?: string;
  description?: string;
  className?: string;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  files: controlledFiles,
  accept = 'image/*',
  multiple = true,
  maxFiles = 5,
  maxSize = 10 * 1024 * 1024, // 10MB default
  onFilesChange,
  label = 'Subir archivos',
  description = 'Arrastra y suelta tus archivos aquí o haz clic para seleccionar',
  className
}) => {
  const [internalFiles, setInternalFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine if we are in controlled mode
  const isControlled = controlledFiles !== undefined;
  const currentFiles = isControlled ? controlledFiles : internalFiles;

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const validateFile = useCallback((file: File): string | null => {
    if (maxSize && file.size > maxSize) {
      return `El archivo ${file.name} excede el tamaño máximo de ${maxSize / 1024 / 1024}MB`;
    }
    // Simple MIME type check based on accept
    if (accept !== '*') {
      const acceptedTypes = accept.split(',').map(t => t.trim());
      const fileType = file.type;
      const fileName = file.name.toLowerCase();
      
      const isAccepted = acceptedTypes.some(type => {
        if (type.endsWith('/*')) {
          const mainType = type.split('/')[0];
          return fileType.startsWith(`${mainType}/`);
        }
        if (type.startsWith('.')) {
          return fileName.endsWith(type.toLowerCase());
        }
        return fileType === type;
      });

      if (!isAccepted) {
        return `El archivo ${file.name} no es un tipo compatible (${accept})`;
      }
    }
    return null;
  }, [maxSize, accept]);

  const handleFiles = useCallback((newFiles: File[]) => {
    const validFiles: File[] = [];
    let validationError: string | null = null;

    if (!multiple && newFiles.length > 1) {
      setError('Solo se permite subir un archivo');
      return;
    }

    if (currentFiles.length + newFiles.length > maxFiles) {
      setError(`Solo puedes subir un máximo de ${maxFiles} archivos`);
      return;
    }

    // Validar cada archivo
    newFiles.forEach(file => {
      const error = validateFile(file);
      if (error) {
        validationError = error;
      } else {
        // Verificar duplicados
        const isDuplicate = currentFiles.some(
          existing => existing.name === file.name && existing.size === file.size
        );
        if (!isDuplicate) {
          validFiles.push(file);
        }
      }
    });

    if (validationError) {
      setError(validationError);
      // Aún así procesamos los válidos si hay alguno y no es error bloqueante de único archivo
    } else {
      setError(null);
    }

    if (validFiles.length > 0) {
      let updatedFiles: File[];
      
      if (multiple) {
        updatedFiles = [...currentFiles, ...validFiles];
      } else {
        // Si no es múltiple, reemplazamos el archivo existente
        updatedFiles = [validFiles[0]];
      }

      if (!isControlled) {
        setInternalFiles(updatedFiles);
      }
      onFilesChange(updatedFiles);
    }
  }, [currentFiles, multiple, maxFiles, onFilesChange, validateFile, isControlled]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);

    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  }, [handleFiles]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      handleFiles(selectedFiles);
      // Reset input value to allow selecting the same file again if needed
      e.target.value = '';
    }
  };

  const removeFile = (indexToRemove: number) => {
    const updatedFiles = currentFiles.filter((_, index) => index !== indexToRemove);
    if (!isControlled) {
      setInternalFiles(updatedFiles);
    }
    onFilesChange(updatedFiles);
  };

  return (
    <div className={cn("w-full", className)}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative border-2 border-dashed rounded-lg p-6 transition-all duration-200 ease-in-out text-center cursor-pointer",
          isDragging
            ? "border-[#08557f] bg-[#08557f]/5 scale-[1.02]"
            : "border-gray-200 hover:border-[#08557f]/50 hover:bg-gray-50",
          error ? "border-red-200 bg-red-50/50" : ""
        )}
      >
        <input
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleFileInput}
          accept={accept}
          multiple={multiple}
        />
        
        <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
          <div className={cn(
            "p-3 rounded-full transition-colors",
            isDragging ? "bg-[#08557f]/10 text-[#08557f]" : "bg-gray-100 text-gray-400"
          )}>
            <UploadCloud className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-700">
              {label}
            </p>
            <p className="text-xs text-gray-500">
              {description}
            </p>
          </div>
          {maxSize && (
            <p className="text-[10px] text-gray-400">
              Máx. {maxSize / 1024 / 1024}MB
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-2 flex items-center gap-2 text-xs text-red-600 animate-in slide-in-from-top-1">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {currentFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          {currentFiles.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 group hover:border-[#08557f]/20 transition-colors"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="p-2 bg-white rounded-md border border-gray-200 text-[#08557f]">
                  {file.type.startsWith('image/') ? (
                    <ImageIcon className="w-4 h-4" />
                  ) : file.type.startsWith('video/') ? (
                    <Film className="w-4 h-4" />
                  ) : (
                    <File className="w-4 h-4" />
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium text-gray-700 truncate">
                    {file.name}
                  </span>
                  <span className="text-xs text-gray-400">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
              </div>
              <button
                onClick={() => removeFile(index)}
                className="p-1 hover:bg-red-50 rounded-full text-gray-400 hover:text-red-500 transition-colors"
                title="Eliminar archivo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
