'use client';

import React, { useState, useEffect } from 'react';
import {
  Calculator, Calendar, DollarSign, Percent, Clock,
  Package, CreditCard, TrendingUp, CalendarDays,
  FileText, BarChart, Zap, Smartphone, Tv,
  RefreshCw, CheckCircle, ArrowLeft, ChevronRight,
  Shield, Lock, UserCheck, BadgeCheck, Plus,
  Repeat, RotateCcw, ChevronDown, Eye
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Producto {
  id: string;
  nombre: string;
  categoria: string;
  precioBase: number;
  stock: number;
  icono: React.ReactNode;
  marca: string;
  garantia: number;
  tasaEspecial?: number;
  color: string;
}

interface Cliente {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  scoreCrediticio: number;
  limiteCredito: number;
  saldoDisponible: number;
  ingresosMensuales: number;
  avatarColor: string;
  ultimaCompra: string;
}

interface CuotaCalculada {
  numero: number;
  fecha: string;
  capital: number;
  interes: number;
  total: number;
  saldo: number;
}

interface FormularioPrestamo {
  clienteId: string;
  productoId: string;
  montoTotal: number;
  tasaInteres: number;
  plazo: number;
  frecuenciaPago: 'semanal' | 'quincenal' | 'mensual';
  fechaInicio: string;
  tasaMora: number;
  cuotaInicial: number;
  gastosAdministrativos: number;
  seguro: number;
  observaciones: string;
}

const CreacionPrestamoElegante = () => {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [calculando, setCalculando] = useState(false);
  const [mostrarResumen, setMostrarResumen] = useState(false);

  // Clientes disponibles
  const [clientes] = useState<Cliente[]>([
    {
      id: 'CL-001',
      nombre: 'Carlos',
      apellido: 'Rodríguez',
      dni: '12.345.678',
      scoreCrediticio: 78,
      limiteCredito: 15000,
      saldoDisponible: 5200,
      ingresosMensuales: 3500,
      avatarColor: 'from-blue-500/20 to-blue-600/20',
      ultimaCompra: '15 Jul 2023'
    },
    {
      id: 'CL-002',
      nombre: 'Ana',
      apellido: 'Gómez',
      dni: '23.456.789',
      scoreCrediticio: 92,
      limiteCredito: 20000,
      saldoDisponible: 8500,
      ingresosMensuales: 4200,
      avatarColor: 'from-purple-500/20 to-purple-600/20',
      ultimaCompra: '22 Jul 2023'
    },
    {
      id: 'CL-003',
      nombre: 'Roberto',
      apellido: 'Sánchez',
      dni: '34.567.890',
      scoreCrediticio: 65,
      limiteCredito: 10000,
      saldoDisponible: 3200,
      ingresosMensuales: 2800,
      avatarColor: 'from-gray-500/20 to-gray-600/20',
      ultimaCompra: '10 Jul 2023'
    }
  ]);

  // Catálogo de productos
  const [productos] = useState<Producto[]>([
    {
      id: 'PROD-001',
      nombre: 'Refrigeradora Samsung',
      categoria: 'Electrodomésticos',
      precioBase: 1200,
      stock: 8,
      icono: <Smartphone className="w-5 h-5" />,
      marca: 'Samsung',
      garantia: 24,
      tasaEspecial: 1.2,
      color: 'from-blue-500/10 to-blue-600/10'
    },
    {
      id: 'PROD-002',
      nombre: 'Lavadora LG',
      categoria: 'Electrodomésticos',
      precioBase: 850,
      stock: 12,
      icono: <RefreshCw className="w-5 h-5" />,
      marca: 'LG',
      garantia: 18,
      tasaEspecial: 1.0,
      color: 'from-purple-500/10 to-purple-600/10'
    },
    {
      id: 'PROD-003',
      nombre: 'Cocina a Gas',
      categoria: 'Electrodomésticos',
      precioBase: 650,
      stock: 15,
      icono: <Zap className="w-5 h-5" />,
      marca: 'Mabe',
      garantia: 12,
      color: 'from-amber-500/10 to-amber-600/10'
    }
  ]);

  // Formulario
  const [form, setForm] = useState<FormularioPrestamo>({
    clienteId: 'CL-001',
    productoId: 'PROD-001',
    montoTotal: 1200,
    tasaInteres: 1.5,
    plazo: 12,
    frecuenciaPago: 'mensual',
    fechaInicio: new Date().toISOString().split('T')[0],
    tasaMora: 5.0,
    cuotaInicial: 100,
    gastosAdministrativos: 50,
    seguro: 25,
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
    tae: 0
  });

  const clienteSeleccionado = clientes.find(c => c.id === form.clienteId);
  const productoSeleccionado = productos.find(p => p.id === form.productoId);

  // Calcular cuotas automáticamente
  useEffect(() => {
    calcularCuotas();
  }, [form.montoTotal, form.tasaInteres, form.plazo, form.frecuenciaPago, form.cuotaInicial]);

  const calcularCuotas = () => {
    setCalculando(true);
    
    const montoNeto = form.montoTotal - form.cuotaInicial;
    const tasaMensual = form.tasaInteres / 100;
    let cuotasCalculadas: CuotaCalculada[] = [];
    let saldo = montoNeto;

    const factorFrecuencia = {
      semanal: 4.33,
      quincenal: 2,
      mensual: 1
    };

    const cuotasTotales = form.plazo * factorFrecuencia[form.frecuenciaPago];
    const tasaPeriodo = tasaMensual / factorFrecuencia[form.frecuenciaPago];

    const cuotaFija = (montoNeto * tasaPeriodo) / (1 - Math.pow(1 + tasaPeriodo, -cuotasTotales));

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
        fecha: fechaPago.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
        capital: Number(capital.toFixed(2)),
        interes: Number(interes.toFixed(2)),
        total: Number(cuotaFija.toFixed(2)),
        saldo: Number(Math.max(0, saldo).toFixed(2))
      });
    }

    setCuotas(cuotasCalculadas.slice(0, 6));

    const totalInteres = cuotasCalculadas.reduce((sum, c) => sum + c.interes, 0);
    const totalPagar = montoNeto + totalInteres;
    const tea = Math.pow(1 + tasaMensual, 12) - 1;
    const tae = Math.pow(1 + tasaPeriodo, cuotasTotales) - 1;

    setResumenPrestamo({
      totalFinanciado: montoNeto,
      totalInteres: Number(totalInteres.toFixed(2)),
      totalPagar: Number(totalPagar.toFixed(2)),
      valorCuota: Number(cuotaFija.toFixed(2)),
      costoTotalCredito: Number((totalInteres + form.gastosAdministrativos + form.seguro).toFixed(2)),
      tea: Number((tea * 100).toFixed(2)),
      tae: Number((tae * 100).toFixed(2))
    });

    setTimeout(() => setCalculando(false), 200);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: name.includes('tasa') || name.includes('gastos') || name.includes('seguro') 
        ? parseFloat(value) || 0
        : name === 'montoTotal' || name === 'cuotaInicial'
        ? parseFloat(value) || 0
        : name === 'plazo'
        ? parseInt(value) || 0
        : value
    }));
  };

  const handleProductoSelect = (productoId: string) => {
    const producto = productos.find(p => p.id === productoId);
    if (producto) {
      setForm(prev => ({
        ...prev,
        productoId,
        montoTotal: producto.precioBase,
        tasaInteres: producto.tasaEspecial || 1.5
      }));
    }
  };

  const handleClienteSelect = (clienteId: string) => {
    const cliente = clientes.find(c => c.id === clienteId);
    if (cliente) {
      setForm(prev => ({
        ...prev,
        clienteId,
        tasaInteres: cliente.scoreCrediticio >= 80 ? 1.2 : 
                    cliente.scoreCrediticio >= 70 ? 1.5 : 2.0
      }));
    }
  };

  const siguienteStep = () => {
    if (step < 3) setStep((step + 1) as 1 | 2 | 3);
  };

  const anteriorStep = () => {
    if (step > 1) setStep((step - 1) as 1 | 2 | 3);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'COP'
    }).format(amount);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-white p-4 md:p-8">
      {/* Header Minimalista */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <button 
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Volver</span>
          </button>
          
          <div className="text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            Paso {step} de 3
          </div>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-light text-gray-900 mb-2">Nuevo Préstamo</h1>
          <p className="text-gray-500">Configure los términos del financiamiento</p>
        </div>

        {/* Indicador de Progreso */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="relative">
            <div className="h-px bg-gray-200 w-full"></div>
            <div 
              className="absolute top-0 left-0 h-px bg-gray-900 transition-all duration-500"
              style={{ width: `${(step - 1) * 50}%` }}
            ></div>
            <div className="flex justify-between mt-4">
              {[1, 2, 3].map((num) => (
                <div key={num} className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                    step >= num 
                      ? 'bg-gray-900 text-white'
                      : 'bg-white border border-gray-300 text-gray-400'
                  }`}>
                    {step > num ? <CheckCircle className="w-4 h-4" /> : num}
                  </div>
                  <span className={`text-xs mt-2 font-medium transition-colors ${
                    step >= num ? 'text-gray-900' : 'text-gray-400'
                  }`}>
                    {num === 1 ? 'Cliente' : num === 2 ? 'Producto' : 'Confirmar'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Panel Principal - Formulario */}
          <div className="lg:col-span-2">
            <div className="space-y-8">
              {/* Paso 1: Selección de Cliente */}
              {step === 1 && (
                <div className="space-y-8">
                  <div className="text-center mb-6">
                    <h2 className="text-xl font-light text-gray-900 mb-2">Seleccionar Cliente</h2>
                    <p className="text-gray-500 text-sm">Elija el cliente para el préstamo</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {clientes.map(cliente => (
                      <div
                        key={cliente.id}
                        onClick={() => handleClienteSelect(cliente.id)}
                        className={`p-6 rounded-xl border transition-all duration-300 cursor-pointer ${
                          form.clienteId === cliente.id
                            ? 'border-gray-900 bg-gray-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${cliente.avatarColor} flex items-center justify-center`}>
                              <span className="text-white font-medium">
                                {cliente.nombre.charAt(0)}{cliente.apellido.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <h3 className="font-medium text-gray-900">{cliente.nombre} {cliente.apellido}</h3>
                              <p className="text-sm text-gray-500">DNI: {cliente.dni}</p>
                            </div>
                          </div>
                          
                          {form.clienteId === cliente.id && (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          )}
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Score</span>
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${
                                    cliente.scoreCrediticio >= 80 ? 'bg-green-500' :
                                    cliente.scoreCrediticio >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${cliente.scoreCrediticio}%` }}
                                ></div>
                              </div>
                              <span className={`text-sm font-medium ${getScoreColor(cliente.scoreCrediticio)}`}>
                                {cliente.scoreCrediticio}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 rounded-lg bg-gray-50">
                              <p className="text-xs text-gray-500">Límite</p>
                              <p className="font-medium">{formatCurrency(cliente.limiteCredito)}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-gray-50">
                              <p className="text-xs text-gray-500">Disponible</p>
                              <p className="font-medium text-blue-600">{formatCurrency(cliente.saldoDisponible)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Paso 2: Configuración del Producto y Condiciones */}
              {step === 2 && (
                <div className="space-y-8">
                  <div className="text-center mb-6">
                    <h2 className="text-xl font-light text-gray-900 mb-2">Configurar Préstamo</h2>
                    <p className="text-gray-500 text-sm">Defina los términos del financiamiento</p>
                  </div>

                  {/* Catálogo de Productos */}
                  <div className="mb-8">
                    <div className="mb-4">
                      <h3 className="font-medium text-gray-900">Productos Disponibles</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {productos.map(producto => (
                        <div
                          key={producto.id}
                          onClick={() => handleProductoSelect(producto.id)}
                          className={`p-5 rounded-xl border transition-all duration-300 cursor-pointer ${
                            form.productoId === producto.id
                              ? 'border-gray-900 bg-gray-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className={`p-3 rounded-lg bg-gradient-to-br ${producto.color}`}>
                                {producto.icono}
                              </div>
                              <div>
                                <h3 className="font-medium text-gray-900">{producto.nombre}</h3>
                                <p className="text-sm text-gray-500">{producto.marca}</p>
                              </div>
                            </div>
                            
                            {form.productoId === producto.id && (
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            )}
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Precio</span>
                              <span className="font-medium">{formatCurrency(producto.precioBase)}</span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Garantía</span>
                              <span className="font-medium">{producto.garantia} meses</span>
                            </div>

                            {producto.tasaEspecial && (
                              <div className="mt-3 p-2 rounded-lg bg-green-50">
                                <p className="text-xs text-green-700 text-center">
                                  Tasa especial: {producto.tasaEspecial}%
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Configuración de Condiciones */}
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Monto */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                          Monto del Préstamo
                        </label>
                        <div className="relative">
                          <input
                            type="range"
                            name="montoTotal"
                            value={form.montoTotal}
                            onChange={handleInputChange}
                            min="100"
                            max="5000"
                            step="50"
                            className="w-full h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gray-900"
                          />
                          <div className="flex justify-between mt-4">
                            <span className="text-sm text-gray-500">$100</span>
                            <span className="text-lg font-light text-gray-900">
                              {formatCurrency(form.montoTotal)}
                            </span>
                            <span className="text-sm text-gray-500">$5,000</span>
                          </div>
                        </div>
                      </div>

                      {/* Plazo */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                          Plazo (meses)
                        </label>
                        <div className="flex items-center gap-4">
                          {[6, 12, 18, 24].map(plazo => (
                            <button
                              key={plazo}
                              type="button"
                              onClick={() => setForm(prev => ({ ...prev, plazo }))}
                              className={`flex-1 py-3 rounded-lg border transition-all duration-300 ${
                                form.plazo === plazo
                                  ? 'border-gray-900 bg-gray-900 text-white'
                                  : 'border-gray-300 text-gray-700 hover:border-gray-400'
                              }`}
                            >
                              <div className="text-center">
                                <div className="text-lg font-light">{plazo}</div>
                                <div className="text-xs text-gray-500">meses</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Tasa de Interés */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                          Tasa de Interés
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            name="tasaInteres"
                            value={form.tasaInteres}
                            onChange={handleInputChange}
                            min="0.5"
                            max="5"
                            step="0.1"
                            className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:border-gray-900 focus:ring-1 focus:ring-gray-900/20 transition-all duration-300"
                          />
                          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500">
                            <Percent className="w-4 h-4" />
                          </div>
                          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                            mensual
                          </div>
                        </div>
                      </div>

                      {/* Frecuencia de Pago */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                          Frecuencia
                        </label>
                        <select
                          name="frecuenciaPago"
                          value={form.frecuenciaPago}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-gray-900 focus:ring-1 focus:ring-gray-900/20 transition-all duration-300"
                        >
                          <option value="mensual">Mensual</option>
                          <option value="quincenal">Quincenal</option>
                          <option value="semanal">Semanal</option>
                        </select>
                      </div>

                      {/* Fecha de Inicio */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                          Fecha Inicio
                        </label>
                        <div className="relative">
                          <input
                            type="date"
                            name="fechaInicio"
                            value={form.fechaInicio}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:border-gray-900 focus:ring-1 focus:ring-gray-900/20 transition-all duration-300"
                          />
                          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500">
                            <Calendar className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Cuota Inicial */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700">
                          Cuota Inicial
                        </label>
                        <span className="text-sm text-gray-500">
                          {((form.cuotaInicial / form.montoTotal) * 100).toFixed(1)}%
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
                          step="50"
                          className="w-full h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gray-900"
                        />
                        <div className="flex justify-between mt-4">
                          <span className="text-sm text-gray-500">$0</span>
                          <span className="text-lg font-light text-gray-900">
                            {formatCurrency(form.cuotaInicial)}
                          </span>
                          <span className="text-sm text-gray-500">{formatCurrency(form.montoTotal)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Paso 3: Resumen y Confirmación */}
              {step === 3 && (
                <div className="space-y-8">
                  <div className="text-center mb-6">
                    <h2 className="text-xl font-light text-gray-900 mb-2">Confirmar Préstamo</h2>
                    <p className="text-gray-500 text-sm">Revise y confirme los detalles del préstamo</p>
                  </div>

                  {/* Resumen Visual */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="p-6 rounded-xl border border-gray-200">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 rounded-lg bg-gray-100">
                          <CreditCard className="w-5 h-5 text-gray-900" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Valor de Cuota</p>
                          <p className="text-2xl font-light text-gray-900">
                            {formatCurrency(resumenPrestamo.valorCuota)}
                          </p>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        Pagos {form.frecuenciaPago}es
                      </div>
                    </div>

                    <div className="p-6 rounded-xl border border-gray-200">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 rounded-lg bg-gray-100">
                          <BarChart className="w-5 h-5 text-gray-900" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Total a Pagar</p>
                          <p className="text-2xl font-light text-gray-900">
                            {formatCurrency(resumenPrestamo.totalPagar)}
                          </p>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        Incluye intereses y costos
                      </div>
                    </div>

                    <div className="p-6 rounded-xl border border-gray-200">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 rounded-lg bg-gray-100">
                          <TrendingUp className="w-5 h-5 text-gray-900" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">TEA</p>
                          <p className="text-2xl font-light text-gray-900">
                            {resumenPrestamo.tea.toFixed(2)}%
                          </p>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        Tasa Efectiva Anual
                      </div>
                    </div>
                  </div>

                  {/* Tabla de Amortización */}
                  <div className="rounded-xl border border-gray-200 overflow-hidden">
                    <div className="p-6 border-b border-gray-200 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900">Plan de Pagos</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">
                            {cuotas.length} cuotas {form.frecuenciaPago}es
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="divide-y divide-gray-200">
                      {cuotas.map((cuota) => (
                        <div 
                          key={cuota.numero}
                          className="p-4 hover:bg-gray-50 transition-colors duration-200"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-700">#{cuota.numero}</span>
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">Cuota {cuota.numero}</p>
                                <p className="text-sm text-gray-500">{cuota.fecha}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-gray-900">{formatCurrency(cuota.total)}</p>
                              <div className="flex items-center gap-3 text-xs text-gray-500">
                                <span>Capital: {formatCurrency(cuota.capital)}</span>
                                <span>•</span>
                                <span>Int: {formatCurrency(cuota.interes)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Detalles Financieros */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 rounded-xl border border-gray-200">
                      <h4 className="font-medium text-gray-900 mb-4">Detalles del Crédito</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-gray-600">Monto financiado</span>
                          <span className="font-medium">{formatCurrency(resumenPrestamo.totalFinanciado)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-gray-600">Total intereses</span>
                          <span className="font-medium text-yellow-600">{formatCurrency(resumenPrestamo.totalInteres)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="text-gray-600">Costo total crédito</span>
                          <span className="font-medium">{formatCurrency(resumenPrestamo.costoTotalCredito)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 rounded-xl border border-gray-200">
                      <h4 className="font-medium text-gray-900 mb-4">Información del Cliente</h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 mb-4">
                          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${clienteSeleccionado?.avatarColor} flex items-center justify-center`}>
                            <span className="text-white font-medium">
                              {clienteSeleccionado?.nombre.charAt(0)}{clienteSeleccionado?.apellido.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{clienteSeleccionado?.nombre} {clienteSeleccionado?.apellido}</p>
                            <p className="text-sm text-gray-500">Score: {clienteSeleccionado?.scoreCrediticio}/100</p>
                          </div>
                        </div>
                        <div className="flex justify-between items-center py-2 border-t border-gray-100">
                          <span className="text-gray-600">Producto</span>
                          <span className="font-medium">{productoSeleccionado?.nombre}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Navegación */}
              <div className="flex justify-between pt-8 border-t border-gray-200">
                {step > 1 && (
                  <button
                    onClick={anteriorStep}
                    className="px-6 py-3 rounded-lg border border-gray-300 hover:border-gray-400 transition-all duration-300 text-gray-700 font-medium"
                  >
                    Anterior
                  </button>
                )}
                
                <div className="ml-auto">
                  {step < 3 ? (
                    <button
                      onClick={siguienteStep}
                      className="px-8 py-3 rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-all duration-300 font-medium"
                    >
                      Continuar
                    </button>
                  ) : !mostrarResumen ? (
                    <button
                      onClick={() => setMostrarResumen(true)}
                      className="px-8 py-3 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-all duration-300 font-medium"
                    >
                      Confirmar Préstamo
                    </button>
                  ) : (
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                      </div>
                      <h3 className="text-lg font-light text-gray-900 mb-2">¡Préstamo Creado!</h3>
                      <p className="text-gray-500 text-sm mb-6">El préstamo ha sido registrado exitosamente</p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            setStep(1);
                            setMostrarResumen(false);
                          }}
                          className="px-6 py-2 rounded-lg border border-gray-300 hover:border-gray-400 transition-colors text-gray-700 font-medium"
                        >
                          Nuevo Préstamo
                        </button>
                        <button
                          onClick={() => router.push('/admin/prestamos')}
                          className="px-6 py-2 rounded-lg bg-gray-900 text-white font-medium"
                        >
                          Ver Préstamos
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Panel Lateral - Calculadora y Resumen */}
          <div className="space-y-6">
            {/* Calculadora en Tiempo Real */}
            <div className="p-6 rounded-xl border border-gray-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-lg bg-gray-100">
                  <Calculator className="w-5 h-5 text-gray-900" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Calculadora</h3>
                  <p className="text-sm text-gray-500">Resultados en tiempo real</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-gray-900 text-white">
                  <div className="text-center">
                    <p className="text-sm text-gray-300">Valor de Cuota</p>
                    <p className="text-3xl font-light mt-2">
                      {formatCurrency(resumenPrestamo.valorCuota)}
                    </p>
                    <div className="flex items-center justify-center gap-2 mt-3 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />
                      {form.frecuenciaPago} durante {form.plazo} meses
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Monto financiado</span>
                    <span className="font-medium">{formatCurrency(resumenPrestamo.totalFinanciado)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Total intereses</span>
                    <span className="font-medium text-yellow-600">{formatCurrency(resumenPrestamo.totalInteres)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600">Total a pagar</span>
                    <span className="font-medium text-gray-900">{formatCurrency(resumenPrestamo.totalPagar)}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 rounded-lg bg-gray-50">
                      <p className="text-xs text-gray-500">TEA</p>
                      <p className="text-lg font-medium text-gray-900">{resumenPrestamo.tea.toFixed(2)}%</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-gray-50">
                      <p className="text-xs text-gray-500">TAE</p>
                      <p className="text-lg font-medium text-gray-900">{resumenPrestamo.tae.toFixed(2)}%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Resumen del Cliente */}
            {clienteSeleccionado && (
              <div className="p-6 rounded-xl border border-gray-200">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 rounded-lg bg-gray-100">
                    <UserCheck className="w-5 h-5 text-gray-900" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Cliente</h3>
                    <p className="text-sm text-gray-500">Información seleccionada</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-lg bg-gradient-to-br ${clienteSeleccionado.avatarColor} flex items-center justify-center`}>
                      <span className="text-white font-medium text-lg">
                        {clienteSeleccionado.nombre.charAt(0)}{clienteSeleccionado.apellido.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{clienteSeleccionado.nombre} {clienteSeleccionado.apellido}</h4>
                      <p className="text-sm text-gray-500">DNI: {clienteSeleccionado.dni}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Score Crediticio</span>
                        <span className={`text-sm font-medium ${getScoreColor(clienteSeleccionado.scoreCrediticio)}`}>
                          {clienteSeleccionado.scoreCrediticio}/100
                        </span>
                      </div>
                      <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            clienteSeleccionado.scoreCrediticio >= 80 ? 'bg-green-500' :
                            clienteSeleccionado.scoreCrediticio >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${clienteSeleccionado.scoreCrediticio}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-gray-50">
                        <p className="text-xs text-gray-500">Límite</p>
                        <p className="font-medium">{formatCurrency(clienteSeleccionado.limiteCredito)}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-gray-50">
                        <p className="text-xs text-gray-500">Disponible</p>
                        <p className="font-medium text-blue-600">{formatCurrency(clienteSeleccionado.saldoDisponible)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Análisis de Riesgo */}
            <div className="p-6 rounded-xl border border-gray-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-lg bg-gray-100">
                  <Shield className="w-5 h-5 text-gray-900" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Análisis de Riesgo</h3>
                  <p className="text-sm text-gray-500">Evaluación crediticia</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Capacidad de Pago</span>
                    <span className={`text-sm font-medium ${
                      resumenPrestamo.valorCuota < (clienteSeleccionado?.ingresosMensuales || 0) * 0.3 
                        ? 'text-green-600' 
                        : 'text-yellow-600'
                    }`}>
                      {((resumenPrestamo.valorCuota / (clienteSeleccionado?.ingresosMensuales || 1)) * 100).toFixed(1)}% de ingresos
                    </span>
                  </div>
                  <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        resumenPrestamo.valorCuota < (clienteSeleccionado?.ingresosMensuales || 0) * 0.3 
                          ? 'bg-green-500' 
                          : 'bg-yellow-500'
                      }`}
                      style={{ width: `${Math.min(100, ((resumenPrestamo.valorCuota / (clienteSeleccionado?.ingresosMensuales || 1)) * 100))}%` }}
                    ></div>
                  </div>
                </div>

                <div className="text-center pt-4 border-t border-gray-200">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full">
                    <div className={`w-2 h-2 rounded-full ${
                      clienteSeleccionado?.scoreCrediticio && clienteSeleccionado?.scoreCrediticio >= 80 ? 'bg-green-500' :
                      clienteSeleccionado?.scoreCrediticio && clienteSeleccionado?.scoreCrediticio >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}></div>
                    <p className={`text-sm font-medium ${
                      clienteSeleccionado?.scoreCrediticio && clienteSeleccionado?.scoreCrediticio >= 80 ? 'text-green-600' :
                      clienteSeleccionado?.scoreCrediticio && clienteSeleccionado?.scoreCrediticio >= 70 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {clienteSeleccionado?.scoreCrediticio && clienteSeleccionado?.scoreCrediticio >= 80 ? 'RIESGO BAJO' :
                       clienteSeleccionado?.scoreCrediticio && clienteSeleccionado?.scoreCrediticio >= 70 ? 'RIESGO MODERADO' : 'RIESGO ALTO'}
                    </p>
                  </div>
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