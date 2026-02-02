/**
 * ============================================================================
 * GESTIÓN UNIFICADA DE CRÉDITOS (DINERO Y ARTÍCULOS)
 * ============================================================================
 * 
 * @description
 * Módulo centralizado para la gestión de toda la cartera de créditos.
 * Unifica la visualización y control de:
 * 1. Préstamos en Efectivo (Gota a Gota / Microcrédito).
 * 2. Créditos de Artículos (Electrodomésticos, Hogar, etc).
 * 
 * @roles ['ADMIN', 'SUPER_ADMINISTRADOR']
 * 
 * @component ListadoPrestamosElegante
 * Componente reutilizable que ya maneja ambos tipos de producto y su lógica de filtrado.
 */

import { Metadata } from 'next';
import ListadoPrestamosElegante from '@/components/prestamos/ListadoPrestamos';

export const metadata: Metadata = {
  title: 'Gestión de Créditos • CrediSur',
  description: 'Administración unificada de préstamos en dinero y créditos de artículos'
};

export default function AdminCreditosPage() {
  return <ListadoPrestamosElegante />;
}
