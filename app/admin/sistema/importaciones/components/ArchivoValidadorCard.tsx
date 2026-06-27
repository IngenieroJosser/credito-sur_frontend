import React, { useRef, useState, ChangeEvent, DragEvent } from 'react';
import { UploadCloud, CheckCircle2, FileSpreadsheet, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ArchivoValidadorCardProps {
  title: string;
  subtitle: string;
  maxSizeMB: number;
  loading: boolean;
  onValidate: (file: File) => void;
  icon?: React.ReactNode;
  surface?: 'card' | 'plain';
}

export const ArchivoValidadorCard: React.FC<ArchivoValidadorCardProps> = ({
  title,
  subtitle,
  maxSizeMB,
  loading,
  onValidate,
  icon = <CheckCircle2 className="h-6 w-6" />,
  surface = 'card',
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clearSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatFileSize = (size: number) => {
    if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    if (size >= 1024) return `${Math.round(size / 1024)} KB`;
    return `${size} B`;
  };

  const validateAndSetFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      toast.error('Solo se permiten archivos .xlsx generados desde la plantilla oficial.');
      clearSelectedFile();
      return;
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`El archivo excede el límite de ${maxSizeMB}MB.`);
      clearSelectedFile();
      return;
    }

    setSelectedFile(file);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndSetFile(file);
  };

  const handleDrag = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    setIsDragging(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (loading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndSetFile(file);
  };

  const handleValidateClick = () => {
    if (!selectedFile) {
      toast.error('Selecciona un archivo primero.');
      return;
    }
    onValidate(selectedFile);
  };

  return (
    <section className={`group transition-all duration-300 ${
      surface === 'card'
        ? 'bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]'
        : ''
    }`}>
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">{subtitle}</p>
        </div>
      </div>

      <div className="space-y-4">
        <label
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-all ${
            isDragging
              ? 'border-blue-400 bg-blue-50 shadow-inner'
              : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-50'
          } ${loading ? 'pointer-events-none opacity-70' : ''}`}
        >
          <UploadCloud className={`mb-2 h-9 w-9 transition-colors ${isDragging ? 'text-blue-500' : 'text-slate-400'}`} />
          <p className="text-sm font-bold text-slate-700">
            {isDragging ? 'Suelta el archivo aquí' : 'Arrastra el Excel aquí'}
          </p>
          <p className="mt-1 text-xs font-medium text-slate-500">
            o haz clic para seleccionar un archivo .xlsx
          </p>
          <input
            type="file"
            accept=".xlsx"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="sr-only"
          />
        </label>

        {selectedFile && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3">
            <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-white text-emerald-600 shadow-sm">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-slate-900">{selectedFile.name}</p>
              <p className="text-xs font-medium text-emerald-700">
                {formatFileSize(selectedFile.size)} · listo para validar · límite {maxSizeMB} MB
              </p>
            </div>
            <button
              type="button"
              onClick={clearSelectedFile}
              disabled={loading}
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white hover:text-slate-700 disabled:opacity-50"
              title="Quitar archivo"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>
        )}

        <button 
          type="button"
          onClick={handleValidateClick}
          disabled={!selectedFile || loading}
          className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
             <div className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-white animate-spin"></div>
          ) : (
             <CheckCircle2 className="h-4 w-4" />
          )}
          {loading ? 'Validando...' : 'Validar archivo'}
        </button>
      </div>
    </section>
  );
};
