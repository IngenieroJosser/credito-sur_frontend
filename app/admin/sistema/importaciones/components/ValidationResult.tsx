import React, { useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, ChevronLeft, ChevronRight, FileSpreadsheet, Table2 } from 'lucide-react';
import { ResultadoValidacion, ErrorValidacion, AdvertenciaValidacion } from '@/types/importaciones';
import ImpactoCajaPreview from './ImpactoCajaPreview';

interface ValidationResultProps {
  resultado: ResultadoValidacion;
  onClose: () => void;
}

const formatValor = (valor: unknown): string => {
  if (valor === null || valor === undefined || valor === '') return '-';
  if (valor instanceof Date) return valor.toLocaleDateString('es-CO');
  if (typeof valor === 'object') return JSON.stringify(valor);
  return String(valor);
};

type PreviewColumn = {
  key: string;
  label: string;
};

type PreviewSection = {
  title: string;
  countLabel: string;
  rows: Record<string, unknown>[];
  columns: PreviewColumn[];
};

const getPreviewSections = (resultado: ResultadoValidacion): PreviewSection[] => {
  if (resultado.tipo === 'clientes-creditos') {
    return [
      {
        title: 'Clientes',
        countLabel: 'clientes leídos',
        rows: (resultado.clientes ?? []) as Record<string, unknown>[],
        columns: [
          { key: 'fila', label: 'Fila' },
          { key: 'codigoImp', label: 'Código' },
          { key: 'cc', label: 'CC' },
          { key: 'nombres', label: 'Nombres' },
          { key: 'apellidos', label: 'Apellidos' },
          { key: 'telefono', label: 'Teléfono' },
          { key: 'rutaCodigo', label: 'Ruta' },
        ],
      },
      {
        title: 'Créditos',
        countLabel: 'créditos leídos',
        rows: (resultado.creditos ?? []) as Record<string, unknown>[],
        columns: [
          { key: 'fila', label: 'Fila' },
          { key: 'codigoImp', label: 'Código' },
          { key: 'numeroPrestamo', label: 'Préstamo' },
          { key: 'ccCliente', label: 'CC cliente' },
          { key: 'tipoPrestamo', label: 'Tipo' },
          { key: 'monto', label: 'Monto' },
          { key: 'cantidadCuotas', label: 'Cuotas' },
          { key: 'cuotasPagadas', label: 'Pagadas' },
          { key: 'totalAbonado', label: 'Abonado' },
          { key: 'saldoPendiente', label: 'Saldo' },
          { key: 'tipoCarga', label: 'Carga' },
          { key: 'descontarCaja', label: 'Caja' },
        ],
      },
    ];
  }

  return [
    {
      title: 'Artículos',
      countLabel: 'artículos leídos',
      rows: (resultado.articulos ?? []) as Record<string, unknown>[],
      columns: [
        { key: 'fila', label: 'Fila' },
        { key: 'codigo', label: 'Código' },
        { key: 'nombre', label: 'Nombre' },
        { key: 'categoria', label: 'Categoría' },
        { key: 'costo', label: 'Costo' },
        { key: 'precioContado', label: 'Contado' },
        { key: 'opcionesPrecio', label: 'Opciones' },
        { key: 'stock', label: 'Stock' },
        { key: 'stockMinimo', label: 'Mínimo' },
        { key: 'activo', label: 'Activo' },
      ],
    },
    {
      title: 'Precios',
      countLabel: 'precios leídos',
      // El precio de contado se guarda como una opción de 0 meses.
      rows: (resultado.precios ?? []).map((precio) => ({
        ...precio,
        meses: Number(precio.meses) === 0 ? 'Contado' : precio.meses,
      })) as Record<string, unknown>[],
      columns: [
        { key: 'fila', label: 'Fila' },
        { key: 'codigoProducto', label: 'Producto' },
        { key: 'meses', label: 'Plazo' },
        { key: 'precio', label: 'Precio' },
        { key: 'utilidad', label: 'Utilidad' },
        { key: 'activo', label: 'Activo' },
      ],
    },
  ];
};

