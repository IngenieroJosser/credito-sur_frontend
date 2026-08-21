'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, FileSpreadsheet, Package, Settings, UploadCloud, Users, XCircle } from 'lucide-react';
import { toast, Toaster } from 'sonner';

import { importacionesService } from '@/services/importaciones-service';
import { ResultadoValidacion } from '@/types/importaciones';

import { PlantillasCard } from './components/PlantillasCard';
import { ArchivoValidadorCard } from './components/ArchivoValidadorCard';
import { ValidationResult } from './components/ValidationResult';
import { HistorialLotesCard } from './components/HistorialLotesCard';

export const ImportacionesClient = () => {
  const [reporteActivo, setReporteActivo] = useState<'clientes' | 'inventario' | null>(null);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [loadingInventario, setLoadingInventario] = useState(false);
  const [confirmandoClientes, setConfirmandoClientes] = useState(false);
  const [confirmandoInventario, setConfirmandoInventario] = useState(false);
  const [resultadoClientes, setResultadoClientes] = useState<ResultadoValidacion | null>(null);
  const [resultadoInventario, setResultadoInventario] = useState<ResultadoValidacion | null>(null);
  const [archivoClientes, setArchivoClientes] = useState<File | null>(null);
  const [archivoInventario, setArchivoInventario] = useState<File | null>(null);
  // Se incrementa al confirmar, para que el historial se recargue.
  const [versionHistorial, setVersionHistorial] = useState(0);

  const handleValidarClientes = async (file: File) => {
    setLoadingClientes(true);
    setResultadoClientes(null);
    setArchivoClientes(file);
    try {
      const res = await importacionesService.validarClientesCreditos(file);
      setResultadoClientes(res);
      setReporteActivo('clientes');

      if (res.errores.length > 0) {
        toast.warning(`Validación completada con ${res.errores.length} errores`);
      } else {
        toast.success('El archivo pasó la validación');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'El archivo no es un Excel válido o está dañado.');
    } finally {
      setLoadingClientes(false);
    }
  };

  const handleValidarInventario = async (file: File) => {
    setLoadingInventario(true);
    setResultadoInventario(null);
    setArchivoInventario(file);
    try {
      const res = await importacionesService.validarInventario(file);
      setResultadoInventario(res);
      setReporteActivo('inventario');

      if (res.errores.length > 0) {
        toast.warning(`Validación completada con ${res.errores.length} errores`);
      } else {
        toast.success('El archivo pasó la validación');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'El archivo no es un Excel válido o está dañado.');
    } finally {
      setLoadingInventario(false);
    }
  };

  const closeReporte = () => {
    setReporteActivo(null);
  };

  const clearActiveResult = () => {
    if (reporteActivo === 'clientes') {
      setResultadoClientes(null);
      setArchivoClientes(null);
    }
    if (reporteActivo === 'inventario') {
      setResultadoInventario(null);
      setArchivoInventario(null);
    }
    setReporteActivo(null);
  };

  const activeResult = reporteActivo === 'clientes' ? resultadoClientes : resultadoInventario;
  const activeFile = reporteActivo === 'clientes' ? archivoClientes : archivoInventario;
  const isConfirming = reporteActivo === 'clientes' ? confirmandoClientes : confirmandoInventario;
  const canConfirm = Boolean(activeResult && activeFile && activeResult.errores.length === 0);

  const handleConfirmarImportacion = async () => {
    if (!reporteActivo || !activeFile || !activeResult) return;
    if (activeResult.errores.length > 0) {
      toast.error('Corrige los errores antes de confirmar la importación.');
      return;
    }

    try {
      if (reporteActivo === 'clientes') {
        setConfirmandoClientes(true);
        const res = await importacionesService.confirmarClientesCreditos(activeFile);
        const creditos = res.creditosHistoricosCreados + res.creditosOperativosCreados;
        const partes = [
          `${res.clientesCreados} cliente(s) y ${creditos} crédito(s) creados`,
        ];
        if (res.clientesActualizados > 0) partes.push(`${res.clientesActualizados} cliente(s) actualizados`);
        if (res.creditosActualizados > 0) partes.push(`${res.creditosActualizados} crédito(s) actualizados`);
        if (res.clientesAsignadosARuta > 0) partes.push(`${res.clientesAsignadosARuta} asignados a ruta`);
        if (res.creditosAvanzados > 0) partes.push(`${res.creditosAvanzados} ya venían con abonos (${res.cuotasPagadasImportadas} cuotas pagadas)`);
        toast.success(`Importación confirmada: ${partes.join(' · ')}.`);
        setResultadoClientes(null);
        setArchivoClientes(null);
      } else {
        setConfirmandoInventario(true);
        const res = await importacionesService.confirmarInventario(activeFile);
        const partesInv = [`${res.articulosCreados} artículo(s) y ${res.preciosCreados} precio(s) creados`];
        if (res.articulosActualizados > 0) partesInv.push(`${res.articulosActualizados} artículo(s) actualizados`);
        if (res.preciosActualizados > 0) partesInv.push(`${res.preciosActualizados} precio(s) corregidos`);
        toast.success(`Inventario importado: ${partesInv.join(' · ')}.`);
        setResultadoInventario(null);
        setArchivoInventario(null);
      }
      setReporteActivo(null);
      setVersionHistorial((v) => v + 1);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'No se pudo confirmar la importación.');
    } finally {
      setConfirmandoClientes(false);
      setConfirmandoInventario(false);
    }
  };

  const reporteModal = reporteActivo && activeResult && typeof document !== 'undefined' ? createPortal(
    <div
      className="fixed inset-0 z-[2147483646] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      onClick={closeReporte}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`rounded-xl p-3 ${
              reporteActivo === 'clientes' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'
            }`}>
              {reporteActivo === 'clientes' ? <Users className="h-6 w-6" /> : <Package className="h-6 w-6" />}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Resultado de validación</p>
              <h2 className="truncate text-xl font-bold text-slate-900">
                {reporteActivo === 'clientes' ? 'Clientes y créditos' : 'Inventario'}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleConfirmarImportacion}
              disabled={!canConfirm || isConfirming}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-emerald-200 transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              title={!canConfirm ? 'Solo puedes importar cuando la validación no tenga errores.' : 'Confirmar importación'}
            >
              {isConfirming ? (
                <span className="h-4 w-4 rounded-full border-2 border-white/50 border-t-white animate-spin" />
              ) : (
                <UploadCloud className="h-4 w-4" />
              )}
              {isConfirming ? 'Importando...' : 'Confirmar importación'}
            </button>
            <button
              type="button"
              onClick={closeReporte}
              className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              title="Cerrar"
            >
              <XCircle className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-6 space-y-4">
          {activeResult.errores.length === 0 ? (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-emerald-600" />
              <div>
                <p className="text-sm font-bold text-emerald-900">Listo para importar</p>
                <p className="text-sm font-medium text-emerald-700">
                  La validación no tiene errores. Al confirmar se escribirán los datos en el sistema.
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-700">
              Corrige los errores del archivo y vuelve a validarlo antes de confirmar la importación.
            </div>
          )}
          <ValidationResult
            resultado={activeResult}
            onClose={clearActiveResult}
          />
        </div>
      </div>
    </div>,
    document.body,
  ) : null;

  return (
    <div className="min-h-screen bg-slate-50 relative">
      <Toaster position="top-right" />
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-slate-400 opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 w-full p-8 space-y-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-xs text-slate-600 tracking-wide font-bold border border-slate-200 mb-2">
              <Settings className="h-3.5 w-3.5" />
              <span>Sistema / Configuración</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              <span className="text-blue-600">Importación Masiva de </span><span className="text-orange-500">Datos</span>
            </h1>
            <p className="text-slate-500 mt-2 font-medium text-sm max-w-2xl">
              Esta fase solo valida el archivo. No crea clientes, créditos ni artículos en la base de datos.
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <PlantillasCard />

          <ArchivoValidadorCard
            title="Validar archivo de clientes y créditos"
            subtitle="Archivo de cartera actual"
            maxSizeMB={10}
            loading={loadingClientes}
            onValidate={handleValidarClientes}
            icon={<Users className="h-6 w-6" />}
          />

          <ArchivoValidadorCard
            title="Validar archivo de inventario"
            subtitle="Artículos y precios"
            maxSizeMB={5}
            loading={loadingInventario}
            onValidate={handleValidarInventario}
            icon={<Package className="h-6 w-6" />}
          />
        </div>

        <HistorialLotesCard recargar={versionHistorial} />

        {(resultadoClientes || resultadoInventario) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {resultadoClientes && (
              <button
                type="button"
                onClick={() => setReporteActivo('clientes')}
                className="flex items-center justify-between gap-4 rounded-xl border border-blue-100 bg-blue-50/50 px-4 py-3 text-left transition-all hover:border-blue-200 hover:bg-blue-50"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="rounded-lg bg-white p-2 text-blue-600 shadow-sm">
                    <FileSpreadsheet className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">Última validación: Clientes y Créditos</p>
                    <p className="text-xs font-medium text-slate-500">
                      {resultadoClientes.resumen.filasValidas} válidas · {resultadoClientes.resumen.filasConError} con error
                    </p>
                  </div>
                </div>
                <span className="flex-none text-xs font-bold text-blue-600">Ver reporte</span>
              </button>
            )}

            {resultadoInventario && (
              <button
                type="button"
                onClick={() => setReporteActivo('inventario')}
                className="flex items-center justify-between gap-4 rounded-xl border border-orange-100 bg-orange-50/50 px-4 py-3 text-left transition-all hover:border-orange-200 hover:bg-orange-50"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="rounded-lg bg-white p-2 text-orange-600 shadow-sm">
                    <FileSpreadsheet className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">Última validación: Inventario</p>
                    <p className="text-xs font-medium text-slate-500">
                      {resultadoInventario.resumen.filasValidas} válidas · {resultadoInventario.resumen.filasConError} con error
                    </p>
                  </div>
                </div>
                <span className="flex-none text-xs font-bold text-orange-600">Ver reporte</span>
              </button>
            )}
          </div>
        )}

        {reporteModal}
      </div>
    </div>
  );
};
