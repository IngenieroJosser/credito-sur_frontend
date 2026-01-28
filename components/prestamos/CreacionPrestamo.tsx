'use client';

import React, { useState, useMemo } from 'react';
import {
  DollarSign, Percent, Clock,
  FileText,
  CheckCircle, ArrowLeft,
  PlusCircle,
  ChevronRight, ChevronDown, Search, Filter
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';
import { FileUploader } from '@/components/ui/FileUploader';
import NuevoClienteModal from '@/components/clientes/NuevoClienteModal';
import { MOCK_CLIENTES, Cliente } from '@/services/clientes-service';

// Enums alineados con Prisma
type FrecuenciaPago = 'DIARIO' | 'SEMANAL' | 'QUINCENAL' | 'MENSUAL';
type NivelRiesgo = 'VERDE' | 'AMARILLO' | 'ROJO' | 'LISTA_NEGRA';
type TipoInteres = 'SIMPLE' | 'AMORTIZABLE';

// Interfaces alineadas con Prisma (Simuladas para Frontend)

interface FormularioPrestamo {
  clienteId: string;
  montoTotal: number; // monto
  proposito: string; // tipoPrestamo (mapeado o libre)
  tasaInteres: number; // tasaInteres
  duracionMeses: number; // duracionMeses
  frecuenciaPago: FrecuenciaPago; // frecuenciaPago
  tipoInteres: TipoInteres;
  fechaInicio: string; // fechaInicio
  tasaInteresMora: number; // tasaInteresMora

  // Campos adicionales de negocio (no necesariamente en Prestamo model directo, o calculados)
  cuotaInicial: number; // Puede ser un pago inicial
  gastosAdministrativos: number; // Puede ser un Gasto asociado
  comision: number; // %
  observaciones: string;
}

interface CuotaCalculada {
  numero: number;
  fecha: string;
  capital: number;
  interes: number;
  total: number;
  saldo: number;
}

const calcularCuotasYResumen = (form: FormularioPrestamo) => {
  if (!form.clienteId || form.montoTotal <= 0 || form.duracionMeses <= 0) {
    return {
      cuotas: [] as CuotaCalculada[],
      resumenPrestamo: {
        totalFinanciado: 0,
        totalInteres: 0,
        totalPagar: 0,
        valorCuota: 0,
        costoTotalCredito: 0,
        tea: 0,
        tae: 0,
        comisionTotal: 0
      }
    };
  }

  const montoNeto = form.montoTotal - form.cuotaInicial;
  const comisionTotal = (form.montoTotal * form.comision) / 100;
  const montoFinanciado = montoNeto + comisionTotal;

  const tasaMensual = form.tasaInteres / 100;
  const cuotasCalculadas: CuotaCalculada[] = [];
  let saldo = montoFinanciado;

  const factorFrecuencia = {
    DIARIO: 30,
    SEMANAL: 4.33,
    QUINCENAL: 2,
    MENSUAL: 1
  };

  const cuotasTotales = Math.ceil(form.duracionMeses * factorFrecuencia[form.frecuenciaPago]);
  const tasaPeriodo = tasaMensual / factorFrecuencia[form.frecuenciaPago];

  let cuotaFija = 0;
  let totalInteres = 0;

  if (form.tipoInteres === 'SIMPLE') {
    const interesTotalCalculado = montoFinanciado * tasaMensual * form.duracionMeses;
    const totalPagarCalculado = montoFinanciado + interesTotalCalculado;
    cuotaFija = totalPagarCalculado / cuotasTotales;
  } else {
    if (tasaPeriodo > 0) {
      cuotaFija = (montoFinanciado * tasaPeriodo) / (1 - Math.pow(1 + tasaPeriodo, -cuotasTotales));
    } else {
      cuotaFija = montoFinanciado / cuotasTotales;
    }
  }

  const fechaPago = new Date(form.fechaInicio);

  for (let i = 1; i <= cuotasTotales; i++) {
    let capital = 0;
    let interes = 0;

    if (form.tipoInteres === 'SIMPLE') {
       interes = (montoFinanciado * tasaMensual * form.duracionMeses) / cuotasTotales;
       capital = cuotaFija - interes;
    } else {
       interes = saldo * tasaPeriodo;
       capital = cuotaFija - interes;
    }

    let capitalFinal = capital;
    if (i === cuotasTotales) {
      capitalFinal = saldo;
    }

    saldo -= capitalFinal;

    if (form.frecuenciaPago === 'DIARIO') {
      fechaPago.setDate(fechaPago.getDate() + 1);
    } else if (form.frecuenciaPago === 'SEMANAL') {
      fechaPago.setDate(fechaPago.getDate() + 7);
    } else if (form.frecuenciaPago === 'QUINCENAL') {
      fechaPago.setDate(fechaPago.getDate() + 15);
    } else { 
      fechaPago.setMonth(fechaPago.getMonth() + 1);
    }

    cuotasCalculadas.push({
      numero: i,
      fecha: fechaPago.toLocaleDateString('es-CO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }),
      capital: Math.round(capitalFinal),
      interes: Math.round(interes),
      total: Math.round(capitalFinal + interes),
      saldo: Math.round(Math.max(0, saldo))
    });
  }

  totalInteres = cuotasCalculadas.reduce((sum, c) => sum + c.interes, 0);
  const totalPagar = montoFinanciado + totalInteres;
  const tea = Math.pow(1 + tasaMensual, 12) - 1;
  const tae = Math.pow(1 + tasaPeriodo, cuotasTotales) - 1;

  return {
    cuotas: cuotasCalculadas.slice(0, 6),
    resumenPrestamo: {
      totalFinanciado: montoFinanciado,
      totalInteres: Math.round(totalInteres),
      totalPagar: Math.round(totalPagar),
      valorCuota: Math.round(cuotaFija),
      costoTotalCredito: Math.round(totalInteres + form.gastosAdministrativos + comisionTotal),
      tea: Number((tea * 100).toFixed(2)),
      tae: Number((tae * 100).toFixed(2)),
      comisionTotal: Math.round(comisionTotal)
    }
  };
};

const CreacionPrestamoElegante = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [mostrarNuevoCliente, setMostrarNuevoCliente] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [creandoPrestamo, setCreandoPrestamo] = useState(false);
  const [documentosRespaldo, setDocumentosRespaldo] = useState({
    fotoPerfil: null as File | null,
    documentoFrente: null as File | null,
    documentoReverso: null as File | null,
    comprobanteDomicilio: null as File | null,
  })
  
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [filtroRiesgo, setFiltroRiesgo] = useState<NivelRiesgo | 'TODOS'>('TODOS');
  const [clientes, setClientes] = useState<Cliente[]>(MOCK_CLIENTES as unknown as Cliente[]);

  const [form, setForm] = useState<FormularioPrestamo>({
    clienteId: '',
    montoTotal: 0,
    proposito: 'PERSONAL',
    tasaInteres: 5.0,
    duracionMeses: 0,
    frecuenciaPago: 'QUINCENAL',
    tipoInteres: 'AMORTIZABLE',
    fechaInicio: new Date().toISOString().split('T')[0],
    tasaInteresMora: 2.0,
    cuotaInicial: 0,
    gastosAdministrativos: 10000,
    comision: 1.0,
    observaciones: ''
  });

  const [montoTotalInput, setMontoTotalInput] = useState('')
  const [cuotasInput, setCuotasInput] = useState('')

  const { resumenPrestamo } = useMemo(() => calcularCuotasYResumen(form), [form]);

  const clienteSeleccionado = clientes.find(c => String(c.id) === String(form.clienteId));

  const clientesFiltrados = clientes.filter(cliente => {
    const nombreCompleto = `${cliente.nombres || ''} ${cliente.apellidos || ''}`.toLowerCase();
    const cumpleBusqueda = 
      nombreCompleto.includes(busquedaCliente.toLowerCase()) || 
      (cliente.dni || '').includes(busquedaCliente);
    
    const cumpleFiltro = filtroRiesgo === 'TODOS' || cliente.nivelRiesgo === filtroRiesgo;
    return cumpleBusqueda && cumpleFiltro;
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: name.includes('tasa') || name.includes('gastos') || name.includes('comision')
        ? parseFloat(value) || 0
        : name === 'montoTotal' || name === 'cuotaInicial'
          ? parseFloat(value) || 0
          : name === 'duracionMeses'
            ? parseInt(value) || 0
            : value
    }));
  };

  const handleCrearPrestamo = async () => {
    if (!clienteSeleccionado) {
      alert('Por favor, seleccione un cliente.');
      return;
    }

    setCreandoPrestamo(true);

    try {
      const datosPrestamo = {
        clienteId: form.clienteId,
        montoTotal: form.montoTotal,
        proposito: form.proposito,
        tasaInteres: form.tasaInteres,
        tasaInteresMora: form.tasaInteresMora,
        tipoInteres: form.tipoInteres,
        duracionMeses: form.duracionMeses,
        frecuenciaPago: form.frecuenciaPago,
        fechaInicio: form.fechaInicio,
        cuotaInicial: form.cuotaInicial,
        gastosAdministrativos: form.gastosAdministrativos,
        comision: form.comision,
        observaciones: form.observaciones,
      };

      console.log('Enviando datos del préstamo:', datosPrestamo);
      await new Promise(resolve => setTimeout(resolve, 1500));

      const resultado = {
        id: 'PR-' + Date.now().toString().slice(-6),
        numeroPrestamo: 'PR-' + Math.floor(100000 + Math.random() * 900000),
        fechaCreacion: new Date().toISOString()
      };

      alert(`✅ Préstamo creado exitosamente\n\n📋 Número: ${resultado.numeroPrestamo}\n👤 Cliente: ${clienteSeleccionado.nombres} ${clienteSeleccionado.apellidos}\n💰 Monto: ${formatCurrency(form.montoTotal)}\n📅 Cuota: ${formatCurrency(resumenPrestamo.valorCuota)} ${form.frecuenciaPago.toLowerCase()}`);

      let destino = '/admin/prestamos';
      if (pathname?.startsWith('/supervisor')) destino = '/supervisor';
      if (pathname?.startsWith('/coordinador')) destino = '/coordinador/creditos';
      router.push(destino);

    } catch (error) {
      console.error('Error al crear el préstamo:', error);
      alert('Error al crear el préstamo. Por favor, intente nuevamente.');
    } finally {
      setCreandoPrestamo(false);
    }
  };

  const handleClienteCreado = (nuevoCliente: Cliente) => {
    setClientes(prev => [nuevoCliente, ...prev]);
    setForm(prev => ({ ...prev, clienteId: nuevoCliente.id }));
    setMostrarNuevoCliente(false);
  };

  const siguienteStep = () => {
    if (step < 4 && form.clienteId) {
      setAnimating(true);
      setTimeout(() => {
        setStep((step + 1) as 1 | 2 | 3 | 4);
        setAnimating(false);
      }, 200);
    }
  };

  const anteriorStep = () => {
    if (step > 1) {
      setAnimating(true);
      setTimeout(() => {
        setStep((step - 1) as 1 | 2 | 3 | 4);
        setAnimating(false);
      }, 200);
    }
  };

  const getAvatarColor = (id: string) => {
    const colors = ['bg-slate-100', 'bg-slate-200', 'bg-slate-50'];
    const numId = parseInt(String(id).match(/\d+/)?.[0] || '0');
    return colors[numId % 3];
  };

  const handleMontoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    const digits = raw.replace(/\D/g, '')
    if (!digits) {
      setMontoTotalInput('')
      setForm(prev => ({ ...prev, montoTotal: 0 }))
      return
    }

    const value = Number(digits)
    const formatted = new Intl.NumberFormat('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
    setMontoTotalInput(formatted)
    setForm(prev => ({ ...prev, montoTotal: value }))
  };

  const handleCuotasChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    const digits = raw.replace(/\D/g, '')
    if (!digits) {
      setCuotasInput('')
      setForm(prev => ({ ...prev, duracionMeses: 0 }))
      return
    }

    setCuotasInput(digits)
    setForm(prev => ({ ...prev, duracionMeses: Number(digits) }))
  }

  return (
    <div className="min-h-screen bg-slate-50 relative pb-12">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="fixed left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-indigo-500 opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 px-0 pt-0">
        <div className="mb-8 flex items-center justify-between">
           <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-4">
              {[1, 2, 3].map((num) => (
                <div key={num} className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${step >= num
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                      : 'border border-slate-300 text-slate-400'
                    }`}>
                    {step > num ? '✓' : num}
                  </div>
                  {num < 3 && (
                    <div className={`w-8 h-px transition-colors duration-300 ${step > num ? 'bg-blue-600' : 'bg-slate-200'
                      }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="w-full">
          <div className={`space-y-8 transition-opacity duration-300 ${animating ? 'opacity-70' : 'opacity-100'}`}>
              {step === 1 && (
                <div className="space-y-8">
                  <div className="flex items-center justify-between mb-8">
                    <div className="space-y-1">
                      <h2 className="text-xl font-bold text-slate-900">Seleccionar Cliente</h2>
                      <p className="text-slate-500 text-sm font-medium">Elija un cliente existente o cree uno nuevo</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setMostrarNuevoCliente(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-blue-200 text-[#08557f] rounded-lg hover:bg-blue-50 transition-all duration-200 group shadow-sm font-black text-sm active:scale-95"
                      >
                        <PlusCircle className="w-4 h-4" />
                        <span>Nuevo Cliente</span>
                      </button>
                    </div>
                  </div>

                  {mostrarNuevoCliente && (
                    <NuevoClienteModal 
                        onClose={() => setMostrarNuevoCliente(false)}
                        onClienteCreado={handleClienteCreado}
                    />
                  )}

                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-4 justify-between items-center">
                      <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                          type="text"
                          placeholder="Buscar por nombre o identificación..."
                          value={busquedaCliente}
                          onChange={(e) => setBusquedaCliente(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                      </div>
                      
                      <div className="flex items-center gap-2 w-full md:w-auto">
                        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200">
                          <Filter className="w-4 h-4 text-slate-400" />
                          <select 
                            value={filtroRiesgo}
                            onChange={(e) => setFiltroRiesgo(e.target.value as NivelRiesgo | 'TODOS')}
                            className="bg-transparent border-none text-sm font-medium text-slate-700 focus:ring-0 cursor-pointer outline-none"
                          >
                            <option value="TODOS">Todos los riesgos</option>
                            <option value="VERDE">Riesgo Bajo (Verde)</option>
                            <option value="AMARILLO">Riesgo Medio (Amarillo)</option>
                            <option value="ROJO">Riesgo Alto (Rojo)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-100">
                          <tr>
                            <th className="px-6 py-4 font-bold text-slate-700">Cliente</th>
                            <th className="px-6 py-4 font-bold text-slate-700">Identificación</th>
                            <th className="px-6 py-4 font-bold text-slate-700">Teléfono</th>
                            <th className="px-6 py-4 font-bold text-slate-700">Riesgo</th>
                            <th className="px-6 py-4 font-bold text-slate-700 text-right">Acción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {clientesFiltrados.length > 0 ? (
                            clientesFiltrados.map((cliente) => (
                              <tr 
                                key={cliente.id}
                                onClick={() => setForm(prev => ({ ...prev, clienteId: cliente.id }))}
                                className={`group cursor-pointer transition-colors hover:bg-slate-50 ${
                                  String(form.clienteId) === String(cliente.id) ? 'bg-blue-50/50' : ''
                                }`}
                              >
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-slate-600 text-xs font-bold ${getAvatarColor(cliente.id)}`}>
                                      {(cliente.nombres || ' ')[0]}{(cliente.apellidos || ' ')[0]}
                                    </div>
                                    <div>
                                      <p className="font-bold text-slate-900">{cliente.nombres} {cliente.apellidos}</p>
                                      <p className="text-xs text-slate-500">{cliente.correo}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 font-medium text-slate-600">
                                  {cliente.dni}
                                </td>
                                <td className="px-6 py-4 font-medium text-slate-600">
                                  {cliente.telefono}
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-bold ${
                                    cliente.nivelRiesgo === 'VERDE' ? 'bg-emerald-100 text-emerald-700' :
                                    cliente.nivelRiesgo === 'AMARILLO' ? 'bg-amber-100 text-amber-700' :
                                    'bg-rose-100 text-rose-700'
                                  }`}>
                                    {cliente.nivelRiesgo}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <div className={`inline-flex items-center justify-center w-6 h-6 rounded-full transition-all ${
                                    String(form.clienteId) === String(cliente.id) 
                                      ? 'bg-blue-600 text-white scale-100 shadow-lg shadow-blue-600/30' 
                                      : 'border-2 border-slate-200 text-transparent scale-90 group-hover:border-slate-300'
                                  }`}>
                                    <CheckCircle className="w-4 h-4" />
                                  </div>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                <div className="flex flex-col items-center gap-3">
                                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                                    <Search className="w-6 h-6 text-slate-400" />
                                  </div>
                                  <p className="font-medium">No se encontraron clientes</p>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                  <div className="flex items-center justify-between">
                     <div className="space-y-1">
                      <h2 className="text-xl font-bold text-slate-900">Configuración del Crédito</h2>
                      <p className="text-slate-500 text-sm font-medium">Defina los términos y condiciones</p>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-slate-400" />
                          Monto a Solicitar
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            inputMode="numeric"
                            name="montoTotal"
                            value={montoTotalInput}
                            onChange={handleMontoChange}
                            className="w-full pl-4 pr-12 py-3 rounded-xl border-slate-200 bg-slate-50 text-xl font-bold text-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all"
                            placeholder="1.000.000"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">COP</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-slate-400" />
                          Cuotas
                        </label>
                        <div className="relative">
                           <input
                            type="text"
                            inputMode="numeric"
                            name="duracionMeses"
                            value={cuotasInput}
                            onChange={handleCuotasChange}
                            className="w-full pl-4 pr-4 py-3 rounded-xl border-slate-200 bg-slate-50 text-xl font-bold text-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all"
                            placeholder="6"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Tipo de Interés</label>
                        <div className="relative">
                          <select
                            name="tipoInteres"
                            value={form.tipoInteres}
                            onChange={handleInputChange}
                            className="w-full pl-4 pr-10 py-2.5 rounded-xl border-slate-200 bg-white font-medium text-slate-900 focus:ring-2 focus:ring-slate-900/10 appearance-none cursor-pointer"
                          >
                            <option value="AMORTIZABLE">Amortizable</option>
                            <option value="SIMPLE">Interés Simple</option>
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Frecuencia de Pago</label>
                        <div className="relative">
                          <select
                            name="frecuenciaPago"
                            value={form.frecuenciaPago}
                            onChange={handleInputChange}
                            className="w-full pl-4 pr-10 py-2.5 rounded-xl border-slate-200 bg-white font-medium text-slate-900 focus:ring-2 focus:ring-slate-900/10 appearance-none cursor-pointer"
                          >
                            <option value="DIARIO">Diario</option>
                            <option value="SEMANAL">Semanal</option>
                            <option value="QUINCENAL">Quincenal</option>
                            <option value="MENSUAL">Mensual</option>
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Tasa Interés Mensual</label>
                        <div className="relative">
                          <input
                            type="number"
                            name="tasaInteres"
                            value={form.tasaInteres}
                            onChange={handleInputChange}
                            step="0.1"
                            className="w-full pl-4 pr-8 py-2.5 rounded-xl border-slate-200 bg-white font-medium text-slate-900 focus:ring-2 focus:ring-slate-900/10"
                          />
                          <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Fecha del Crédito</label>
                        <input
                          type="date"
                          name="fechaInicio"
                          value={form.fechaInicio}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2.5 rounded-xl border-slate-200 bg-white font-medium text-slate-900 focus:ring-2 focus:ring-slate-900/10"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                  <div className="space-y-1">
                    <h2 className="text-xl font-bold text-slate-900">Documentación y Resumen</h2>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                     <div className="space-y-6">
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                           <h3 className="font-bold text-slate-900 mb-4">Resumen Financiero</h3>
                           <div className="space-y-3">
                              <div className="flex justify-between">
                                 <span className="text-slate-500">Monto Financiado</span>
                                 <span className="font-bold">{formatCurrency(resumenPrestamo.totalFinanciado)}</span>
                              </div>
                              <div className="flex justify-between">
                                 <span className="text-slate-500">Total Intereses</span>
                                 <span className="font-bold text-emerald-600">+{formatCurrency(resumenPrestamo.totalInteres)}</span>
                              </div>
                              <div className="h-px bg-slate-100" />
                              <div className="flex justify-between text-lg">
                                 <span className="font-bold">Total a Pagar</span>
                                 <span className="font-bold text-blue-600">{formatCurrency(resumenPrestamo.totalPagar)}</span>
                              </div>
                              <div className="bg-blue-50 p-4 rounded-xl mt-4">
                                 <div className="flex justify-between items-center">
                                    <span className="text-blue-700 font-bold">Cuota {form.frecuenciaPago.toLowerCase()}</span>
                                    <span className="text-2xl font-black text-blue-900">{formatCurrency(resumenPrestamo.valorCuota)}</span>
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>

                     <div className="space-y-6">
                        <label className="text-sm font-bold text-slate-700">Observaciones</label>
                        <textarea
                          name="observaciones"
                          value={form.observaciones}
                          onChange={handleInputChange}
                          rows={4}
                          className="w-full p-4 rounded-xl border-slate-200 bg-white font-medium text-slate-900 focus:ring-2 focus:ring-slate-900/10 resize-none"
                          placeholder="Detalles adicionales..."
                        />
                     </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-6 border-t border-slate-200">
                <button
                  onClick={anteriorStep}
                  disabled={step === 1}
                  className={`px-6 py-2.5 rounded-xl font-black transition-all border bg-white ${step === 1
                      ? 'text-slate-300 border-slate-100 cursor-not-allowed'
                      : 'text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                >
                  Anterior
                </button>
                
                {step < 3 ? (
                  <button
                    onClick={siguienteStep}
                    disabled={!form.clienteId}
                    className="flex items-center gap-2 px-8 py-2.5 bg-white border border-slate-200 text-slate-800 rounded-xl font-black hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                  >
                    Siguiente
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleCrearPrestamo}
                    disabled={creandoPrestamo}
                    className="flex items-center gap-2 px-8 py-2.5 bg-white border border-blue-200 text-[#08557f] rounded-xl font-black hover:bg-blue-50 disabled:opacity-50 transition-all shadow-sm shadow-blue-100"
                  >
                    {creandoPrestamo ? 'Procesando...' : 'Crear Préstamo'}
                    {!creandoPrestamo && <CheckCircle className="w-4 h-4" />}
                  </button>
                )}
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreacionPrestamoElegante;
