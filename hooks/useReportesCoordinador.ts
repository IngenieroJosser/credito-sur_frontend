import { useState, useCallback } from 'react';
import { reportesCoordinadorService } from '@/services/reportes-coordinador-service'; 
import type { OperationalReportFilters, OperationalReportResponse, RouteDetailResponse } from '@/services/reportes-coordinador-service';
import type { TimeFilterPeriod } from '@/components/ui/TimeFilter';

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
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar el reporte';
      setError(errorMessage);
      throw err;
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
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar el detalle de ruta';
      setError(errorMessage);
      throw err;
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
      a.download = `reporte-operativo-${filters.period}-${new Date().toISOString().split('T')[0]}.${
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