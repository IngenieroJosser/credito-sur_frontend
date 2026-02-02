'use client';

/**
 * ============================================================================
 * SELECTOR DE TIPO DE CRÉDITO
 * ============================================================================
 * 
 * @description
 * Componente de orden superior (Layout funcional) que permite al operario elegir
 * entre crear un préstamo monetario o un crédito para compra de artículos.
 * Renderiza condicionalmente el formulario específico según la elección.
 * 
 * @subcomponents
 * - CreacionPrestamoElegante (Dinero)
 * - CreacionCreditoArticulo (Artículos)
 */
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DollarSign, ShoppingBag, ArrowLeft } from 'lucide-react';
import CreacionPrestamoElegante from '@/components/prestamos/CreacionPrestamo';
import CreacionCreditoArticulo from '@/components/creditos/CreacionCreditoArticulo';

export default function CreacionUnificada() {
  const router = useRouter();
  
  // Estado para alternar entre formularios
  const [tipoCredito, setTipoCredito] = useState<'DINERO' | 'ARTICULO'>('DINERO');

  return (
    <div className="min-h-screen bg-slate-50 relative pb-12">
      {/* Fondo y Header similar a los anteriores para consistencia */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="fixed left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-blue-500 opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 px-8 pt-8">
        {/* Top Bar */}
        <div className="mb-6 flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Volver</span>
            </button>
        </div>

        {/* Title & Type Selector */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 text-white">
                        {tipoCredito === 'DINERO' ? <DollarSign className="w-6 h-6" /> : <ShoppingBag className="w-6 h-6" />}
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                        Nueva Solicitud
                    </h1>
                </div>
                <p className="text-slate-500 font-medium">Seleccione el tipo de crédito que desea gestionar</p>
            </div>

            <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-sm flex">
                <button
                    onClick={() => setTipoCredito('DINERO')}
                    className={`px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${
                        tipoCredito === 'DINERO' 
                        ? 'bg-blue-600 text-white shadow-md' 
                        : 'text-slate-500 hover:bg-slate-50'
                    }`}
                >
                    <DollarSign className="w-4 h-4" />
                    Préstamo Dinero
                </button>
                <button
                    onClick={() => setTipoCredito('ARTICULO')}
                    className={`px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${
                        tipoCredito === 'ARTICULO' 
                        ? 'bg-orange-500 text-white shadow-md' 
                        : 'text-slate-500 hover:bg-slate-50'
                    }`}
                >
                    <ShoppingBag className="w-4 h-4" />
                    Crédito Artículo
                </button>
            </div>
        </div>

        {/* Content Area */}
        <div className="bg-white/50 backdrop-blur-sm rounded-3xl border border-slate-200/60 p-1 md:p-6 shadow-xl shadow-slate-200/40">
            {tipoCredito === 'DINERO' ? (
                <CreacionPrestamoElegante />
            ) : (
                <CreacionCreditoArticulo />
            )}
        </div>
      </div>
    </div>
  );
}
