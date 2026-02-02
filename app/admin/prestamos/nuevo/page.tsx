/**
 * ============================================================================
 * PÁGINA DE CREACIÓN DE CRÉDITOS (WRAPPER)
 * ============================================================================
 * 
 * @description
 * Wrapper de SEO y contenedor para el formulario de alta de créditos.
 * Renderiza el componente `CreacionUnificada` que centraliza la lógica de
 * creación tanto para préstamos "Efectivo" como "Artículos".
 */
import { Metadata } from 'next';
import CreacionUnificada from '@/components/creditos/CreacionUnificada';

export const metadata: Metadata = {
  title: 'Nuevo Crédito • CrediSur',
  description: 'Creación unificada de préstamos y créditos'
};

export default function NuevaPrestamoPage() {
  return <CreacionUnificada />;
}