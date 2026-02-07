/**
 * Componente principal para el módulo de Préstamos.
 * Funciona como un envoltorio (wrapper) sencillo que nos ayuda con el SEO
 * y carga el componente real donde ocurre toda la gestión (listado, filtros, etc).
 */
import { Metadata } from 'next';
import ListadoPrestamosElegante from '@/components/prestamos/ListadoPrestamos';

export const metadata: Metadata = {
  title: 'Préstamos • CrediSur',
  description: 'Listado y gestión de préstamos activos, atrasados y morosos'
};

export default function PrestamosPage() {
  // Aquí delegamos toda la responsabilidad al componente "ListadoPrestamosElegante"
  return <ListadoPrestamosElegante />;
}