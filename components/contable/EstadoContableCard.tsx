'use client';

import React, { useCallback, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Stethoscope,
} from 'lucide-react';

import { apiRequest } from '@/lib/api/api';
import { formatCurrency } from '@/lib/utils';
import { Cargando } from '@/components/ui/PantallaCarga';

/**
 * Revisión del estado contable, desde la pantalla.
 *
 * Estas comprobaciones existían solo dentro del cron de las 2 de la mañana, y
 * después como un endpoint que había que llamar con la cabecera de
 * autorización: en la práctica, nadie podía mirarlas. Pegar la URL en el
 * navegador devuelve 401, porque el token va por cabecera y no por cookie.
 *
 * Sirve para lo de siempre: mirar antes de tocar algo, hacerlo, y volver a
 * mirar. Si los números no cambiaron, la operación no rompió nada.
 */

interface Caja {
  nombre: string;
  saldo: number;
  segunElLibro: number;
  diferencia: number;
  cuadra: boolean;
}

interface EstadoContable {
  revisadoEn: string;
  todoEnOrden: boolean;
  problemas: string[];
  libro: {
    cuadrado: boolean;
    debitos: number;
    creditos: number;
    diferencia: number;
    asientosDescuadrados: number;
  };
  cajas: Caja[];
  cajasEnNegativo: number;
  centavos: { total: number };
  inventario: {
    segunElLibro: number;
    enBodega: number;
    diferencia: number;
  };
}

interface Regularizacion {
  valorBodega: number;
  saldoLibro: number;
  ajuste: number;
  articulos: number;
  aplicado: boolean;
}