export const ValidationResult: React.FC<ValidationResultProps> = ({ resultado, onClose }) => {
  const [errorPage, setErrorPage] = useState(1);
  const [warningPage, setWarningPage] = useState(1);
  const itemsPerPage = 10;

  const totalErrores = resultado.errores.length;
  const totalWarnings = resultado.advertencias.length;
  const previewSections = getPreviewSections(resultado).filter((section) => section.rows.length > 0);

  const paginatedErrores = resultado.errores.slice((errorPage - 1) * itemsPerPage, errorPage * itemsPerPage);
  const paginatedWarnings = resultado.advertencias.slice((warningPage - 1) * itemsPerPage, warningPage * itemsPerPage);

  const renderPagination = (currentPage: number, totalItems: number, setPage: (p: number) => void) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between mt-4 bg-slate-50 px-4 py-2 rounded-lg border border-slate-200">
        <span className="text-sm text-slate-500 font-medium">
          Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, totalItems)} de {totalItems}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="p-1 rounded-md hover:bg-slate-200 disabled:opacity-50 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="p-1 rounded-md hover:bg-slate-200 disabled:opacity-50 transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    );
  };

  const renderPreviewSection = (section: PreviewSection) => {
    const rows = section.rows.slice(0, 5);

    return (
      <div key={section.title} className="rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between gap-3 bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <Table2 className="h-4 w-4 text-blue-500" />
            <h5 className="text-sm font-bold text-slate-800">{section.title}</h5>
          </div>
          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-600 border border-slate-200">
            {section.rows.length} {section.countLabel}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-white text-xs font-bold uppercase tracking-wider text-slate-500">
              <tr>
                {section.columns.map((column) => (
                  <th key={column.key} className="px-4 py-3">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.map((row, idx) => (
                <tr key={`${section.title}-${idx}`} className="hover:bg-slate-50/70 transition-colors">
                  {section.columns.map((column) => (
                    <td key={column.key} className="px-4 py-3 text-slate-700">
                      <span className="line-clamp-2 break-words">{formatValor(row[column.key])}</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {section.rows.length > rows.length && (
          <div className="border-t border-slate-100 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-500">
            Mostrando las primeras {rows.length} filas de esta sección.
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
      <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 text-white">
          <FileSpreadsheet className="h-5 w-5 text-blue-400" />
          <h3 className="font-bold text-lg">Resultado de Validación</h3>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
          <span className="sr-only">Cerrar</span>
          &times;
        </button>
      </div>

      <div className="p-6 space-y-8">
        {/* Resumen Global */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col items-center justify-center text-center">
            <span className="text-3xl font-black text-slate-700">{resultado.resumen.totalFilas}</span>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">Total Filas</span>
          </div>
          <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 flex flex-col items-center justify-center text-center">
            <span className="text-3xl font-black text-emerald-600">{resultado.resumen.filasValidas}</span>
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider mt-1">Válidas</span>
          </div>
          <div className="bg-red-50 rounded-xl p-4 border border-red-100 flex flex-col items-center justify-center text-center">
            <span className="text-3xl font-black text-red-600">{resultado.resumen.filasConError}</span>
            <span className="text-xs font-bold text-red-600 uppercase tracking-wider mt-1">Con Error</span>
          </div>
          <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-100 flex flex-col items-center justify-center text-center">
            <span className="text-3xl font-black text-yellow-600">{resultado.resumen.advertencias}</span>
            <span className="text-xs font-bold text-yellow-600 uppercase tracking-wider mt-1">Advertencias</span>
          </div>
        </div>

        {/* Qué le va a pasar a la caja y al inventario al confirmar */}
        {resultado.impactoCaja && (
          <ImpactoCajaPreview impacto={resultado.impactoCaja} />
        )}

        {/* Resumen por Hoja */}
        <div>
          <h4 className="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wider">Resumen por Hoja</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(resultado.resumen.porHoja).map(([hoja, stats]) => (
              <div key={hoja} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="font-bold text-sm text-slate-700">{hoja}</span>
                <div className="flex gap-3 text-xs font-medium">
                  <span className="text-emerald-600" title="Válidas">{stats.filasValidas} ✓</span>
                  <span className="text-red-600" title="Con Error">{stats.filasConError} ✗</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {previewSections.length > 0 && (
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Vista previa</h4>
              <span className="text-xs font-medium text-slate-500">
                Datos interpretados por la validación
              </span>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {previewSections.map(renderPreviewSection)}
            </div>
          </div>
        )}

        {totalErrores === 0 && totalWarnings === 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 flex flex-col items-center justify-center text-center">
            <CheckCircle className="h-10 w-10 text-emerald-500 mb-3" />
            <h4 className="text-lg font-bold text-emerald-800">¡Archivo Válido!</h4>
            <p className="text-emerald-600 text-sm mt-1 font-medium">No se encontraron errores ni advertencias en el documento.</p>
          </div>
        )}

        {/* Errores */}
        {totalErrores > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <h4 className="text-lg font-bold text-slate-800">Errores ({totalErrores})</h4>
            </div>
            <div className="border border-red-100 rounded-xl overflow-hidden">
              <div className="max-h-[420px] overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-red-50 text-red-800 font-bold sticky top-0 shadow-sm z-10">
                    <tr>
                      <th className="px-4 py-3">Hoja</th>
                      <th className="px-4 py-3">Fila</th>
                      <th className="px-4 py-3">Campo</th>
                      <th className="px-4 py-3">Mensaje</th>
                      <th className="px-4 py-3">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-50 bg-white">
                    {paginatedErrores.map((err, idx) => (
                      <tr key={idx} className="hover:bg-red-50/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-700">{err.hoja}</td>
                        <td className="px-4 py-3 font-bold text-slate-900">{err.fila > 0 ? err.fila : '-'}</td>
                        <td className="px-4 py-3 font-medium text-red-600">{err.campo}</td>
                        <td className="px-4 py-3 text-slate-600">{err.mensaje}</td>
                        <td className="px-4 py-3 text-slate-500 font-mono text-xs">{formatValor(err.valor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {renderPagination(errorPage, totalErrores, setErrorPage)}
            </div>
          </div>
        )}

        {/* Advertencias */}
        {totalWarnings > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <h4 className="text-lg font-bold text-slate-800">Advertencias ({totalWarnings})</h4>
            </div>
            <div className="border border-yellow-100 rounded-xl overflow-hidden">
              <div className="max-h-[420px] overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-yellow-50 text-yellow-800 font-bold sticky top-0 shadow-sm z-10">
                    <tr>
                      <th className="px-4 py-3">Hoja</th>
                      <th className="px-4 py-3">Fila</th>
                      <th className="px-4 py-3">Campo</th>
                      <th className="px-4 py-3">Mensaje</th>
                      <th className="px-4 py-3">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-yellow-50 bg-white">
                    {paginatedWarnings.map((warn, idx) => (
                      <tr key={idx} className="hover:bg-yellow-50/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-700">{warn.hoja}</td>
                        <td className="px-4 py-3 font-bold text-slate-900">{warn.fila > 0 ? warn.fila : '-'}</td>
                        <td className="px-4 py-3 font-medium text-yellow-600">{warn.campo}</td>
                        <td className="px-4 py-3 text-slate-600">{warn.mensaje}</td>
                        <td className="px-4 py-3 text-slate-500 font-mono text-xs">{formatValor(warn.valor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {renderPagination(warningPage, totalWarnings, setWarningPage)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
