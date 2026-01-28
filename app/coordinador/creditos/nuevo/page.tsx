import { Metadata } from 'next';
import CreacionUnificada from '@/components/creditos/CreacionUnificada';

export const metadata: Metadata = {
  title: 'Nuevo Crédito • CrediSur',
  description: 'Creación unificada de préstamos y créditos'
};

export default function NuevaPrestamoPage() {
  return <CreacionUnificada />;
}
