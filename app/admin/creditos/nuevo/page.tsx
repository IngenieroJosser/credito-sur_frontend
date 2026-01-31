/**
 * ============================================================================
 * PÁGINA DE CREACIÓN DE CRÉDITOS UNIFICADA (ADMIN)
 * ============================================================================
 * 
 * @description
 * Wrapper de SEO y contenedor para el formulario de alta de créditos.
 * Renderiza el componente `CreacionUnificada` que permite elegir entre
 * Dinero y Artículos.
 */
import { Metadata } from 'next';
import CreacionUnificada from '@/components/creditos/CreacionUnificada';

export const metadata: Metadata = {
  title: 'Nuevo Crédito • CrediSur',
  description: 'Creación unificada de préstamos y créditos para Administradores'
};

export default function NuevoCreditoPage() {
  return <CreacionUnificada />;
}
