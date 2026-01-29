'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Save, DollarSign } from 'lucide-react';
import { formatCOPInputValue, formatMilesCOP, parseCOPInputToNumber } from '@/lib/utils';

export default function EditarPrestamoPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [montoInput, setMontoInput] = useState(formatMilesCOP(1500000));
  const [tasaInput, setTasaInput] = useState('20');
  const [cuotasInput, setCuotasInput] = useState('6');
  const [frecuencia, setFrecuencia] = useState('MENSUAL');
  const [estado, setEstado] = useState('ACTIVO');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      monto: parseCOPInputToNumber(montoInput),
      duracionMeses: Number(cuotasInput || '0'),
      frecuencia,
      tasa: Number(tasaInput || '0'),
      estado,
    };
    alert('Préstamo actualizado (Simulado)');
    console.log('Actualizar préstamo:', id, payload);
    router.push(`/coordinador/creditos/${id}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 relative pb-12">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="fixed left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-blue-500 opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 px-4 pt-4">
        <div className="mb-4 flex items-center justify-between">
          <Link href={`/coordinador/creditos/${id}`} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900">
            <ArrowLeft className="w-5 h-5" />
            <span>Volver al Detalle</span>
          </Link>
        </div>

        <div className="mb-5">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">
            <span className="text-blue-600">Editar</span> <span className="text-orange-500">Préstamo</span>
          </h1>
          <p className="text-slate-500 text-sm font-medium">
            Modificar condiciones del préstamo {id}
          </p>
        </div>

        <div className="w-full bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Monto Original</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  inputMode="numeric"
                  value={montoInput}
                  onChange={(e) => setMontoInput(formatCOPInputValue(e.target.value))}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Tasa Interés (%)</label>
              <input
                type="text"
                inputMode="decimal"
                value={tasaInput}
                onChange={(e) => setTasaInput(e.target.value.replace(/[^0-9.]/g, ''))}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-slate-900"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Cuotas</label>
              <input
                type="text"
                inputMode="numeric"
                value={cuotasInput}
                onChange={(e) => setCuotasInput(e.target.value.replace(/\D/g, ''))}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-slate-900"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Frecuencia</label>
              <select
                value={frecuencia}
                onChange={e => setFrecuencia(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-slate-900"
              >
                <option value="DIARIO">Diario</option>
                <option value="SEMANAL">Semanal</option>
                <option value="QUINCENAL">Quincenal</option>
                <option value="MENSUAL">Mensual</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Estado</label>
              <select
                value={estado}
                onChange={e => setEstado(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-slate-900"
              >
                <option value="ACTIVO">Activo</option>
                <option value="PENDIENTE">Pendiente</option>
                <option value="PAGADO">Pagado</option>
                <option value="EN_MORA">En Mora</option>
              </select>
            </div>

                <div className="col-span-full pt-4 flex justify-end gap-3 border-t border-slate-100 mt-2">
                    <Link href={`/coordinador/creditos/${id}`} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors">
                        Cancelar
                    </Link>
                    <button type="submit" className="px-6 py-2 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 flex items-center gap-2">
                        <Save className="w-4 h-4" />
                        Guardar Cambios
                    </button>
                </div>
            </form>
        </div>
      </div>
    </div>
  );
}
