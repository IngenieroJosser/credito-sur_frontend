'use client';

import React, { useState, useEffect } from 'react';
import {
  Calculator, Calendar, DollarSign, Percent, Clock,
  UserPlus, Users, CreditCard, TrendingUp, FileText,
  BarChart, Shield, CheckCircle, ArrowLeft,
  Wallet, Banknote, Sparkles, PlusCircle,
  Edit2, Trash2, Eye, Download, Settings,
  ChevronRight, ChevronDown, ChevronUp
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Cliente {
  id: string;
  nombre: string;
  apellido: string;
  identificacion: string;
  telefono: string;
  email: string;
  scoreCrediticio: number;
  limiteCredito: number;
  saldoDisponible: number;
  ingresosMensuales: number;
  antiguedadLaboral: number;
  direccion: string;
  createdAt: string;
}

interface FormularioPrestamo {
  clienteId: string;
  montoTotal: number;
  proposito: string;
  tasaInteres: number;
  plazo: number;
  frecuenciaPago: 'semanal' | 'quincenal' | 'mensual';
  fechaInicio: string;
  tasaMora: number;
  cuotaInicial: number;
  gastosAdministrativos: number;
  comision: number;
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

const CreacionPrestamoElegante = () => {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [mostrarNuevoCliente, setMostrarNuevoCliente] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [formExpanded, setFormExpanded] = useState({
    basic: true,
    terms: false,
    details: false
  });

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

  // Clientes iniciales
  const [clientes, setClientes] = useState<Cliente[]>([
    {
      id: 'CL-001',
      nombre: 'Carlos',
      apellido: 'Rodríguez',
      identificacion: '12.345.678',
      telefono: '+1 234 567 8900',
      email: 'carlos@email.com',
      scoreCrediticio: 78,
      limiteCredito: 15000,
      saldoDisponible: 5200,
      ingresosMensuales: 3500,
      antiguedadLaboral: 24,
      direccion: 'Av. Principal 123',
      createdAt: '2022-03-15'
    },
    {
      id: 'CL-002',
      nombre: 'Ana',
      apellido: 'Gómez',
      identificacion: '23.456.789',
      telefono: '+1 345 678 9012',
      email: 'ana@email.com',
      scoreCrediticio: 92,
      limiteCredito: 20000,
      saldoDisponible: 8500,
      ingresosMensuales: 4200,
      antiguedadLaboral: 36,
      direccion: 'Calle Secundaria 456',
      createdAt: '2021-11-22'
    },
    {
      id: 'CL-003',
      nombre: 'Roberto',
      apellido: 'Sánchez',
      identificacion: '34.567.890',
      telefono: '+1 456 789 0123',
      email: 'roberto@email.com',
      scoreCrediticio: 65,
      limiteCredito: 10000,
      saldoDisponible: 3200,
      ingresosMensuales: 2800,
      antiguedadLaboral: 18,
      direccion: 'Boulevard 789',
      createdAt: '2023-01-10'
    }
  ]);

  // Formulario principal
  const [form, setForm] = useState<FormularioPrestamo>({
    clienteId: '',
    montoTotal: 5000,
    proposito: 'Capital de trabajo',
    tasaInteres: 1.5,
    plazo: 12,
    frecuenciaPago: 'mensual',
    fechaInicio: new Date().toISOString().split('T')[0],
    tasaMora: 5.0,
    cuotaInicial: 500,
    gastosAdministrativos: 50,
    comision: 2.5,
    observaciones: ''
  });

  // Cuotas calculadas
  const [cuotas, setCuotas] = useState<CuotaCalculada[]>([]);
  const [resumenPrestamo, setResumenPrestamo] = useState({
    totalFinanciado: 0,
    totalInteres: 0,
    totalPagar: 0,
    valorCuota: 0,
    costoTotalCredito: 0,
    tea: 0,
    tae: 0,
    comisionTotal: 0
  });

  const clienteSeleccionado = clientes.find(c => c.id === form.clienteId);

  // Calcular cuotas automáticamente
  useEffect(() => {
    if (form.clienteId) {
      calcularCuotas();
    }
  }, [form.montoTotal, form.tasaInteres, form.plazo, form.frecuenciaPago, form.cuotaInicial, form.comision]);

  const calcularCuotas = () => {
    const montoNeto = form.montoTotal - form.cuotaInicial;
    const comisionTotal = (form.montoTotal * form.comision) / 100;
    const montoFinanciado = montoNeto + comisionTotal;
    const tasaMensual = form.tasaInteres / 100;
    
    let cuotasCalculadas: CuotaCalculada[] = [];
    let saldo = montoFinanciado;

    const factorFrecuencia = {
      semanal: 4.33,
      quincenal: 2,
      mensual: 1
    };

    const cuotasTotales = form.plazo * factorFrecuencia[form.frecuenciaPago];
    const tasaPeriodo = tasaMensual / factorFrecuencia[form.frecuenciaPago];

    const cuotaFija = (montoFinanciado * tasaPeriodo) / (1 - Math.pow(1 + tasaPeriodo, -cuotasTotales));

    let fechaPago = new Date(form.fechaInicio);
    
    for (let i = 1; i <= cuotasTotales; i++) {
      const interes = saldo * tasaPeriodo;
      const capital = cuotaFija - interes;
      saldo -= capital;

      if (form.frecuenciaPago === 'semanal') {
        fechaPago.setDate(fechaPago.getDate() + 7);
      } else if (form.frecuenciaPago === 'quincenal') {
        fechaPago.setDate(fechaPago.getDate() + 15);
      } else {
        fechaPago.setMonth(fechaPago.getMonth() + 1);
      }

      cuotasCalculadas.push({
        numero: i,
        fecha: fechaPago.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }),
        capital: Number(capital.toFixed(2)),
        interes: Number(interes.toFixed(2)),
        total: Number(cuotaFija.toFixed(2)),
        saldo: Number(Math.max(0, saldo).toFixed(2))
      });
    }

    setCuotas(cuotasCalculadas.slice(0, 6));

    const totalInteres = cuotasCalculadas.reduce((sum, c) => sum + c.interes, 0);
    const totalPagar = montoFinanciado + totalInteres;
    const tea = Math.pow(1 + tasaMensual, 12) - 1;
    const tae = Math.pow(1 + tasaPeriodo, cuotasTotales) - 1;

    setResumenPrestamo({
      totalFinanciado: montoFinanciado,
      totalInteres: Number(totalInteres.toFixed(2)),
      totalPagar: Number(totalPagar.toFixed(2)),
      valorCuota: Number(cuotaFija.toFixed(2)),
      costoTotalCredito: Number((totalInteres + form.gastosAdministrativos + comisionTotal).toFixed(2)),
      tea: Number((tea * 100).toFixed(2)),
      tae: Number((tae * 100).toFixed(2)),
      comisionTotal: Number(comisionTotal.toFixed(2))
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: name.includes('tasa') || name.includes('gastos') || name.includes('comision') 
        ? parseFloat(value) || 0
        : name === 'montoTotal' || name === 'cuotaInicial' || name === 'ingresosMensuales'
        ? parseFloat(value) || 0
        : name === 'plazo' || name === 'antiguedadLaboral'
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
    if (ingresos > 3000) score += 20;
    if (ingresos > 2000) score += 10;
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
    if (step < 3 && form.clienteId) {
      setAnimating(true);
      setTimeout(() => {
        setStep((step + 1) as 1 | 2 | 3);
        setAnimating(false);
      }, 200);
    }
  };

  const anteriorStep = () => {
    if (step > 1) {
      setAnimating(true);
      setTimeout(() => {
        setStep((step - 1) as 1 | 2 | 3);
        setAnimating(false);
      }, 200);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatCurrencyDecimal = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-[#08557f]';
    if (score >= 70) return 'text-[#fb851b]';
    return 'text-red-500';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-[#08557f]';
    if (score >= 70) return 'bg-[#fb851b]';
    return 'bg-red-500';
  };

  const getAvatarColor = (id: string) => {
    const colors = [
      'bg-gradient-to-br from-[#08557f]/5 to-[#08557f]/10',
      'bg-gradient-to-br from-[#fb851b]/5 to-[#fb851b]/10',
      'bg-gradient-to-br from-gray-100 to-gray-200'
    ];
    return colors[parseInt(id.split('-')[1]) % 3];
  };

  const toggleFormSection = (section: keyof typeof formExpanded) => {
    setFormExpanded(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getPurposeIcon = (purpose: string) => {
    switch (purpose) {
      case 'Capital de trabajo': return '';
      case 'Inversión': return '';
      case 'Consolidación de deudas': return '';
      case 'Emergencia': return '';
      case 'Educación': return '';
      case 'Salud': return '';
      default: return '';
    }
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
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300 ${
                    step >= num 
                      ? 'bg-[#08557f] text-white'
                      : 'border border-gray-300 text-gray-400'
                  }`}>
                    {step > num ? '✓' : num}
                  </div>
                  {num < 3 && (
                    <div className={`w-8 h-px transition-colors duration-300 ${
                      step > num ? 'bg-[#08557f]' : 'bg-gray-200'
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
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#08557f]/10 to-[#08557f]/20 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-[#08557f]" />
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
                      <PlusCircle className="w-4 h-4 text-gray-500 group-hover:text-[#08557f] transition-colors" />
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
                                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-[#08557f] focus:ring-1 focus:ring-[#08557f]/10 transition-all"
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
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-[#08557f] focus:ring-1 focus:ring-[#08557f]/10 transition-all"
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
                              className="px-6 py-2.5 bg-[#08557f] text-white rounded-lg hover:bg-[#074970] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                        className={`group p-6 rounded-xl border transition-all duration-300 cursor-pointer ${
                          form.clienteId === cliente.id
                            ? 'border-[#08557f] bg-gradient-to-br from-[#08557f]/5 to-white shadow-sm'
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
                              <h3 className="font-medium text-gray-900 group-hover:text-[#08557f] transition-colors">
                                {cliente.nombre} {cliente.apellido}
                              </h3>
                              <p className="text-sm text-gray-500 mt-1">Identificación: {cliente.identificacion}</p>
                            </div>
                          </div>
                          
                          {form.clienteId === cliente.id && (
                            <div className="w-6 h-6 rounded-full bg-[#08557f] flex items-center justify-center">
                              <CheckCircle className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>

                        <div className="space-y-4">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium text-gray-500">Score Crediticio</span>
                              <span className={`text-sm font-medium ${getScoreColor(cliente.scoreCrediticio)}`}>
                                {cliente.scoreCrediticio}/100
                              </span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${getScoreBgColor(cliente.scoreCrediticio)}`}
                                style={{ width: `${cliente.scoreCrediticio}%` }}
                              ></div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 rounded-lg bg-white border border-gray-100">
                              <p className="text-xs text-gray-500 mb-1">Límite</p>
                              <p className="font-medium text-gray-900">{formatCurrency(cliente.limiteCredito)}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-white border border-gray-100">
                              <p className="text-xs text-gray-500 mb-1">Ingresos</p>
                              <p className="font-medium text-gray-900">{formatCurrency(cliente.ingresosMensuales)}</p>
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
                <div className="space-y-8">
                  <div className="mb-8">
                    <h2 className="text-xl font-light text-gray-900 mb-2">Configurar Préstamo</h2>
                    <p className="text-gray-500 text-sm">Personalice los términos del financiamiento</p>
                  </div>

                  <div className="space-y-6">
                    {/* Sección de Monto y Propósito */}
                    <div className="border-b border-gray-100 pb-6">
                      <div 
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => toggleFormSection('basic')}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#08557f]/10 to-[#08557f]/20 flex items-center justify-center">
                            <DollarSign className="w-4 h-4 text-[#08557f]" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">Monto y Propósito</h3>
                            <p className="text-sm text-gray-500">Configure el monto y destino del préstamo</p>
                          </div>
                        </div>
                        {formExpanded.basic ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>

                      {formExpanded.basic && (
                        <div className="mt-6 space-y-6 animate-in fade-in duration-300">
                          <div className="space-y-4">
                            <label className="text-sm font-medium text-gray-700">
                              Monto Solicitado
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-4">
                                <div className="relative">
                                  {/* Slider con rango dinámico basado en el monto actual */}
                                  <input
                                    type="range"
                                    name="montoTotal"
                                    value={form.montoTotal}
                                    onChange={handleInputChange}
                                    min="0"
                                    max={Math.max(100000, form.montoTotal * 1.5)} // Rango dinámico
                                    step="1000"
                                    className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#08557f]"
                                  />
                                  <div className="flex justify-between mt-8">
                                    <div className="text-center">
                                      <div className="text-xs text-gray-500 mb-1">Mínimo</div>
                                      <div className="font-medium">$0</div>
                                    </div>
                                    <div className="text-center">
                                      <div className="text-xs text-gray-500 mb-1">Monto actual</div>
                                      <div className="text-2xl font-light text-[#08557f]">
                                        {formatCurrency(form.montoTotal)}
                                      </div>
                                    </div>
                                    <div className="text-center">
                                      <div className="text-xs text-gray-500 mb-1">Rango dinámico</div>
                                      <div className="font-medium">${Math.max(100000, form.montoTotal * 1.5).toLocaleString('es-ES')}</div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* CAMPO DE ENTRADA LIBRE PARA EL MONTO */}
                              <div className="space-y-4">
                                <div>
                                  <label className="text-sm font-medium text-gray-700 block mb-2">
                                    Ingresar Monto Manualmente
                                  </label>
                                  <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                      <span className="text-gray-500 sm:text-sm">$</span>
                                    </div>
                                    <input
                                      type="number"
                                      value={form.montoTotal}
                                      onChange={handleMontoChange}
                                      min="0"
                                      step="1000"
                                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:border-[#08557f] focus:ring-1 focus:ring-[#08557f]/10 transition-all text-lg"
                                      placeholder="Ej: 15000"
                                    />
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                      <span className="text-gray-500 text-sm">COP</span>
                                    </div>
                                  </div>
                                  <div className="mt-2 text-xs text-gray-500">
                                    <p>Ingrese cualquier monto positivo sin límites</p>
                                    {clienteSeleccionado && form.montoTotal > clienteSeleccionado.limiteCredito && (
                                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                                        <p className="text-yellow-700 text-sm font-medium">
                                          Advertencia: El monto solicitado (${formatCurrency(form.montoTotal)}) 
                                          excede el límite de crédito del cliente (${formatCurrency(clienteSeleccionado.limiteCredito)})
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Botones de montos rápidos (sin restricciones) */}
                                <div>
                                  <label className="text-sm font-medium text-gray-700 block mb-2">
                                    Montos Sugeridos
                                  </label>
                                  <div className="grid grid-cols-3 gap-2">
                                    {[10000, 25000, 50000, 100000, 250000, 500000].map((monto) => (
                                      <button
                                        key={monto}
                                        type="button"
                                        onClick={() => {
                                          setForm(prev => ({ ...prev, montoTotal: monto }));
                                        }}
                                        className={`py-2 px-3 text-sm rounded-lg transition-all duration-300 ${
                                          form.montoTotal === monto
                                            ? 'bg-[#08557f] text-white shadow-sm'
                                            : 'border border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                                        }`}
                                      >
                                        {formatCurrency(monto)}
                                      </button>
                                    ))}
                                  </div>
                                  <div className="mt-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        // Opción para montos muy grandes
                                        const montoGrande = 1000000;
                                        setForm(prev => ({ ...prev, montoTotal: montoGrande }));
                                      }}
                                      className={`py-2 px-3 text-sm rounded-lg transition-all duration-300 w-full ${
                                        form.montoTotal === 1000000
                                          ? 'bg-[#fb851b] text-white shadow-sm'
                                          : 'border border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                                      }`}
                                    >
                                      {formatCurrency(1000000)} (1 Millón)
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <label className="text-sm font-medium text-gray-700">
                              Propósito del Préstamo
                            </label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                              {['Capital de trabajo', 'Inversión', 'Consolidación de deudas', 'Emergencia', 'Educación', 'Salud'].map((purpose) => (
                                <button
                                  key={purpose}
                                  type="button"
                                  onClick={() => setForm(prev => ({ ...prev, proposito: purpose }))}
                                  className={`p-4 rounded-xl border transition-all duration-300 flex flex-col items-center gap-2 ${
                                    form.proposito === purpose
                                      ? 'border-[#08557f] bg-gradient-to-br from-[#08557f]/5 to-white'
                                      : 'border-gray-200 hover:border-gray-300'
                                  }`}
                                >
                                  <span className="text-lg">{getPurposeIcon(purpose)}</span>
                                  <span className="text-sm text-gray-700">{purpose}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Sección de Términos */}
                    <div className="border-b border-gray-100 pb-6">
                      <div 
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => toggleFormSection('terms')}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#fb851b]/10 to-[#fb851b]/20 flex items-center justify-center">
                            <Clock className="w-4 h-4 text-[#fb851b]" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">Plazo y Frecuencia</h3>
                            <p className="text-sm text-gray-500">Defina el tiempo y periodicidad de pagos</p>
                          </div>
                        </div>
                        {formExpanded.terms ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>

                      {formExpanded.terms && (
                        <div className="mt-6 space-y-6 animate-in fade-in duration-300">
                          <div className="space-y-4">
                            <label className="text-sm font-medium text-gray-700">
                              Plazo (meses)
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {[3, 6, 12, 18, 24, 36, 48].map(plazo => (
                                <button
                                  key={plazo}
                                  type="button"
                                  onClick={() => setForm(prev => ({ ...prev, plazo }))}
                                  className={`px-5 py-2.5 rounded-lg transition-all duration-300 ${
                                    form.plazo === plazo
                                      ? 'bg-[#08557f] text-white shadow-sm'
                                      : 'border border-gray-300 text-gray-700 hover:border-gray-400'
                                  }`}
                                >
                                  {plazo} meses
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                              <label className="text-sm font-medium text-gray-700">
                                Frecuencia de Pago
                              </label>
                              <div className="grid grid-cols-3 gap-2">
                                {(['semanal', 'quincenal', 'mensual'] as const).map((freq) => (
                                  <button
                                    key={freq}
                                    type="button"
                                    onClick={() => setForm(prev => ({ ...prev, frecuenciaPago: freq }))}
                                    className={`py-3 rounded-lg transition-all duration-300 ${
                                      form.frecuenciaPago === freq
                                        ? 'bg-gradient-to-br from-[#08557f]/10 to-[#08557f]/5 border border-[#08557f]'
                                        : 'border border-gray-300 hover:border-gray-400'
                                    }`}
                                  >
                                    <div className="text-center">
                                      <div className="text-sm font-medium capitalize">{freq}</div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-3">
                              <label className="text-sm font-medium text-gray-700">
                                Tasa de Interés (% mensual)
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  name="tasaInteres"
                                  value={form.tasaInteres}
                                  onChange={handleInputChange}
                                  min="0.1"
                                  max="10"
                                  step="0.1"
                                  className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:border-[#08557f] focus:ring-1 focus:ring-[#08557f]/10 transition-all"
                                />
                                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500">
                                  <Percent className="w-4 h-4" />
                                </div>
                                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                                  mensual
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Sección de Detalles */}
                    <div>
                      <div 
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => toggleFormSection('details')}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                            <Settings className="w-4 h-4 text-gray-600" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">Detalles Adicionales</h3>
                            <p className="text-sm text-gray-500">Cuota inicial y comisiones</p>
                          </div>
                        </div>
                        {formExpanded.details ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>

                      {formExpanded.details && (
                        <div className="mt-6 space-y-6 animate-in fade-in duration-300">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-gray-700">
                                  Cuota Inicial
                                </label>
                                <span className="text-sm font-medium text-[#08557f]">
                                  {form.montoTotal > 0 ? ((form.cuotaInicial / form.montoTotal) * 100).toFixed(0) : 0}%
                                </span>
                              </div>
                              <div className="relative">
                                <input
                                  type="range"
                                  name="cuotaInicial"
                                  value={form.cuotaInicial}
                                  onChange={handleInputChange}
                                  min="0"
                                  max={form.montoTotal}
                                  step="1000"
                                  className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#fb851b]"
                                />
                                <div className="flex justify-between mt-8">
                                  <div className="text-center">
                                    <div className="text-xs text-gray-500 mb-1">$0</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-xl font-light text-gray-900">{formatCurrency(form.cuotaInicial)}</div>
                                    <div className="text-xs text-gray-500 mt-1">Cuota inicial</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-xs text-gray-500 mb-1">{formatCurrency(form.montoTotal)}</div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-3">
                              <label className="text-sm font-medium text-gray-700">
                                Comisión (%)
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  name="comision"
                                  value={form.comision}
                                  onChange={handleInputChange}
                                  min="0"
                                  max="20"
                                  step="0.1"
                                  className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:border-[#08557f] focus:ring-1 focus:ring-[#08557f]/10 transition-all"
                                />
                                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500">
                                  <Percent className="w-4 h-4" />
                                </div>
                                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                                  del monto
                                </div>
                              </div>
                              <p className="text-xs text-gray-500">
                                Total comisión: {formatCurrency(resumenPrestamo.comisionTotal)}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <label className="text-sm font-medium text-gray-700">
                              Observaciones
                            </label>
                            <textarea
                              name="observaciones"
                              value={form.observaciones}
                              onChange={handleInputChange}
                              rows={3}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-[#08557f] focus:ring-1 focus:ring-[#08557f]/10 transition-all resize-none"
                              placeholder="Notas adicionales sobre el préstamo..."
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Paso 3: Confirmación */}
              {step === 3 && (
                <div className="space-y-8">
                  <div className="mb-8">
                    <h2 className="text-xl font-light text-gray-900 mb-2">Confirmar Préstamo</h2>
                    <p className="text-gray-500 text-sm">Revise todos los detalles antes de finalizar</p>
                  </div>

                  {/* Resumen Visual */}
                  <div className="p-8 rounded-2xl bg-gradient-to-br from-[#08557f]/5 to-white border border-gray-200">
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <p className="text-sm font-medium text-[#08557f] mb-1">Resumen del Préstamo</p>
                        <h3 className="text-2xl font-light text-gray-900">{formatCurrency(form.montoTotal)}</h3>
                      </div>
                      <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full">
                        <div className="w-2 h-2 rounded-full bg-[#08557f]"></div>
                        <span className="text-sm font-medium text-gray-700">{form.proposito}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                      <div className="p-6 bg-white rounded-xl border border-gray-100">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#08557f]/10 to-[#08557f]/20 flex items-center justify-center">
                            <CreditCard className="w-5 h-5 text-[#08557f]" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Cuota {form.frecuenciaPago}</p>
                            <p className="text-2xl font-light text-gray-900">
                              {formatCurrencyDecimal(resumenPrestamo.valorCuota)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="p-6 bg-white rounded-xl border border-gray-100">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#fb851b]/10 to-[#fb851b]/20 flex items-center justify-center">
                            <BarChart className="w-5 h-5 text-[#fb851b]" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Total a Pagar</p>
                            <p className="text-2xl font-light text-gray-900">
                              {formatCurrency(resumenPrestamo.totalPagar)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="p-6 bg-white rounded-xl border border-gray-100">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-gray-600" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Tasa Efectiva</p>
                            <p className="text-2xl font-light text-gray-900">
                              {resumenPrestamo.tea.toFixed(2)}%
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="font-medium text-gray-900">Detalles Financieros</h4>
                        <div className="space-y-3">
                          {[
                            { label: 'Monto solicitado', value: formatCurrency(form.montoTotal) },
                            { label: 'Cuota inicial', value: formatCurrency(form.cuotaInicial) },
                            { label: `Comisión (${form.comision}%)`, value: formatCurrency(resumenPrestamo.comisionTotal) },
                            { label: 'Total financiado', value: formatCurrency(resumenPrestamo.totalFinanciado) },
                            { label: 'Total intereses', value: formatCurrency(resumenPrestamo.totalInteres), highlight: true },
                          ].map((item, index) => (
                            <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                              <span className="text-sm text-gray-600">{item.label}</span>
                              <span className={`font-medium ${item.highlight ? 'text-[#fb851b]' : 'text-gray-900'}`}>
                                {item.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-medium text-gray-900">Información del Cliente</h4>
                        <div className="p-4 rounded-xl bg-white border border-gray-100">
                          <div className="flex items-center gap-4 mb-4">
                            <div className={`w-14 h-14 rounded-lg ${getAvatarColor(form.clienteId)} flex items-center justify-center`}>
                              <span className="text-gray-900 font-medium text-lg">
                                {clienteSeleccionado?.nombre.charAt(0)}{clienteSeleccionado?.apellido.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{clienteSeleccionado?.nombre} {clienteSeleccionado?.apellido}</p>
                              <p className="text-sm text-gray-500">Identificación: {clienteSeleccionado?.identificacion}</p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 rounded-lg bg-gray-50">
                              <p className="text-xs text-gray-500 mb-1">Score</p>
                              <p className={`font-medium ${getScoreColor(clienteSeleccionado?.scoreCrediticio || 0)}`}>
                                {clienteSeleccionado?.scoreCrediticio}/100
                              </p>
                            </div>
                            <div className="p-3 rounded-lg bg-gray-50">
                              <p className="text-xs text-gray-500 mb-1">Límite</p>
                              <p className="font-medium text-gray-900">{formatCurrency(clienteSeleccionado?.limiteCredito || 0)}</p>
                            </div>
                          </div>
                          {clienteSeleccionado && form.montoTotal > clienteSeleccionado.limiteCredito && (
                            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                              <p className="text-yellow-700 text-sm">
                                ⚠️ Este préstamo excede el límite de crédito del cliente por {formatCurrency(form.montoTotal - clienteSeleccionado.limiteCredito)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Plan de Pagos */}
                  <div className="rounded-xl border border-gray-200 overflow-hidden">
                    <div className="p-6 border-b border-gray-200 bg-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">Plan de Pagos</h3>
                          <p className="text-sm text-gray-500 mt-1">
                            {form.plazo} meses • Pagos {form.frecuenciaPago}es
                          </p>
                        </div>
                        <button className="text-sm font-medium text-[#08557f] hover:text-[#074970] transition-colors">
                          Ver todas las cuotas
                        </button>
                      </div>
                    </div>
                    <div className="divide-y divide-gray-100 bg-white">
                      {cuotas.map((cuota) => (
                        <div 
                          key={cuota.numero}
                          className="p-6 hover:bg-gray-50 transition-colors duration-200"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-6">
                              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#08557f]/5 to-[#08557f]/10 flex items-center justify-center">
                                <span className="text-lg font-medium text-[#08557f]">#{cuota.numero}</span>
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">Cuota {cuota.numero}</p>
                                <p className="text-sm text-gray-500">{cuota.fecha}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-light text-gray-900">{formatCurrencyDecimal(cuota.total)}</p>
                              <div className="flex items-center justify-end gap-3 text-xs text-gray-500 mt-1">
                                <span className="text-gray-600">Capital: {formatCurrencyDecimal(cuota.capital)}</span>
                                <span>•</span>
                                <span className="text-[#fb851b]">Int: {formatCurrencyDecimal(cuota.interes)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Navegación */}
              {step < 3 ? (
                <div className="flex justify-between pt-8 border-t border-gray-200">
                  {step > 1 && (
                    <button
                      onClick={anteriorStep}
                      className="flex items-center gap-2 px-6 py-3 rounded-lg border border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50 transition-all duration-300"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Anterior
                    </button>
                  )}
                  
                  <button
                    onClick={siguienteStep}
                    disabled={step === 1 && !form.clienteId}
                    className="px-8 py-3 bg-[#08557f] text-white rounded-lg hover:bg-[#074970] transition-all duration-300 font-medium ml-auto disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {step < 2 ? 'Continuar' : 'Revisar Préstamo'}
                    <ChevronRight className="w-4 h-4 inline ml-2" />
                  </button>
                </div>
              ) : (
                <div className="flex justify-end gap-4 pt-8 border-t border-gray-200">
                  <button
                    onClick={anteriorStep}
                    className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 hover:border-gray-400 transition-all duration-300"
                  >
                    Atrás
                  </button>
                  <button
                    onClick={() => {
                      // Lógica para guardar el préstamo
                      if (clienteSeleccionado && form.montoTotal > clienteSeleccionado.limiteCredito) {
                        const confirmar = window.confirm(
                          `El monto solicitado (${formatCurrency(form.montoTotal)}) excede el límite de crédito del cliente (${formatCurrency(clienteSeleccionado.limiteCredito)}). ¿Desea continuar de todas formas?`
                        );
                        if (!confirmar) return;
                      }
                      alert('¡Préstamo creado exitosamente!');
                      router.push('/admin/prestamos');
                    }}
                    className="px-8 py-3 bg-gradient-to-r from-[#08557f] to-[#074970] text-white rounded-lg hover:opacity-95 transition-all duration-300 font-medium flex items-center gap-2 shadow-sm"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Confirmar y Generar Préstamo
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Panel Lateral - Resumen */}
          <div className="space-y-6">
            {/* Resumen Calculadora */}
            <div className="p-6 rounded-2xl bg-gradient-to-b from-white to-gray-50 border border-gray-200">
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#08557f]/10 to-[#08557f]/20 flex items-center justify-center">
                    <Calculator className="w-5 h-5 text-[#08557f]" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Calculadora</h3>
                    <p className="text-sm text-gray-500">Resultados en tiempo real</p>
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-gradient-to-br from-[#08557f] to-[#074970] text-white">
                  <div className="text-center">
                    <p className="text-sm opacity-90">Valor Cuota</p>
                    <p className="text-3xl font-light mt-2 tracking-tight">
                      {formatCurrencyDecimal(resumenPrestamo.valorCuota)}
                    </p>
                    <div className="flex items-center justify-center gap-2 mt-4 text-xs opacity-80">
                      <Clock className="w-3 h-3" />
                      {form.plazo} meses • {form.tasaInteres}% mensual
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  { label: 'Monto financiado', value: formatCurrency(resumenPrestamo.totalFinanciado) },
                  { label: 'Comisión inicial', value: formatCurrency(resumenPrestamo.comisionTotal), color: 'text-gray-900' },
                  { label: 'Total intereses', value: formatCurrency(resumenPrestamo.totalInteres), color: 'text-[#fb851b]' },
                  { label: 'Total a pagar', value: formatCurrency(resumenPrestamo.totalPagar), color: 'text-gray-900', bold: true },
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0 last:pb-0">
                    <span className="text-sm text-gray-600">{item.label}</span>
                    <span className={`text-sm ${item.color} ${item.bold ? 'font-medium' : ''}`}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-6 mt-6 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-4 rounded-xl bg-white border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">TEA</p>
                    <p className="text-lg font-medium text-gray-900">{resumenPrestamo.tea.toFixed(2)}%</p>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-white border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">TAE</p>
                    <p className="text-lg font-medium text-gray-900">{resumenPrestamo.tae.toFixed(2)}%</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Información del Cliente */}
            {clienteSeleccionado && (
              <div className="p-6 rounded-2xl bg-white border border-gray-200">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#fb851b]/10 to-[#fb851b]/20 flex items-center justify-center">
                    <Users className="w-5 h-5 text-[#fb851b]" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Cliente</h3>
                    <p className="text-sm text-gray-500">Información seleccionada</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-xl ${getAvatarColor(clienteSeleccionado.id)} flex items-center justify-center`}>
                      <span className="text-gray-900 font-medium text-xl">
                        {clienteSeleccionado.nombre.charAt(0)}{clienteSeleccionado.apellido.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{clienteSeleccionado.nombre} {clienteSeleccionado.apellido}</h4>
                      <p className="text-sm text-gray-500 mt-1">Identificación: {clienteSeleccionado.identificacion}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="p-4 rounded-xl bg-gray-50">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-gray-700">Score Crediticio</span>
                        <span className={`text-sm font-medium ${getScoreColor(clienteSeleccionado.scoreCrediticio)}`}>
                          {clienteSeleccionado.scoreCrediticio}/100
                        </span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${getScoreBgColor(clienteSeleccionado.scoreCrediticio)}`}
                          style={{ width: `${clienteSeleccionado.scoreCrediticio}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-white border border-gray-200">
                        <p className="text-xs text-gray-500 mb-1">Límite</p>
                        <p className="font-medium text-gray-900">{formatCurrency(clienteSeleccionado.limiteCredito)}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-white border border-gray-200">
                        <p className="text-xs text-gray-500 mb-1">Disponible</p>
                        <p className="font-medium text-[#08557f]">{formatCurrency(clienteSeleccionado.saldoDisponible)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Análisis de Riesgo */}
            {clienteSeleccionado && step >= 2 && (
              <div className="p-6 rounded-2xl bg-white border border-gray-200">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Análisis de Riesgo</h3>
                    <p className="text-sm text-gray-500">Evaluación automática</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700">Capacidad de Pago</span>
                      <span className={`text-sm font-medium ${
                        resumenPrestamo.valorCuota < (clienteSeleccionado?.ingresosMensuales || 0) * 0.35 
                          ? 'text-green-600' 
                          : 'text-[#fb851b]'
                      }`}>
                        {clienteSeleccionado?.ingresosMensuales > 0 
                          ? ((resumenPrestamo.valorCuota / clienteSeleccionado.ingresosMensuales) * 100).toFixed(0)
                          : '100'
                        }%
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          resumenPrestamo.valorCuota < (clienteSeleccionado?.ingresosMensuales || 0) * 0.35 
                            ? 'bg-green-500' 
                            : 'bg-[#fb851b]'
                        }`}
                        style={{ 
                          width: `${Math.min(100, clienteSeleccionado?.ingresosMensuales > 0 
                            ? ((resumenPrestamo.valorCuota / clienteSeleccionado.ingresosMensuales) * 100)
                            : 100
                          )}%` 
                        }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Recomendado: menos del 35% de ingresos
                    </p>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Nivel de Riesgo</span>
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${
                        clienteSeleccionado?.scoreCrediticio >= 80 ? 'bg-green-50 text-green-700' :
                        clienteSeleccionado?.scoreCrediticio >= 70 ? 'bg-[#fb851b]/10 text-[#fb851b]' : 'bg-red-50 text-red-700'
                      }`}>
                        <div className={`w-2 h-2 rounded-full ${
                          clienteSeleccionado?.scoreCrediticio >= 80 ? 'bg-green-500' :
                          clienteSeleccionado?.scoreCrediticio >= 70 ? 'bg-[#fb851b]' : 'bg-red-500'
                        }`}></div>
                        <span className="text-xs font-medium">
                          {clienteSeleccionado?.scoreCrediticio >= 80 ? 'BAJO' :
                           clienteSeleccionado?.scoreCrediticio >= 70 ? 'MODERADO' : 'ALTO'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Acciones Rápidas */}
            <div className="p-6 rounded-2xl bg-white border border-gray-200">
              <h3 className="font-medium text-gray-900 mb-4">Documentos</h3>
              <div className="space-y-2">
                <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#08557f]/10 to-[#08557f]/20 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-[#08557f]" />
                    </div>
                    <span className="text-sm text-gray-700">Generar contrato</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                </button>
                <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#fb851b]/10 to-[#fb851b]/20 flex items-center justify-center">
                      <Download className="w-4 h-4 text-[#fb851b]" />
                    </div>
                    <span className="text-sm text-gray-700">Descargar plan de pagos</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                </button>
                <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                      <Eye className="w-4 h-4 text-gray-600" />
                    </div>
                    <span className="text-sm text-gray-700">Ver historial del cliente</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreacionPrestamoElegante;