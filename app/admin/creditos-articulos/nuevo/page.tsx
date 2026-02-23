'use client';

import React from 'react';
import CreacionCreditoArticulo from '@/components/creditos/CreacionCreditoArticulo';

/**
 * Página de creación de crédito de artículo.
 * Refactorizada para usar el componente unificado que consume
 * los plazos y precios configurados en la base de datos.
 */
export default function NuevoCreditoArticuloPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <CreacionCreditoArticulo />
    </div>
  );
}