export const EstadoContableCard: React.FC = () => {
  const [estado, setEstado] = useState<EstadoContable | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [propuesta, setPropuesta] = useState<Regularizacion | null>(null);
  const [regularizando, setRegularizando] = useState(false);

  const revisar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setEstado(
        await apiRequest<EstadoContable>(
          'GET',
          '/accounting/integridad',
          undefined,
          { cacheTTL: 0 },
        ),
      );
    } catch (e: any) {
      setError(e?.message || 'No se pudo revisar el estado contable.');
    } finally {
      setCargando(false);
    }
  }, []);

  /**
   * Poner la cuenta de inventario al día con la bodega.
   *
   * Se hace en dos tiempos a propósito: primero se calcula y se muestra la
   * cifra, y solo después se escribe. Si el número no cuadra con lo que hay en
   * bodega, el problema es el stock y no el libro, y escribir el asiento lo
   * único que haría es dejar el error grabado.
   */
  const calcularRegularizacion = useCallback(async () => {
    setRegularizando(true);
    setError(null);
    try {
      setPropuesta(
        await apiRequest<Regularizacion>(
          'POST',
          '/accounting/regularizar-inventario',
          {},
        ),
      );
    } catch (e: any) {
      setError(e?.message || 'No se pudo calcular la regularización.');
    } finally {
      setRegularizando(false);
    }
  }, []);

  const aplicarRegularizacion = useCallback(async () => {
    setRegularizando(true);
    setError(null);
    try {
      await apiRequest<Regularizacion>(
        'POST',
        '/accounting/regularizar-inventario',
        { aplicar: true },
      );
      setPropuesta(null);
      await revisar();
    } catch (e: any) {
      setError(e?.message || 'No se pudo regularizar el inventario.');
    } finally {
      setRegularizando(false);
    }
  }, [revisar]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-slate-100 p-2 text-slate-600">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Estado contable
            </h2>
            <p className="text-xs font-medium text-slate-500">
              Mírelo antes y después de una operación grande. Si los números no
              cambiaron, nada se rompió.
            </p>
          </div>
        </div>

        <button
          onClick={revisar}
          disabled={cargando}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${cargando ? 'animate-spin' : ''}`} />
          {estado ? 'Volver a revisar' : 'Revisar ahora'}
        </button>
      </div>

      {cargando && !estado && <Cargando texto="Revisando el libro…" />}

      {error && (
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </p>
      )}

      {estado && (
        <div className="space-y-4">
          {/* Veredicto */}
          <div
            className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${
              estado.todoEnOrden
                ? 'border-emerald-200 bg-emerald-50'
                : 'border-amber-200 bg-amber-50'
            }`}
          >
            {estado.todoEnOrden ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            ) : (
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            )}
            <div>
              <p
                className={`text-sm font-bold ${
                  estado.todoEnOrden ? 'text-emerald-800' : 'text-amber-800'
                }`}
              >
                {estado.todoEnOrden
                  ? 'Todo cuadra.'
                  : 'Hay cosas que revisar.'}
              </p>
              {estado.problemas.length > 0 && (
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm text-amber-900">
                  {estado.problemas.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Inventario descuadrado: se puede arreglar desde aquí */}
          {estado.inventario.diferencia !== 0 && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-bold text-slate-800">
                Poner el inventario al día
              </p>
              <p className="mt-1 text-sm text-slate-600">
                El libro dice{' '}
                <b>{formatCurrency(estado.inventario.segunElLibro)}</b> y en
                bodega hay <b>{formatCurrency(estado.inventario.enBodega)}</b>.
                Pasa cuando se cargaron artículos antes de que el sistema
                registrara su entrada contable.
              </p>

              {!propuesta ? (
                <button
                  onClick={calcularRegularizacion}
                  disabled={regularizando}
                  className="mt-3 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50"
                >
                  {regularizando ? 'Calculando…' : 'Calcular el ajuste'}
                </button>
              ) : (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="text-sm text-amber-900">
                    Se registraría un ajuste de{' '}
                    <b>{formatCurrency(Math.abs(propuesta.ajuste))}</b> sobre{' '}
                    {propuesta.articulos} artículo(s), y la cuenta de
                    inventario quedaría en{' '}
                    <b>{formatCurrency(propuesta.valorBodega)}</b>.
                  </p>
                  <p className="mt-1 text-xs font-medium text-amber-800">
                    Antes de aplicar: ¿ese es el valor real de lo que hay en
                    bodega? Si no lo es, el problema está en el stock y hay que
                    corregirlo ahí, no aquí.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => setPropuesta(null)}
                      disabled={regularizando}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-600 disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={aplicarRegularizacion}
                      disabled={regularizando}
                      className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
                    >
                      {regularizando ? 'Aplicando…' : 'Sí, aplicar el ajuste'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Cajas: saldo contra libro */}
          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
              Cajas
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="pb-2 pr-3 font-bold">Caja</th>
                    <th className="pb-2 pr-3 text-right font-bold">Saldo</th>
                    <th className="pb-2 pr-3 text-right font-bold">
                      Según el libro
                    </th>
                    <th className="pb-2 font-bold" />
                  </tr>
                </thead>
                <tbody>
                  {estado.cajas.map((c) => (
                    <tr
                      key={c.nombre}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="py-2 pr-3 font-medium text-slate-700">
                        {c.nombre}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums text-slate-800">
                        {formatCurrency(c.saldo)}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums text-slate-500">
                        {formatCurrency(c.segunElLibro)}
                      </td>
                      <td className="py-2 text-right">
                        {c.cuadra ? (
                          <span className="text-xs font-bold text-emerald-600">
                            cuadra
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-rose-600">
                            {formatCurrency(c.diferencia)} de diferencia
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Resto */}
          <dl className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
            <div className="rounded-xl bg-slate-50 px-3 py-2">
              <dt className="text-xs font-medium text-slate-500">
                Libro (débitos = créditos)
              </dt>
              <dd
                className={`font-bold ${estado.libro.cuadrado ? 'text-emerald-700' : 'text-rose-700'}`}
              >
                {estado.libro.cuadrado
                  ? 'Cuadrado'
                  : formatCurrency(estado.libro.diferencia)}
              </dd>
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-2">
              <dt className="text-xs font-medium text-slate-500">
                Asientos que no cuadran
              </dt>
              <dd
                className={`font-bold ${estado.libro.asientosDescuadrados === 0 ? 'text-emerald-700' : 'text-rose-700'}`}
              >
                {estado.libro.asientosDescuadrados}
              </dd>
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-2">
              <dt className="text-xs font-medium text-slate-500">
                Valores con centavos
              </dt>
              <dd
                className={`font-bold ${estado.centavos.total === 0 ? 'text-emerald-700' : 'text-amber-700'}`}
              >
                {estado.centavos.total}
              </dd>
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-2">
              <dt className="text-xs font-medium text-slate-500">
                Inventario: libro vs bodega
              </dt>
              <dd
                className={`font-bold ${estado.inventario.diferencia === 0 ? 'text-emerald-700' : 'text-amber-700'}`}
              >
                {estado.inventario.diferencia === 0
                  ? 'Cuadra'
                  : formatCurrency(estado.inventario.diferencia)}
              </dd>
            </div>
          </dl>

          <p className="text-xs text-slate-400">
            Revisado el{' '}
            {new Date(estado.revisadoEn).toLocaleString('es-CO', {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
            . Esta pantalla solo lee: no corrige nada.
          </p>
        </div>
      )}
    </section>
  );
};

export default EstadoContableCard;
