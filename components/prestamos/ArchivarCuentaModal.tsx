'use client';

import { useState } from 'react';
import { AlertTriangle, X, FileText } from 'lucide-react'
import { formatMilesCOP } from '@/lib/utils'
import { prestamosService } from '@/services/prestamos-service';

interface ArchivarCuentaModalProps {
  prestamoId: string;
  numeroPrestamo: string;
  clienteNombre: string;
  saldoPendiente: number;
  onClose: () => void;
  onSuccess: () => void;
}


export default function ArchivarCuentaModal({
  prestamoId,
  numeroPrestamo,
  clienteNombre,
  saldoPendiente,
  onClose,
  onSuccess,
}: ArchivarCuentaModalProps) {
  const [motivo, setMotivo] = useState('');
  const [notas, setNotas] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!motivo) {
      setError('Debe seleccionar un motivo');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await prestamosService.archivarPrestamo(prestamoId, {
        motivo,
        notas: notas || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al archivar la cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200 motion-reduce:animate-none">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Archivar Cuenta como Pérdida</h2>
              <p className="text-sm text-gray-500">Esta acción es irreversible</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Información del préstamo */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Préstamo:</span>
              <span className="font-medium text-gray-900">{numeroPrestamo}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Cliente:</span>
              <span className="font-medium text-gray-900">{clienteNombre}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Saldo Pendiente:</span>
              <span className="font-semibold text-red-600">
                ${formatMilesCOP(saldoPendiente)}
              </span>
            </div>
          </div>

          {/* Advertencia */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800 space-y-1">
                <p className="font-medium">Al archivar esta cuenta:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>El préstamo se marcará como PÉRDIDA</li>
                  <li>El cliente será agregado a la LISTA NEGRA</li>
                  <li>No podrá solicitar nuevos créditos</li>
                  <li>Se registrará en auditoría</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Nota informativa */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex gap-2">
              <FileText className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-800">
                <strong>Nota:</strong> El Administrador o Super Administrador puede remover al cliente de la lista negra posteriormente si lo considera necesario.
              </p>
            </div>
          </div>

          {/* Motivo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Motivo de archivo <span className="text-red-500">*</span>
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              placeholder="Ej: Impago reiterado, Cliente no localizable, Fraude, etc."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              required
            />
          </div>

          {/* Notas adicionales */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notas adicionales (opcional)
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={4}
              placeholder="Agregue cualquier información adicional relevante..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !motivo}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Archivando...' : 'Archivar Cuenta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
