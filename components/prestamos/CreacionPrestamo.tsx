'use client';

import React, { useState, useMemo } from 'react';
import {
  DollarSign, Percent, Clock,
  FileText,
  BarChart, Shield, CheckCircle, ArrowLeft,
  PlusCircle,
  ChevronRight, ChevronDown
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';
import { FileUploader } from '@/components/ui/FileUploader';

// Enums alineados con Prisma
type FrecuenciaPago = 'DIARIO' | 'SEMANAL' | 'QUINCENAL' | 'MENSUAL';
type NivelRiesgo = 'VERDE' | 'AMARILLO' | 'ROJO' | 'LISTA_NEGRA';

// Interfaces alineadas con Prisma (Simuladas para Frontend)
interface Cliente {
  id: string;
  nombre: string;
  apellido: string;
  identificacion: string; // DNI/Cédula
  telefono: string;
  email: string;
  nivelRiesgo: NivelRiesgo;
  // Campos adicionales para UI
  scoreCrediticio: number; // 0-100 (derivado o almacenado)
  limiteCredito: number;
  saldoDisponible: number;
  ingresosMensuales: number;
  antiguedadLaboral: number;
  direccion: string;
  createdAt: string;
}

interface FormularioPrestamo {
  clienteId: string;
  montoTotal: number; // monto
  proposito: string; // tipoPrestamo (mapeado o libre)
  tasaInteres: number; // tasaInteres
  plazoMeses: number; // plazoMeses
  frecuenciaPago: FrecuenciaPago; // frecuenciaPago
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
  if (!form.clienteId) {
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

  // Lógica de Negocio: Monto a Financiar
  // Monto Solicitado - Cuota Inicial + Comisión (si se financia)
  // Aquí asumimos: (Monto - CuotaInicial) + (Monto * Comision%)
  const montoNeto = form.montoTotal - form.cuotaInicial;
  const comisionTotal = (form.montoTotal * form.comision) / 100;

  // Decisión de negocio: ¿La comisión se descuenta del desembolso o se suma a la deuda?
  // Asumiremos que se suma a la deuda para financiarla.
  const montoFinanciado = montoNeto + comisionTotal;

  const tasaMensual = form.tasaInteres / 100;

  const cuotasCalculadas: CuotaCalculada[] = [];
  let saldo = montoFinanciado;

  // Factores para convertir tasa mensual a tasa del periodo
  // Y calcular número de cuotas basado en meses
  const factorFrecuencia = {
    DIARIO: 30,
    SEMANAL: 4.33,
    QUINCENAL: 2,
    MENSUAL: 1
  };

  // Cuotas totales = Meses * Frecuencia por mes
  const cuotasTotales = Math.ceil(form.plazoMeses * factorFrecuencia[form.frecuenciaPago]);

  // Tasa del periodo = Tasa Mensual / Frecuencia por mes
  const tasaPeriodo = tasaMensual / factorFrecuencia[form.frecuenciaPago];

  // Fórmula de Amortización Francesa (Cuota Fija)
  // P = L * [c * (1 + c)^n] / [(1 + c)^n - 1]
  // P: Cuota, L: Monto, c: Tasa Periodo, n: Cuotas Totales
  let cuotaFija = 0;
  if (tasaPeriodo > 0) {
    cuotaFija = (montoFinanciado * tasaPeriodo) / (1 - Math.pow(1 + tasaPeriodo, -cuotasTotales));
  } else {
    cuotaFija = montoFinanciado / cuotasTotales;
  }

  const fechaPago = new Date(form.fechaInicio);

  for (let i = 1; i <= cuotasTotales; i++) {
    const interes = saldo * tasaPeriodo;
    const capital = cuotaFija - interes;

    // Ajuste final para no dejar saldo negativo infinitesimal
    let capitalFinal = capital;
    if (i === cuotasTotales) {
      capitalFinal = saldo;
      // Recalcular cuota final si es necesario (o ajustar en la última)
    }

    saldo -= capitalFinal;

    // Incrementar fecha según frecuencia
    if (form.frecuenciaPago === 'DIARIO') {
      fechaPago.setDate(fechaPago.getDate() + 1);
    } else if (form.frecuenciaPago === 'SEMANAL') {
      fechaPago.setDate(fechaPago.getDate() + 7);
    } else if (form.frecuenciaPago === 'QUINCENAL') {
      fechaPago.setDate(fechaPago.getDate() + 15);
    } else { // MENSUAL
      fechaPago.setMonth(fechaPago.getMonth() + 1);
    }

    cuotasCalculadas.push({
      numero: i,
      fecha: fechaPago.toLocaleDateString('es-CO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }),
      capital: Number(capitalFinal.toFixed(2)),
      interes: Number(interes.toFixed(2)),
      total: Number((capitalFinal + interes).toFixed(2)),
      saldo: Number(Math.max(0, saldo).toFixed(2))
    });
  }

  const totalInteres = cuotasCalculadas.reduce(
    (sum, c) => sum + c.interes,
    0
  );
  const totalPagar = montoFinanciado + totalInteres;

  // TEA (Tasa Efectiva Anual) = (1 + i_mensual)^12 - 1
  const tea = Math.pow(1 + tasaMensual, 12) - 1;

  // TAE del crédito específico (Tasa Anual Equivalente aprox)
  const tae = Math.pow(1 + tasaPeriodo, cuotasTotales) - 1; // Esto es tasa efectiva del periodo total, no TAE estandar, pero sirve de ref.

  return {
    cuotas: cuotasCalculadas.slice(0, 6), // Preview primeras 6
    resumenPrestamo: {
      totalFinanciado: montoFinanciado,
      totalInteres: Number(totalInteres.toFixed(2)),
      totalPagar: Number(totalPagar.toFixed(2)),
      valorCuota: Number(cuotaFija.toFixed(2)),
      costoTotalCredito: Number(
        (totalInteres + form.gastosAdministrativos + comisionTotal).toFixed(2)
      ),
      tea: Number((tea * 100).toFixed(2)),
      tae: Number((tae * 100).toFixed(2)),
      comisionTotal: Number(comisionTotal.toFixed(2))
    }
  };
};

const CreacionPrestamoElegante = () => {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [mostrarNuevoCliente, setMostrarNuevoCliente] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [creandoPrestamo, setCreandoPrestamo] = useState(false);

  // Estado para archivos
  const [fotosPropiedad, setFotosPropiedad] = useState<File[]>([]);
  const [videosPropiedad, setVideosPropiedad] = useState<File[]>([]);

  // Estados para nuevo cliente
  const [nuevoCliente, setNuevoCliente] = useState({
    nombre: '',
    apellido: '',
    identificacion: '',
    telefono: '',
    email: '',
    ingresosMensuales: 0,
    antiguedadLaboral: 0,
    direccion: ''
  });

  // Clientes simulados (Reemplazar con fetch real)
  const [clientes, setClientes] = useState<Cliente[]>([
    {
      id: 'CL-001',
      nombre: 'Carlos',
      apellido: 'Rodríguez',
      identificacion: '12.345.678',
      telefono: '300-1234567',
      email: 'carlos@email.com',
      nivelRiesgo: 'VERDE',
      scoreCrediticio: 78,
      limiteCredito: 15000000,
      saldoDisponible: 5200000,
      ingresosMensuales: 3500000,
      antiguedadLaboral: 24,
      direccion: 'Cra 15 #123-45, Bogotá',
      createdAt: '2022-03-15'
    },
    {
      id: 'CL-002',
      nombre: 'Ana',
      apellido: 'Gómez',
      identificacion: '23.456.789',
      telefono: '310-9876543',
      email: 'ana@email.com',
      nivelRiesgo: 'VERDE',
      scoreCrediticio: 92,
      limiteCredito: 20000000,
      saldoDisponible: 8500000,
      ingresosMensuales: 4200000,
      antiguedadLaboral: 36,
      direccion: 'Cll 85 #11-22, Medellín',
      createdAt: '2021-11-22'
    },
    {
      id: 'CL-003',
      nombre: 'Roberto',
      apellido: 'Sánchez',
      identificacion: '34.567.890',
      telefono: '320-5556666',
      email: 'roberto@email.com',
      nivelRiesgo: 'AMARILLO',
      scoreCrediticio: 65,
      limiteCredito: 10000000,
      saldoDisponible: 3200000,
      ingresosMensuales: 2800000,
      antiguedadLaboral: 18,
      direccion: 'Av 6N #23-45, Cali',
      createdAt: '2023-01-10'
    }
  ]);

  // Formulario principal
  const [form, setForm] = useState<FormularioPrestamo>({
    clienteId: '',
    montoTotal: 1000000,
    proposito: 'PERSONAL',
    tasaInteres: 5.0, // Tasa mensual ejemplo
    plazoMeses: 6,
    frecuenciaPago: 'QUINCENAL',
    fechaInicio: new Date().toISOString().split('T')[0],
    tasaInteresMora: 2.0,
    cuotaInicial: 0,
    gastosAdministrativos: 10000,
    comision: 1.0,
    observaciones: ''
  });

  const { cuotas, resumenPrestamo } = useMemo(
    () => calcularCuotasYResumen(form),
    [form]
  );

  const clienteSeleccionado = clientes.find(c => c.id === form.clienteId);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: name.includes('tasa') || name.includes('gastos') || name.includes('comision')
        ? parseFloat(value) || 0
        : name === 'montoTotal' || name === 'cuotaInicial' || name === 'ingresosMensuales'
          ? parseFloat(value) || 0
          : name === 'plazoMeses' || name === 'antiguedadLaboral'
            ? parseInt(value) || 0
            : value
    }));
  };

  const handleNuevoClienteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNuevoCliente(prev => ({
      ...prev,
      [name]: name === 'ingresosMensuales' || name === 'antiguedadLaboral'
        ? parseFloat(value) || 0
        : value
    }));
  };

  const handleCrearPrestamo = async () => {
    if (!clienteSeleccionado) {
      alert('Por favor, seleccione un cliente.');
      return;
    }

    // Validar que el monto no exceda el límite del cliente
    if (form.montoTotal > (clienteSeleccionado?.saldoDisponible || 0)) {
      alert('El monto solicitado excede el límite disponible del cliente.');
      return;
    }

    setCreandoPrestamo(true);

    try {
      // Preparar los datos para la API
      const datosPrestamo = {
        clienteId: form.clienteId,
        montoTotal: form.montoTotal,
        proposito: form.proposito,
        tasaInteres: form.tasaInteres,
        tasaInteresMora: form.tasaInteresMora,
        plazoMeses: form.plazoMeses,
        frecuenciaPago: form.frecuenciaPago,
        fechaInicio: form.fechaInicio,
        cuotaInicial: form.cuotaInicial,
        gastosAdministrativos: form.gastosAdministrativos,
        comision: form.comision,
        observaciones: form.observaciones,
      };

      console.log('Enviando datos del préstamo:', datosPrestamo);

      // Simular delay de API
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Simular respuesta exitosa
      const resultado = {
        id: 'PR-' + Date.now().toString().slice(-6),
        numeroPrestamo: 'PR-' + Math.floor(100000 + Math.random() * 900000),
        fechaCreacion: new Date().toISOString()
      };

      // Mostrar alerta de éxito
      alert(`✅ Préstamo creado exitosamente\n\n📋 Número: ${resultado.numeroPrestamo}\n👤 Cliente: ${clienteSeleccionado.nombre} ${clienteSeleccionado.apellido}\n💰 Monto: ${formatCurrency(form.montoTotal)}\n📅 Cuota: ${formatCurrency(resumenPrestamo.valorCuota)} ${form.frecuenciaPago.toLowerCase()}`);

      // Redirigir
      router.push('/admin/prestamos');

    } catch (error) {
      console.error('Error al crear el préstamo:', error);
      alert('❌ Error al crear el préstamo. Por favor, intente nuevamente.');
    } finally {
      setCreandoPrestamo(false);
    }
  };

  const agregarCliente = () => {
    const score = calcularScore(nuevoCliente.ingresosMensuales, nuevoCliente.antiguedadLaboral);
    const limite = calcularLimiteCredito(score, nuevoCliente.ingresosMensuales);

    const nuevoClienteCompleto: Cliente = {
      id: `CL-${(clientes.length + 1).toString().padStart(3, '0')}`,
      nombre: nuevoCliente.nombre,
      apellido: nuevoCliente.apellido,
      identificacion: nuevoCliente.identificacion,
      telefono: nuevoCliente.telefono,
      email: nuevoCliente.email,
      nivelRiesgo: score >= 70 ? 'VERDE' : score >= 50 ? 'AMARILLO' : 'ROJO',
      scoreCrediticio: score,
      limiteCredito: limite,
      saldoDisponible: limite,
      ingresosMensuales: nuevoCliente.ingresosMensuales,
      antiguedadLaboral: nuevoCliente.antiguedadLaboral,
      direccion: nuevoCliente.direccion,
      createdAt: new Date().toISOString().split('T')[0]
    };

    setClientes(prev => [...prev, nuevoClienteCompleto]);
    setForm(prev => ({ ...prev, clienteId: nuevoClienteCompleto.id }));
    setNuevoCliente({
      nombre: '',
      apellido: '',
      identificacion: '',
      telefono: '',
      email: '',
      ingresosMensuales: 0,
      antiguedadLaboral: 0,
      direccion: ''
    });
    setMostrarNuevoCliente(false);
  };

  const calcularScore = (ingresos: number, antiguedad: number): number => {
    let score = 50;
    if (ingresos > 1200000) score += 20; // Ajustado a realidad COP
    if (ingresos > 600000) score += 10;
    if (antiguedad > 24) score += 20;
    if (antiguedad > 12) score += 10;
    return Math.min(score, 100);
  };

  const calcularLimiteCredito = (score: number, ingresos: number): number => {
    const base = ingresos * 6;
    const multiplicador = score >= 80 ? 1.5 : score >= 70 ? 1.2 : 1.0;
    return Math.round(base * multiplicador / 100) * 100;
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
    const colors = [
      'bg-slate-100',
      'bg-slate-200',
      'bg-slate-50'
    ];
    return colors[parseInt(id.split('-')[1] || '0') % 3];
  };

  // Función para manejar el cambio de monto SIN LÍMITES
  const handleMontoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    // Solo validamos que no sea negativo
    if (value >= 0) {
      setForm(prev => ({ ...prev, montoTotal: value }));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-8">
      {/* Header Ultra Minimalista */}
      <div className="mb-12 sticky top-0 z-30 backdrop-blur-xl bg-slate-50/80 -mx-8 px-8 py-4 border-b border-slate-200/60">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform duration-200" />
            <span className="text-sm font-bold">Volver</span>
          </button>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-4">
              {[1, 2, 3].map((num) => (
                <div key={num} className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${step >= num
                      ? 'bg-slate-900 text-white'
                      : 'border border-slate-300 text-slate-400'
                    }`}>
                    {step > num ? '✓' : num}
                  </div>
                  {num < 3 && (
                    <div className={`w-8 h-px transition-colors duration-300 ${step > num ? 'bg-slate-900' : 'bg-slate-200'
                      }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="text-xs font-bold text-slate-500 px-3 py-1.5 border border-slate-200 rounded-full">
              Paso {step} de 3
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
              Nuevo Préstamo
            </h1>
          </div>
          <p className="text-slate-500 text-sm pl-11 font-medium">Gestión de financiamiento personalizado</p>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="w-full max-w-[1600px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Panel Principal */}
          <div className="lg:col-span-2">
            <div className={`space-y-8 transition-opacity duration-300 ${animating ? 'opacity-70' : 'opacity-100'}`}>

              {/* Paso 1: Selección de Cliente */}
              {step === 1 && (
                <div className="space-y-8">
                  <div className="flex items-center justify-between mb-8">
                    <div className="space-y-1">
                      <h2 className="text-xl font-bold text-slate-900">Seleccionar Cliente</h2>
                      <p className="text-slate-500 text-sm font-medium">Elija un cliente existente o cree uno nuevo</p>
                    </div>
                    <button
                      onClick={() => setMostrarNuevoCliente(true)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg hover:border-slate-400 hover:bg-slate-50 transition-all duration-200 group shadow-sm font-bold text-sm"
                    >
                      <PlusCircle className="w-4 h-4 text-slate-500 group-hover:text-slate-900 transition-colors" />
                      <span>Nuevo Cliente</span>
                    </button>
                  </div>

                  {/* Modal Nuevo Cliente */}
                  {mostrarNuevoCliente && (
                    <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                      <div className="bg-white/90 backdrop-blur-md rounded-2xl w-full max-w-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] animate-in fade-in duration-300 border border-slate-100">
                        <div className="p-8">
                          <div className="flex items-center justify-between mb-8">
                            <div>
                              <h3 className="text-xl font-bold text-slate-900">Nuevo Cliente</h3>
                              <p className="text-slate-500 text-sm mt-1 font-medium">Complete la información del cliente</p>
                            </div>
                            <button
                              onClick={() => setMostrarNuevoCliente(false)}
                              className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                              ×
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {['nombre', 'apellido', 'identificacion', 'telefono', 'ingresosMensuales', 'antiguedadLaboral'].map((field) => (
                              <div key={field} className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 capitalize">
                                  {field.replace(/([A-Z])/g, ' $1').replace('mensuales', 'Mensuales')}
                                </label>
                                <input
                                  type={field.includes('ingresos') || field.includes('antiguedad') ? 'number' : 'text'}
                                  name={field}
                                  value={nuevoCliente[field as keyof typeof nuevoCliente]}
                                  onChange={handleNuevoClienteChange}
                                  className="w-full px-4 py-2.5 rounded-lg border-slate-200 bg-slate-50 focus:ring-2 focus:ring-slate-900/10 transition-all font-medium text-slate-900"
                                  placeholder={`Ingrese ${field}`}
                                />
                              </div>
                            ))}
                            <div className="col-span-full space-y-2">
                              <label className="text-sm font-bold text-slate-700">Dirección</label>
                              <input
                                type="text"
                                name="direccion"
                                value={nuevoCliente.direccion}
                                onChange={handleNuevoClienteChange}
                                className="w-full px-4 py-2.5 rounded-lg border-slate-200 bg-slate-50 focus:ring-2 focus:ring-slate-900/10 transition-all font-medium text-slate-900"
                                placeholder="Dirección completa"
                              />
                            </div>
                          </div>

                          <div className="mt-8 flex justify-end gap-3">
                            <button
                              onClick={() => setMostrarNuevoCliente(false)}
                              className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={agregarCliente}
                              className="px-6 py-2.5 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20"
                            >
                              Guardar Cliente
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Lista de Clientes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {clientes.map((cliente) => (
                      <div
                        key={cliente.id}
                        onClick={() => setForm(prev => ({ ...prev, clienteId: cliente.id }))}
                        className={`p-6 rounded-2xl border cursor-pointer transition-all duration-200 relative overflow-hidden group ${form.clienteId === cliente.id
                            ? 'border-slate-900 bg-slate-900/5 shadow-md ring-1 ring-slate-900/10'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
                          }`}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-slate-600 font-bold ${getAvatarColor(cliente.id)}`}>
                              {cliente.nombre[0]}{cliente.apellido[0]}
                            </div>
                            <div>
                              <h3 className="font-bold text-slate-900">{cliente.nombre} {cliente.apellido}</h3>
                              <p className="text-xs text-slate-500 font-medium">{cliente.identificacion}</p>
                            </div>
                          </div>
                          {form.clienteId === cliente.id && (
                            <div className="w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center animate-in zoom-in">
                              <CheckCircle className="w-4 h-4 text-white" />
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-y-2 text-sm">
                          <div>
                            <p className="text-xs text-slate-400 font-medium">Capacidad</p>
                            <p className="font-bold text-slate-700">{formatCurrency(cliente.saldoDisponible)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 font-medium">Riesgo</p>
                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${cliente.nivelRiesgo === 'VERDE' ? 'bg-emerald-100 text-emerald-700' :
                                cliente.nivelRiesgo === 'AMARILLO' ? 'bg-amber-100 text-amber-700' :
                                  'bg-rose-100 text-rose-700'
                              }`}>
                              {cliente.nivelRiesgo}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Paso 2: Configuración del Préstamo */}
              {step === 2 && (
                <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                  <div className="flex items-center justify-between">
                     <div className="space-y-1">
                      <h2 className="text-xl font-bold text-slate-900">Configuración del Crédito</h2>
                      <p className="text-slate-500 text-sm font-medium">Defina los términos y condiciones</p>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                    {/* Monto y Plazo */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-slate-400" />
                          Monto a Solicitar
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            name="montoTotal"
                            value={form.montoTotal}
                            onChange={handleMontoChange}
                            className="w-full pl-4 pr-12 py-3 rounded-xl border-slate-200 bg-slate-50 text-xl font-bold text-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">COP</span>
                        </div>
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-slate-500">Mínimo: $100.000</span>
                          <span className={form.montoTotal > (clienteSeleccionado?.saldoDisponible || 0) ? 'text-rose-500' : 'text-slate-500'}>
                            Máximo: {formatCurrency(clienteSeleccionado?.saldoDisponible || 0)}
                          </span>
                        </div>
                        <div className="mt-2 flex justify-end">
                          <button 
                            onClick={() => window.open('/admin/solicitudes', '_blank')}
                            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          >
                            ¿Fondos insuficientes? Solicitar dinero
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-slate-400" />
                          Plazo (Meses)
                        </label>
                        <div className="relative">
                           <input
                            type="range"
                            min="1"
                            max="36"
                            step="1"
                            name="plazoMeses"
                            value={form.plazoMeses}
                            onChange={handleInputChange}
                            className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-slate-900"
                          />
                          <div className="mt-2 flex justify-between items-center">
                            <span className="text-2xl font-bold text-slate-900">{form.plazoMeses}</span>
                            <span className="text-sm font-medium text-slate-500">meses</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="h-px bg-slate-100 my-6" />

                    {/* Frecuencia y Tasa */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                        <label className="text-sm font-bold text-slate-700">Fecha Inicio</label>
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

              {/* Paso 3: Documentación */}
              {step === 3 && (
                <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                  <div className="space-y-1">
                    <h2 className="text-xl font-bold text-slate-900">Documentación de Respaldo</h2>
                    <p className="text-slate-500 text-sm font-medium">Adjunte fotos y videos de la propiedad o garantías</p>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-3">
                      <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400" />
                        Fotos de la Propiedad / Garantía
                      </label>
                      <FileUploader
                        onFilesSelected={setFotosPropiedad}
                        maxFiles={5}
                        accept="image/*"
                        title="Arrastra las fotos aquí"
                        description="Soporta JPG, PNG (Máx 5MB)"
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400" />
                        Videos de Visita (Opcional)
                      </label>
                      <FileUploader
                        onFilesSelected={setVideosPropiedad}
                        maxFiles={2}
                        accept="video/*"
                        title="Arrastra los videos aquí"
                        description="Soporta MP4, MOV (Máx 50MB)"
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-bold text-slate-700">Observaciones</label>
                      <textarea
                        name="observaciones"
                        value={form.observaciones}
                        onChange={handleInputChange}
                        rows={4}
                        className="w-full p-4 rounded-xl border-slate-200 bg-white font-medium text-slate-900 focus:ring-2 focus:ring-slate-900/10 resize-none"
                        placeholder="Detalles adicionales sobre la garantía o el cliente..."
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Navegación */}
              <div className="flex items-center justify-between pt-6 border-t border-slate-200">
                <button
                  onClick={anteriorStep}
                  disabled={step === 1}
                  className={`px-6 py-2.5 rounded-xl font-bold transition-colors ${step === 1
                      ? 'text-slate-300 cursor-not-allowed'
                      : 'text-slate-600 hover:bg-slate-100'
                    }`}
                >
                  Anterior
                </button>
                
                {step < 3 ? (
                  <button
                    onClick={siguienteStep}
                    disabled={!form.clienteId}
                    className="flex items-center gap-2 px-8 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-slate-900/20"
                  >
                    Siguiente
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleCrearPrestamo}
                    disabled={creandoPrestamo}
                    className="flex items-center gap-2 px-8 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-lg shadow-emerald-600/20"
                  >
                    {creandoPrestamo ? 'Procesando...' : 'Crear Préstamo'}
                    {!creandoPrestamo && <CheckCircle className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Panel Lateral: Resumen en Tiempo Real */}
          <div className="lg:col-span-1">
            <div className="sticky top-32 space-y-6">
              <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl shadow-slate-900/20">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                  <BarChart className="w-5 h-5 text-slate-400" />
                  Simulación
                </h3>

                <div className="space-y-4">
                  <div className="flex justify-between items-end pb-4 border-b border-slate-700/50">
                    <span className="text-slate-400 text-sm font-medium">Cuota Estimada</span>
                    <div className="text-right">
                      <p className="text-3xl font-bold tracking-tight">{formatCurrency(resumenPrestamo.valorCuota)}</p>
                      <p className="text-xs text-slate-400 font-medium capitalize">{form.frecuenciaPago.toLowerCase()}</p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Total a Financiar</span>
                      <span className="font-medium">{formatCurrency(resumenPrestamo.totalFinanciado)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Intereses Totales</span>
                      <span className="font-medium text-emerald-400">+{formatCurrency(resumenPrestamo.totalInteres)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Total a Pagar</span>
                      <span className="font-bold">{formatCurrency(resumenPrestamo.totalPagar)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-emerald-400 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-emerald-400 uppercase tracking-wide mb-1">Análisis de Riesgo</p>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Cliente con capacidad de pago verificada. El monto solicitado representa el 
                        <span className="text-white font-bold"> {((form.montoTotal / (clienteSeleccionado?.ingresosMensuales || 1)) * 100).toFixed(1)}% </span> 
                        de sus ingresos mensuales.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview de Cuotas */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-100">
                  <h4 className="font-bold text-slate-900 text-sm">Plan de Pagos (Preview)</h4>
                </div>
                <div className="divide-y divide-slate-100">
                  {cuotas.map((cuota) => (
                    <div key={cuota.numero} className="p-3 flex justify-between items-center text-sm hover:bg-slate-50 transition-colors">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-700">Cuota {cuota.numero}</span>
                        <span className="text-xs text-slate-400 font-medium">{cuota.fecha}</span>
                      </div>
                      <span className="font-medium text-slate-900">{formatCurrency(cuota.total)}</span>
                    </div>
                  ))}
                  {form.plazoMeses > 0 && (
                     <div className="p-3 text-center text-xs text-slate-400 font-medium bg-slate-50">
                        ... y {Math.ceil(form.plazoMeses * (form.frecuenciaPago === 'DIARIO' ? 30 : form.frecuenciaPago === 'SEMANAL' ? 4.33 : form.frecuenciaPago === 'QUINCENAL' ? 2 : 1)) - 6} cuotas más
                     </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreacionPrestamoElegante;
