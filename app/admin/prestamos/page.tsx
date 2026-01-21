import { Metadata } from 'next';
import ListadoPrestamosElegante from '@/components/prestamos/ListadoPrestamos';

export const metadata: Metadata = {
  title: 'Préstamos • CrediSur',
  description: 'Listado y gestión de préstamos activos, atrasados y morosos'
};

export default function PrestamosPage() {
  return <ListadoPrestamosElegante />;
}