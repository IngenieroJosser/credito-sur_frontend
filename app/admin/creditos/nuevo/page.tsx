/**
 * Página principal para la creación de nuevos créditos.
 * Funciona como un "envoltorio" simple que carga el formulario unificado.
 * Aquí es donde los administradores inician el proceso de préstamo, ya sea de dinero o artículos.
 */
import { Metadata } from 'next';
import CreacionUnificada from '@/components/creditos/CreacionUnificada';

export const metadata: Metadata = {
  title: 'Nuevo Crédito • CrediSur',
  description: 'Creación unificada de préstamos y créditos para Administradores'
};

export default function NuevoCreditoPage() {
  // Renderizamos el componente "mágico" que maneja toda la lógica del formulario
  return <CreacionUnificada />;
}
