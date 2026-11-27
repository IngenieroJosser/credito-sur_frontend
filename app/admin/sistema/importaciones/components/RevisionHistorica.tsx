import { useState } from 'react';
import { ChevronLeft, ChevronRight, Save } from 'lucide-react';
import { Selector } from '@/components/ui/Selector';
import CampoFecha from '@/components/ui/CampoFecha';
import { formatCurrency } from '@/lib/utils';
import { FRECUENCIAS, type CasoHistorico, type DecisionesHistoricas, type Interpretacion, type MetodoVerificacion, type RevisionHistoricaResultado } from '@/types/importaciones-historicas';

const input = 'mt-1 block w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm';
const boton = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold disabled:opacity-50';
const INTERPRETACIONES = [
  { value: 'PRECIO_TOTAL', label: 'Precio total antes de la inicial' },
  { value: 'FINANCIADO', label: 'Monto ya financiado' },
] as const;
const CAMPOS_NUMERICOS = new Set(['precio_pactado', 'financiado', 'inicial', 'abonado', 'saldo_informado', 'cuotas', 'autorizar_saldo']);
const CAMPOS_FECHA = new Set(['fecha_credito', 'primer_cobro', 'ultimo_pago', 'saldo_corte']);
const CAMPOS_CONFIRMACION = new Set(['identidad_distinta', 'sin_ajustes', 'verificar_condiciones']);
const CAMPOS_REFERENCIA = new Set(['cliente_ref', 'articulo_ref', 'consolidar_cliente']);
const RUBROS = [
  ['precio', 'Precio pactado'], ['inicial', 'Cuota inicial'], ['financiado', 'Financiado'],
  ['total', 'Total contractual'], ['cuota', 'Valor de la cuota'], ['abonado', 'Total abonado'], ['saldo', 'Saldo pendiente'],
] as const;
const TITULOS: Record<string, string> = {
  interpretacion_monto: 'Interpretación del monto', cuotas: 'Cantidad de cuotas',
  verificar_condiciones: 'Verificación de condiciones históricas', autorizar_saldo: 'Autorizar saldo conciliado',
  saldo_corte: 'Fecha de corte', saldo_informado: 'Saldo informado', cliente_ref: 'Cliente vinculado',
  consolidar_cliente: 'Consolidar con otra fila', identidad_distinta: 'Confirmar que son personas distintas',
  articulo_ref: 'Artículo vinculado', abonado: 'Total abonado', inicial: 'Cuota inicial',
};
const mostrarCampo = (campo: string) => TITULOS[campo] ?? campo.replaceAll('_', ' ');
const resoluble = (campo: string) => campo === 'interpretacion_monto' || CAMPOS_NUMERICOS.has(campo) ||
  CAMPOS_FECHA.has(campo) || CAMPOS_CONFIRMACION.has(campo) || CAMPOS_REFERENCIA.has(campo);

