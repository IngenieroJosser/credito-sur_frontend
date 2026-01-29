/**
 * ============================================================================
 * PÁGINA DE GESTIÓN DE PRÉSTAMOS (WRAPPER)
 * ============================================================================
 * 
 * @description
 * Punto de entrada para el módulo de listado de préstamos.
 * Actúa como un contenedor (Wrapper Component) que configura los metadatos SEO
 * y renderiza el componente principal `ListadoPrestamosElegante`.
 * 
 * @component ListadoPrestamosElegante
 * Contiene toda la lógica de negocio: filtros, tabla de datos y acciones.
 */
import { Metadata } from 'next';
import ListadoPrestamosElegante from '@/components/prestamos/ListadoPrestamos';

export const metadata: Metadata = {
  title: 'Préstamos • CrediSur',
  description: 'Listado y gestión de préstamos activos, atrasados y morosos'
};

export default function PrestamosPage() {
  return <ListadoPrestamosElegante />;
}