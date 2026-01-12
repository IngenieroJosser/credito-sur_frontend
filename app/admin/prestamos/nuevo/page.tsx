import React from 'react';
import { Metadata } from 'next';
import CreacionPrestamoElegante from '@/components/prestamos/CreacionPrestamo';

export const metadata: Metadata = {
  title: 'Nuevo Préstamo • Créditos Plus',
  description: 'Creación sofisticada de préstamos para electrodomésticos'
};

export default function NuevaPrestamoPage() {
  return <CreacionPrestamoElegante />;
}