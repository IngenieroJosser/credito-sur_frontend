import { useState, useCallback } from 'react';
import { creditosService, CreateCreditDto, LoanResponse, LoansResponse } from '@/services/creditos-service';

export const useCreditos = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creditosData, setCreditosData] = useState<LoansResponse | null>(null);
  const [creditoDetalle, setCreditoDetalle] = useState<any | null>(null);

  const crearCredito = useCallback(async (creditData: CreateCreditDto) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await creditosService.crearCredito(creditData);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al crear el crédito';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const obtenerCreditos = useCallback(async (filters: {
    estado?: string;
    ruta?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await creditosService.obtenerCreditos(filters);
      setCreditosData(data);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar los créditos';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const obtenerCreditoPorId = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await creditosService.obtenerCreditoPorId(id);
      setCreditoDetalle(data);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar el crédito';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const aprobarCredito = useCallback(async (id: string, aprobadoPorId: string) => {
    try {
      const data = await creditosService.aprobarCredito(id, aprobadoPorId);
      return data;
    } catch (err) {
      console.error('Error approving credit:', err);
      throw err;
    }
  }, []);

  const rechazarCredito = useCallback(async (id: string, rechazadoPorId: string, motivo?: string) => {
    try {
      const data = await creditosService.rechazarCredito(id, rechazadoPorId, motivo);
      return data;
    } catch (err) {
      console.error('Error rejecting credit:', err);
      throw err;
    }
  }, []);

  const obtenerCuotas = useCallback(async (prestamoId: string) => {
    try {
      const data = await creditosService.obtenerCuotas(prestamoId);
      return data;
    } catch (err) {
      console.error('Error fetching cuotas:', err);
      throw err;
    }
  }, []);

  const eliminarCredito = useCallback(async (id: string, userId: string) => {
    try {
      const data = await creditosService.eliminarCredito(id, userId);
      return data;
    } catch (err) {
      console.error('Error deleting credit:', err);
      throw err;
    }
  }, []);

  const restaurarCredito = useCallback(async (id: string, userId: string) => {
    try {
      const data = await creditosService.restaurarCredito(id, userId);
      return data;
    } catch (err) {
      console.error('Error restoring credit:', err);
      throw err;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    loading,
    error,
    creditosData,
    creditoDetalle,
    crearCredito,
    obtenerCreditos,
    obtenerCreditoPorId,
    aprobarCredito,
    rechazarCredito,
    obtenerCuotas,
    eliminarCredito,
    restaurarCredito,
    clearError,
  };
};