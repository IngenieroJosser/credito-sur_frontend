import { useState, useCallback } from 'react';
import { reportesCoordinadorService } from '@/services/reportes-coordinador-service'; 
import type { OperationalReportFilters, OperationalReportResponse, RouteDetailResponse } from '@/services/reportes-coordinador-service';
import type { TimeFilterPeriod } from '@/components/ui/TimeFilter';
import { getBogotaDateKey } from '@/lib/rutas-core';
import { mensajeDeError } from '@/lib/mensaje-de-error';

export const useReportesCoordinador = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<OperationalReportResponse | null>(null);
  const [routeDetail, setRouteDetail] = useState<RouteDetailResponse | null>(null);

  const fetchOperationalReport = useCallback(async (filters: OperationalReportFilters) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await reportesCoordinadorService.getOperationalReport(filters);
      setReportData(data);
      return data;
    } catch (err) {
      /**
       * El error se deja en `error` y NO se vuelve a lanzar.
       *
       * Lanzarlo además era contar la misma cosa dos veces, y la segunda
       * reventaba: `app/coordinador/reportes/page.tsx` llama a esta función en
       * tres sitios (un `setTimeout` y dos `useEffect`) sin `.catch`, así que
       * el rechazo quedaba sin manejar.
       *
       * Medido entrando como COBRADOR a `/coordinador/reportes`: el endpoint
       * `reports/operational/coordinator` solo admite COORDINADOR, ADMIN y
       * SUPER_ADMINISTRADOR, devuelve 403 —correctamente— y la pantalla
       * levantaba dos excepciones no atrapadas. La prueba de las 112 pantallas
       * por rol las veía como «[excepcion]».
       *
       * No hacía falta propagar: la pantalla ya pinta este `error` (su
       * `if (error && mounted)`), y el único consumidor que tenía `.catch`
       * (`app/admin/reportes/operativos`) solo lo registraba en consola.
       */
      const errorMessage = mensajeDeError(err, 'No se pudo cargar el reporte operativo.');
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRouteDetail = useCallback(async (
    routeId: string,
    period: TimeFilterPeriod,
    startDate?: string,
    endDate?: string
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await reportesCoordinadorService.getRouteDetail(routeId, period, startDate, endDate);
      setRouteDetail(data);
      return data;
    } catch (err) {
      // Igual que arriba: el error vive en `error` y no se vuelve a lanzar.
      // Nadie usa el valor que devuelve esta función, y ningún consumidor del
      // hook atrapa su rechazo.
      const errorMessage = mensajeDeError(err, 'No se pudo cargar el detalle de la ruta.');
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const exportReport = useCallback(async (
    filters: OperationalReportFilters,
    format: 'excel' | 'pdf'
  ) => {
    try {
      const blob = await reportesCoordinadorService.exportReport(filters, format);
      
      // Crear y descargar el archivo
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte-operativo-${filters.period}-${getBogotaDateKey(new Date())}.${
        format === 'excel' ? 'xlsx' : 'pdf'
      }`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      return true;
    } catch (err) {
      console.error('Error exporting report:', err);
      throw err;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    loading,
    error,
    reportData,
    routeDetail,
    fetchOperationalReport,
    fetchRouteDetail,
    exportReport,
    clearError,
  };
};