function RevisionFila({ caso, decisiones, cambiar }: {
  caso: CasoHistorico;
  decisiones: DecisionesHistoricas;
  cambiar: (d: DecisionesHistoricas) => void;
}) {
  const [campo, setCampo] = useState(caso.excepciones[0]?.campo ?? 'verificar_condiciones');
  const [accion, setAccion] = useState<'aprobar' | 'rechazar'>('rechazar');
  const [valor, setValor] = useState('');
  const [evidencia, setEvidencia] = useState('');
  const [metodo, setMetodo] = useState<MetodoVerificacion | ''>('');
  const activos = [...decisiones.filas, ...(decisiones.rechazos ?? [])].filter(d => d.referencia === caso.referencia);
  const extra = caso.tipo === 'DINERO' || caso.tipo === 'CREDITO_ARTICULO'
    ? ['cuotas', 'abonado', 'saldo_corte', 'saldo_informado', 'verificar_condiciones', 'autorizar_saldo']
    : caso.tipo === 'CLIENTE' ? ['consolidar_cliente', 'identidad_distinta'] : [];
  const candidatos = [...new Map(caso.excepciones.flatMap(e => e.candidatos ?? [])
    .filter(c => c.campo === (campo === 'consolidar_cliente' ? 'cliente_ref' : campo))
    .map(c => [c.referencia, c])).values()];
  const campos = [...new Set([...caso.excepciones.map(e => e.campo), ...extra])];
  const valorValido = CAMPOS_CONFIRMACION.has(campo) ||
    (valor.trim() !== '' && (!CAMPOS_NUMERICOS.has(campo) || (Number.isSafeInteger(Number(valor)) && Number(valor) >= 0)));
  const registrar = () => {
    const coincide = (d: { referencia: string; campo: string }) => d.referencia === caso.referencia && d.campo === campo;
    const filas = decisiones.filas.filter(d => !coincide(d));
    const rechazos = (decisiones.rechazos ?? []).filter(d => !coincide(d));
    const registro = { referencia: caso.referencia, campo, evidencia: evidencia.trim() };
    if (accion === 'aprobar') {
      const valorAprobado = CAMPOS_CONFIRMACION.has(campo) ? true : CAMPOS_NUMERICOS.has(campo) ? Number(valor) : valor.trim();
      filas.push({ ...registro, valor: valorAprobado,
        ...(campo === 'autorizar_saldo' && metodo ? { metodoVerificacion: metodo } : {}) });
    } else rechazos.push(registro);
    cambiar({ ...decisiones, filas, rechazos });
    setEvidencia('');
  };
  return (
    <div className="border-t border-slate-200 py-4">
      <h4 className="text-sm font-bold text-slate-900">{caso.hoja} · Fila {caso.fila}</h4>
      <p className="mt-1 break-all text-xs text-slate-600">{caso.referencia}</p>
      {caso.conciliacion && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-700">
          <span className="rounded bg-slate-100 px-2 py-1">Cálculo: {caso.consistencia === 'CONSISTENTE' ? 'Consistente' : caso.consistencia === 'DIFERENCIA' ? 'Con diferencia' : 'No calculable'}</span>
          <span className="rounded bg-slate-100 px-2 py-1">{caso.condiciones === 'VERIFICADAS' ? 'Condiciones verificadas' : 'Condiciones sin verificar'}</span>
          <span className="rounded bg-amber-50 px-2 py-1 text-amber-900">{caso.conciliacion === 'NO_AUTORIZADA' ? 'Saldo sin autorizar' : 'Saldo autorizado en revisión'}</span>
        </div>
      )}
      <ul className="mt-3 space-y-2 text-sm text-slate-700">
        {caso.excepciones.map((e, i) => (
          <li key={`${e.campo}-${i}`}>
            <strong>{mostrarCampo(e.campo)}:</strong> {e.motivo}
            {!!e.candidatos?.length && <span className="block text-xs text-slate-600">Candidatos: {e.candidatos.map(c => c.etiqueta).join('; ')}</span>}
            {(e.original !== null || e.propuesta !== null) &&
              <span className="block break-words text-xs text-slate-600">
                Original: {e.original === null ? 'Sin dato' : String(e.original)} · Propuesta: {e.propuesta === null ? 'Sin dato' : String(e.propuesta)}
              </span>}
          </li>
        ))}
      </ul>
      {!!caso.escenarios?.length && (
        <details className="group mt-3 rounded-md border border-slate-200 bg-slate-50 p-3">
          <summary className="flex cursor-pointer items-center gap-1 text-sm font-semibold">
            <ChevronRight size={16} className="group-open:rotate-90" aria-hidden="true" /> Comparar interpretaciones del monto
          </summary>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[360px] text-left text-sm">
              <thead><tr><th scope="col">Concepto</th><th scope="col">Si era precio total</th><th scope="col">Si ya era financiado</th></tr></thead>
              <tbody>{RUBROS.map(([clave, etiqueta]) => (
                <tr key={clave} className="border-t border-slate-200">
                  <th scope="row" className="py-1 pr-2 font-medium">{etiqueta}</th>
                  {caso.escenarios?.map(escenario => {
                    const valor = escenario[clave];
                    return <td key={escenario.tipo} className="py-1 pr-2">{typeof valor === 'number' ? formatCurrency(valor) : 'Sin dato'}</td>;
                  })}
                </tr>
              ))}</tbody>
            </table>
          </div>
        </details>
      )}
      <div className="my-3 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="grid min-w-0 grid-cols-1 gap-1 text-sm">
          <span>Campo</span>
          <Selector etiqueta="Campo" value={campo}
            onChange={c => { setCampo(c); setValor(''); setAccion('rechazar'); }}
            opciones={campos.map(c => ({ value: c, label: mostrarCampo(c) }))} />
        </div>
        <div className="grid min-w-0 grid-cols-1 gap-1 text-sm">
          <span>Decisión</span>
          <Selector<'aprobar' | 'rechazar'> etiqueta="Decisión" value={accion} onChange={setAccion} opciones={[
            { value: 'rechazar', label: 'Rechazar propuesta' },
            { value: 'aprobar', label: 'Aprobar con evidencia', disabled: !resoluble(campo) },
          ]} />
        </div>
        {accion === 'aprobar' && !CAMPOS_CONFIRMACION.has(campo) && (
          <div className="grid min-w-0 grid-cols-1 gap-1 text-sm">
            <span>{CAMPOS_REFERENCIA.has(campo) ? 'Referencia de origen' : 'Valor aprobado'}</span>
            {campo === 'interpretacion_monto' ? (
              <Selector<string> etiqueta="Valor aprobado" value={valor} onChange={setValor} opciones={INTERPRETACIONES} />
            ) : candidatos.length ? (
              <Selector etiqueta="Referencia de origen" value={valor} onChange={setValor}
                opciones={candidatos.map(c => ({ value: c.referencia, label: c.etiqueta }))} />
            ) : CAMPOS_FECHA.has(campo) ? (
              <CampoFecha etiqueta="Valor aprobado" value={valor} onChange={setValor} />
            ) : <input className={input} value={valor} maxLength={80}
              aria-label={CAMPOS_REFERENCIA.has(campo) ? 'Referencia de origen' : 'Valor aprobado'}
              type={CAMPOS_NUMERICOS.has(campo) ? 'number' : 'text'}
              min={CAMPOS_NUMERICOS.has(campo) ? 0 : undefined} onChange={e => setValor(e.target.value)} />}
          </div>
        )}
        {accion === 'aprobar' && campo === 'autorizar_saldo' && (
          <div className="grid min-w-0 grid-cols-1 gap-1 text-sm">
            <span>Método de verificación</span>
            <Selector<MetodoVerificacion> etiqueta="Método de verificación" value={metodo} onChange={setMetodo} opciones={[
              { value: 'TARJETA_FISICA', label: 'Tarjeta física' },
              { value: 'SALDO_CARTERA', label: 'Saldo de cartera' },
            ]} />
          </div>
        )}
        <label className="text-sm sm:col-span-2">Evidencia
          <input className={input} maxLength={450} value={evidencia} onChange={e => setEvidencia(e.target.value)} />
        </label>
      </div>
      <button className={boton} type="button" onClick={registrar}
        disabled={evidencia.trim().length < 3 || (accion === 'aprobar' && (!valorValido || (campo === 'autorizar_saldo' && !metodo)))}>
        Añadir decisión
      </button>
      {activos.length > 0 && <p className="mt-2 text-xs text-teal-800">{activos.length} decisión(es) incluidas para esta fila.</p>}
    </div>
  );
}

