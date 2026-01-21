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

      // TODO: Reemplazar con llamada real a tu API
      // const response = await fetch('/api/prestamos', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${localStorage.getItem('token')}`
      //   },
      //   body: JSON.stringify(datosPrestamo)
      // });

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
      'bg-gradient-to-br from-primary/5 to-primary/10',
      'bg-gradient-to-br from-secondary/5 to-secondary/10',
      'bg-gradient-to-br from-gray-100 to-gray-200'
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
    <div className="min-h-screen bg-white p-4 md:p-6 lg:p-8">
      {/* Header Ultra Minimalista */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-10">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform duration-200" />
            <span className="text-sm font-medium">Volver</span>
          </button>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-4">
              {[1, 2, 3].map((num) => (
                <div key={num} className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300 ${step >= num
                      ? 'bg-primary text-white'
                      : 'border border-gray-300 text-gray-400'
                    }`}>
                    {step > num ? '✓' : num}
                  </div>
                  {num < 3 && (
                    <div className={`w-8 h-px transition-colors duration-300 ${step > num ? 'bg-primary' : 'bg-gray-200'
                      }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="text-xs font-medium text-gray-500 px-3 py-1.5 border border-gray-200 rounded-full">
              Paso {step} de 3
            </div>
          </div>
        </div>

        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-primary" />
            </div>
            <h1 className="text-2xl md:text-3xl font-light text-gray-900">
              Nuevo Préstamo
            </h1>
          </div>
          <p className="text-gray-500 text-sm pl-11">Gestión elegante de financiamiento personalizado</p>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Panel Principal */}
          <div className="lg:col-span-2">
            <div className={`space-y-8 transition-opacity duration-300 ${animating ? 'opacity-70' : 'opacity-100'}`}>

              {/* Paso 1: Selección de Cliente */}
              {step === 1 && (
                <div className="space-y-8">
                  <div className="flex items-center justify-between mb-8">
                    <div className="space-y-1">
                      <h2 className="text-xl font-light text-gray-900">Seleccionar Cliente</h2>
                      <p className="text-gray-500 text-sm">Elija un cliente existente o cree uno nuevo</p>
                    </div>
                    <button
                      onClick={() => setMostrarNuevoCliente(true)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 group"
                    >
                      <PlusCircle className="w-4 h-4 text-gray-500 group-hover:text-primary transition-colors" />
                      <span className="text-sm font-medium">Nuevo Cliente</span>
                    </button>
                  </div>

                  {/* Modal Nuevo Cliente */}
                  {mostrarNuevoCliente && (
                    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4">
                      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-in fade-in duration-300">
                        <div className="p-8">
                          <div className="flex items-center justify-between mb-8">
                            <div>
                              <h3 className="text-xl font-light text-gray-900">Nuevo Cliente</h3>
                              <p className="text-gray-500 text-sm mt-1">Complete la información del cliente</p>
                            </div>
                            <button
                              onClick={() => setMostrarNuevoCliente(false)}
                              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              ×
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {['nombre', 'apellido', 'identificacion', 'telefono', 'ingresosMensuales', 'antiguedadLaboral'].map((field) => (
                              <div key={field} className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 capitalize">
                                  {field.replace(/([A-Z])/g, ' $1').replace('mensuales', 'Mensuales')}
                                </label>
                                <input
                                  type={field.includes('ingresos') || field.includes('antiguedad') ? 'number' : 'text'}
                                  name={field}
                                  value={nuevoCliente[field as keyof typeof nuevoCliente]}
                                  onChange={handleNuevoClienteChange}
                                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary/10 transition-all"
                                  placeholder={`Ingrese ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`}
                                />
                              </div>
                            ))}
                            <div className="md:col-span-2">
                              <label className="text-sm font-medium text-gray-700 mb-2">
                                Dirección
                              </label>
                              <input
                                type="text"
                                name="direccion"
                                value={nuevoCliente.direccion}
                                onChange={handleNuevoClienteChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary/10 transition-all"
                                placeholder="Ingrese dirección completa"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end gap-3 mt-8 pt-8 border-t border-gray-100">
                            <button
                              onClick={() => setMostrarNuevoCliente(false)}
                              className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:border-gray-400 transition-colors"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={agregarCliente}
                              disabled={!nuevoCliente.nombre || !nuevoCliente.identificacion}
                              className="px-6 py-2.5 bg-[#08557f] text-white rounded-lg hover:bg-[#064364] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Crear Cliente
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Grid de Clientes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {clientes.map(cliente => (
                      <div
                        key={cliente.id}
                        onClick={() => setForm(prev => ({ ...prev, clienteId: cliente.id }))}
                        className={`group p-6 rounded-xl border transition-all duration-300 cursor-pointer ${form.clienteId === cliente.id
                            ? 'border-primary bg-gradient-to-br from-primary/5 to-white shadow-sm'
                            : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                          }`}
                      >
                        <div className="flex items-start justify-between mb-6">
                          <div className="flex items-center gap-4">
                            <div className={`w-14 h-14 rounded-lg ${getAvatarColor(cliente.id)} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                              <span className="text-gray-900 font-medium text-lg">
                                {cliente.nombre.charAt(0)}{cliente.apellido.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <h3 className="font-medium text-gray-900 group-hover:text-primary transition-colors">
                                {cliente.nombre} {cliente.apellido}
                              </h3>
                              <p className="text-sm text-gray-500">{cliente.identificacion}</p>
                            </div>
                          </div>
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${form.clienteId === cliente.id
                              ? 'border-primary bg-primary text-white'
                              : 'border-gray-300 group-hover:border-gray-400'
                            }`}>
                            {form.clienteId === cliente.id && <CheckCircle className="w-3.5 h-3.5" />}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Disponible</p>
                            <p className="font-medium text-gray-900">{formatCurrency(cliente.saldoDisponible)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500 mb-1">Score</p>
                            <div className="flex items-center justify-end gap-1">
                              <Shield className={`w-3 h-3 ${cliente.scoreCrediticio >= 80 ? 'text-primary' :
                                  cliente.scoreCrediticio >= 60 ? 'text-secondary' : 'text-red-500'
                                }`} />
                              <span className="font-medium text-gray-900">{cliente.scoreCrediticio}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Paso 2: Configuración del Préstamo */}
              {step === 2 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center justify-between mb-8">
                    <div className="space-y-1">
                      <h2 className="text-xl font-light text-gray-900">Configurar Préstamo</h2>
                      <p className="text-gray-500 text-sm">Defina los términos y condiciones del crédito</p>
                    </div>
                  </div>

                  <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm space-y-8">
                    {/* Monto y Plazo */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-gray-400" />
                          Monto Solicitado
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            name="montoTotal"
                            value={form.montoTotal}
                            onChange={handleMontoChange}
                            className="w-full px-4 py-4 text-2xl font-light text-gray-900 border border-gray-200 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary/10 transition-all text-right"
                          />
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-light text-xl">
                            COP
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-400" />
                          Plazo (Meses)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            name="plazoMeses"
                            min="1"
                            value={form.plazoMeses}
                            onChange={handleInputChange}
                            className="w-full px-4 py-4 text-2xl font-light text-gray-900 border border-gray-200 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary/10 transition-all text-right"
                          />
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-light text-xl">
                            Meses
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Frecuencia y Tasas */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Frecuencia de Pago</label>
                        <div className="relative">
                          <select
                            name="frecuenciaPago"
                            value={form.frecuenciaPago}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl appearance-none focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary/10 transition-all"
                          >
                            <option value="DIARIO">Diario</option>
                            <option value="SEMANAL">Semanal</option>
                            <option value="QUINCENAL">Quincenal</option>
                            <option value="MENSUAL">Mensual</option>
                          </select>
                          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Tasa de Interés (%)</label>
                        <div className="relative">
                          <input
                            type="number"
                            name="tasaInteres"
                            step="0.1"
                            value={form.tasaInteres}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary/10 transition-all"
                          />
                          <Percent className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Cuota Inicial</label>
                        <div className="relative">
                          <input
                            type="number"
                            name="cuotaInicial"
                            value={form.cuotaInicial}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary/10 transition-all"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400">COP</span>
                        </div>
                      </div>
                    </div>

                    {/* Otros Cargos */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-100">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Propósito</label>
                        <select
                          name="proposito"
                          value={form.proposito}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl appearance-none focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary/10 transition-all"
                        >
                          <option value="PERSONAL">Personal</option>
                          <option value="VEHICULO">Vehículo</option>
                          <option value="HIPOTECARIO">Hipotecario</option>
                          <option value="NEGOCIO">Negocio</option>
                          <option value="OTRO">Otro</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Observaciones</label>
                        <textarea
                          name="observaciones"
                          value={form.observaciones}
                          onChange={handleInputChange}
                          rows={1}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary/10 transition-all resize-none"
                          placeholder="Notas adicionales..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Paso 3: Documentos y Garantías */}
              {step === 3 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center justify-between mb-8">
                    <div className="space-y-1">
                      <h2 className="text-xl font-light text-gray-900">Documentos y Garantías</h2>
                      <p className="text-gray-500 text-sm">Adjunte fotos y videos de la propiedad o garantías del préstamo</p>
                    </div>
                  </div>

                  <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm space-y-8">
                    <div className="space-y-6">
                      <div>
                        <FileUploader
                          files={fotosPropiedad}
                          onFilesChange={setFotosPropiedad}
                          label="Fotos de la Propiedad / Garantía"
                          description="Soporta JPG, PNG (Máx. 5MB)"
                          multiple={true}
                          maxSize={5 * 1024 * 1024}
                          accept="image/*"
                        />
                      </div>

                      <div className="pt-6 border-t border-gray-100">
                        <FileUploader
                          files={videosPropiedad}
                          onFilesChange={setVideosPropiedad}
                          label="Videos de la Propiedad"
                          description="Soporta MP4, WEBM (Máx. 50MB)"
                          multiple={true}
                          maxSize={50 * 1024 * 1024}
                          accept="video/*"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Paso 4: Confirmación */}
              {step === 4 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center justify-between mb-8">
                    <div className="space-y-1">
                      <h2 className="text-xl font-light text-gray-900">Confirmar Préstamo</h2>
                      <p className="text-gray-500 text-sm">Revise los detalles antes de crear el préstamo</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="p-8 border-b border-gray-100 bg-gray-50/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Monto a Financiar</p>
                          <p className="text-3xl font-light text-gray-900">{formatCurrency(resumenPrestamo.totalFinanciado)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500 mb-1">Cuota Estimada</p>
                          <p className="text-2xl font-medium text-primary">{formatCurrency(resumenPrestamo.valorCuota)}</p>
                          <p className="text-xs text-gray-400 capitalize">{form.frecuenciaPago.toLowerCase()}</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-4">Detalles del Cliente</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Nombre</span>
                            <span className="text-gray-900">{clienteSeleccionado?.nombre} {clienteSeleccionado?.apellido}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Identificación</span>
                            <span className="text-gray-900">{clienteSeleccionado?.identificacion}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Score</span>
                            <span className={`font-medium ${(clienteSeleccionado?.scoreCrediticio || 0) >= 80 ? 'text-primary' : 'text-secondary'
                              }`}>{clienteSeleccionado?.scoreCrediticio}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-4">Condiciones Financieras</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Tasa Interés</span>
                            <span className="text-gray-900">{form.tasaInteres}% Mensual</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Plazo</span>
                            <span className="text-gray-900">{form.plazoMeses} Meses</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Total Intereses</span>
                            <span className="text-gray-900">{formatCurrency(resumenPrestamo.totalInteres)}</span>
                          </div>
                          <div className="flex justify-between pt-3 border-t border-gray-100">
                            <span className="font-medium text-gray-900">Total a Pagar</span>
                            <span className="font-medium text-gray-900">{formatCurrency(resumenPrestamo.totalPagar)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Navegación */}
              <div className="flex items-center justify-between pt-8">
                <button
                  onClick={anteriorStep}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-colors ${step > 1
                      ? 'text-gray-600 hover:bg-gray-100'
                      : 'text-gray-300 cursor-not-allowed'
                    }`}
                  disabled={step === 1} 
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="font-medium">Anterior</span>
                </button>

                <button
                  onClick={step === 4 ? handleCrearPrestamo : siguienteStep}
                  disabled={!form.clienteId}
                  className={`flex items-center gap-2 px-8 py-3 rounded-xl font-medium transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 ${form.clienteId
                      ? 'bg-primary text-white hover:bg-primary-dark'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                    }`}
                >
                  <span>{step === 4 ? 'Crear Préstamo' : 'Continuar'}</span>
                  {step < 4 && <ChevronRight className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Panel Lateral - Resumen en Tiempo Real */}
          <div className="hidden lg:block">
            <div className="sticky top-8 space-y-6">
              <div className="bg-gray-900 text-white rounded-2xl p-6 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-white/10 transition-colors duration-500" />

                <div className="relative">
                  <h3 className="text-lg font-light text-white/90 mb-6 flex items-center gap-2">
                    <BarChart className="w-5 h-5 text-secondary" />
                    Proyección
                  </h3>

                  <div className="space-y-6">
                    <div>
                      <p className="text-sm text-white/60 mb-1">Cuota Estimada</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-medium text-white">
                          {formatCurrency(resumenPrestamo.valorCuota)}
                        </span>
                        <span className="text-xs text-white/60 capitalize">
                          / {form.frecuenciaPago.toLowerCase()}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/10">
                      <div>
                        <p className="text-xs text-white/60 mb-1">Capital</p>
                        <p className="text-sm font-medium">{formatCurrency(resumenPrestamo.totalFinanciado)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-white/60 mb-1">Interés Total</p>
                        <p className="text-sm font-medium text-secondary">
                          {formatCurrency(resumenPrestamo.totalInteres)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabla de Amortización Preview */}
              {step >= 2 && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                    <h3 className="font-medium text-gray-900 text-sm">Plan de Pagos (Primeras 6)</h3>
                    <FileText className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-gray-500 uppercase bg-gray-50/50">
                        <tr>
                          <th className="px-4 py-3 font-medium">#</th>
                          <th className="px-4 py-3 font-medium">Fecha</th>
                          <th className="px-4 py-3 font-medium text-right">Cuota</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {cuotas.map((cuota) => (
                          <tr key={cuota.numero} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-4 py-2.5 text-gray-600">{cuota.numero}</td>
                            <td className="px-4 py-2.5 text-gray-600">{cuota.fecha}</td>
                            <td className="px-4 py-2.5 text-right font-medium text-gray-900">
                              {formatCurrency(cuota.total)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="p-3 text-center border-t border-gray-100">
                    <button className="text-xs text-primary hover:text-primary-dark font-medium transition-colors">
                      Ver Tabla Completa
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreacionPrestamoElegante;