export function RevisionHistorica({ resultado, decisiones, cambiar, guardar, ocupado }: {
  resultado: RevisionHistoricaResultado;
  decisiones: DecisionesHistoricas;
  cambiar: (d: DecisionesHistoricas) => void;
  guardar: () => void;
  ocupado: boolean;
}) {
  const [pagina, setPagina] = useState(0);
  const [filtro, setFiltro] = useState('');
  const [evidencia, setEvidencia] = useState('');
  const [interpretacion, setInterpretacion] = useState<Interpretacion | ''>('');
  const [fechaCorte, setFechaCorte] = useState('');
  const [ceros, setCeros] = useState(false);
  const [frecuencias, setFrecuencias] = useState<string[]>([]);
  const filtrados = resultado.casos.filter(c => [c.referencia, c.hoja, String(c.fila)].some(s => s.toLowerCase().includes(filtro.trim().toLowerCase())));
  const ultima = Math.max(0, Math.ceil(filtrados.length / 5) - 1);
  const actual = Math.min(pagina, ultima);
  const agregarReglas = () => {
    const reglas = { ...decisiones.reglas };
    if (interpretacion) reglas.montoArticulo = { valor: interpretacion, evidencia: evidencia.trim() };
    if (fechaCorte) reglas.fechaCorteCartera = { valor: fechaCorte, evidencia: evidencia.trim() };
    if (ceros) reglas.cerosIniciales = { valor: true, evidencia: evidencia.trim() };
    const porFrecuencia = { ...reglas.cuotasPorFrecuenciaIndividual };
    for (const f of FRECUENCIAS) if (frecuencias.includes(f)) porFrecuencia[f] = { valor: true, evidencia: evidencia.trim() };
    if (frecuencias.length > 0) reglas.cuotasPorFrecuenciaIndividual = porFrecuencia;
    cambiar({ ...decisiones, reglas });
    setEvidencia('');
  };
  return (
    <fieldset disabled={ocupado} className="mt-5 min-w-0 border-t border-slate-200 pt-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900">Revisión de cartera</h3>
          <p className="text-sm text-slate-600">{resultado.total} filas · {resultado.casos.length} por revisar</p>
        </div>
        <button type="button" className={boton} onClick={guardar} disabled={decisiones === resultado.decisiones}>
          <Save size={16} aria-hidden="true" /> Registrar y reevaluar
        </button>
      </div>
      <details className="group my-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <summary className="flex cursor-pointer items-center gap-1 text-sm font-semibold">
          <ChevronRight size={16} className="group-open:rotate-90" aria-hidden="true" /> Decisiones para el lote
        </summary>
        <div className="mt-3 grid min-w-0 grid-cols-1 gap-3">
          <label className="text-sm"><input type="checkbox" checked={ceros} onChange={e => setCeros(e.target.checked)} /> Equivalencia de códigos con ceros iniciales</label>
          <div className="grid min-w-0 grid-cols-1 gap-1 text-sm">
            <span>Interpretar monto de artículo como</span>
            <Selector<Interpretacion | ''> etiqueta="Interpretar monto de artículo como" value={interpretacion}
              onChange={setInterpretacion} opciones={[
                { value: '', label: 'No aplicar una regla general' }, ...INTERPRETACIONES,
              ]} />
          </div>
          <fieldset>
            <legend className="text-sm font-semibold">Derivar cuotas históricas por frecuencia</legend>
            <div className="mt-2 flex flex-wrap gap-3">
              {FRECUENCIAS.map(f => <label key={f} className="text-sm">
                <input type="checkbox" checked={frecuencias.includes(f)} onChange={e => setFrecuencias(prev => e.target.checked ? [...prev, f] : prev.filter(v => v !== f))} /> {f}
              </label>)}
            </div>
          </fieldset>
          <div className="grid min-w-0 grid-cols-1 gap-1 text-sm">
            <span>Fecha de corte de cartera</span>
            <CampoFecha etiqueta="Fecha de corte de cartera" value={fechaCorte} onChange={setFechaCorte} />
            {decisiones.reglas.fechaCorteCartera && <p className="text-slate-600">
              Corte del lote: {decisiones.reglas.fechaCorteCartera.valor}
            </p>}
          </div>
          <label className="text-sm">Evidencia de las reglas seleccionadas
            <input className={input} value={evidencia} onChange={e => setEvidencia(e.target.value)} maxLength={500} />
          </label>
          <button className={`${boton} justify-self-start`} type="button" onClick={agregarReglas}
            disabled={evidencia.trim().length < 3 || (!fechaCorte && !ceros && !interpretacion && frecuencias.length === 0)}>Añadir reglas</button>
        </div>
      </details>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <label className="text-sm">Buscar por hoja, fila o referencia
          <input className={input} type="search" value={filtro} onChange={e => { setFiltro(e.target.value); setPagina(0); }} />
        </label>
        <div className="flex items-center gap-2 text-sm">
          <button type="button" className={`${boton} px-2`} aria-label="Página anterior" disabled={actual === 0} onClick={() => setPagina(actual - 1)}><ChevronLeft size={16} /></button>
          <span>{actual + 1} / {ultima + 1}</span>
          <button type="button" className={`${boton} px-2`} aria-label="Página siguiente" disabled={actual === ultima} onClick={() => setPagina(actual + 1)}><ChevronRight size={16} /></button>
        </div>
      </div>
      {filtrados.length === 0 && <p className="text-sm text-slate-600">No hay casos para esta búsqueda.</p>}
      {filtrados.slice(actual * 5, actual * 5 + 5).map(caso =>
        <RevisionFila key={caso.referencia} caso={caso} decisiones={decisiones} cambiar={cambiar} />)}
    </fieldset>
  );
}
