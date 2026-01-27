'use client';

import React, { useState, useMemo } from 'react';
import {
  DollarSign, Percent, Clock,
  FileText,
  CheckCircle, ArrowLeft,
  PlusCircle, User,
  ChevronRight, ChevronDown, Search, Filter, X
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
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
  identificacion: string; // CC/Cédula
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
  duracionMeses: number; // duracionMeses
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
  const cuotasTotales = Math.ceil(form.duracionMeses * factorFrecuencia[form.frecuenciaPago]);

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
      capital: Math.round(capitalFinal),
      interes: Math.round(interes),
      total: Math.round(capitalFinal + interes),
      saldo: Math.round(Math.max(0, saldo))
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
  
  // Estados para filtros de clientes
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [filtroRiesgo, setFiltroRiesgo] = useState<NivelRiesgo | 'TODOS'>('TODOS');

  // Estados para nuevo cliente
  const [nuevoCliente, setNuevoCliente] = useState({
    nombre: '',
    apellido: '',
    identificacion: '',
    telefono: '',
    email: '',
    referencia: '',
    ingresosMensuales: 0,
    antiguedadLaboral: 0,
    direccion: ''
  });

  const [fotosClienteNuevo, setFotosClienteNuevo] = useState({
    fotoPerfil: null as File | null,
    documentoFrente: null as File | null,
    documentoReverso: null as File | null,
    comprobanteDomicilio: null as File | null,
  })

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
    montoTotal: 0,
    proposito: 'PERSONAL',
    tasaInteres: 5.0, // Tasa mensual ejemplo
    duracionMeses: 0,
    frecuenciaPago: 'QUINCENAL',
    fechaInicio: new Date().toISOString().split('T')[0],
    tasaInteresMora: 2.0,
    cuotaInicial: 0,
    gastosAdministrativos: 10000,
    comision: 1.0,
    observaciones: ''
  });

  const [montoTotalInput, setMontoTotalInput] = useState('')
  const [cuotasInput, setCuotasInput] = useState('')

  const { resumenPrestamo } = useMemo(
    () => calcularCuotasYResumen(form),
    [form]
  );

  const clienteSeleccionado = clientes.find(c => c.id === form.clienteId);

  // Filtrado de clientes
  const clientesFiltrados = clientes.filter(cliente => {
    const cumpleBusqueda = 
      cliente.nombre.toLowerCase().includes(busquedaCliente.toLowerCase()) || 
      cliente.apellido.toLowerCase().includes(busquedaCliente.toLowerCase()) || 
      cliente.identificacion.includes(busquedaCliente);
    
    const cumpleFiltro = filtroRiesgo === 'TODOS' || cliente.nivelRiesgo === filtroRiesgo;

    return cumpleBusqueda && cumpleFiltro;
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: name.includes('tasa') || name.includes('gastos') || name.includes('comision')
        ? parseFloat(value) || 0
        : name === 'montoTotal' || name === 'cuotaInicial' || name === 'ingresosMensuales'
          ? parseFloat(value) || 0
          : name === 'duracionMeses' || name === 'antiguedadLaboral'
            ? parseInt(value) || 0
            : value
    }));
  };

  const handleNuevoClienteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Validar solo números para identificación y teléfono
    if ((name === 'identificacion' || name === 'telefono') && !/^\d*$/.test(value)) {
      return;
    }

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
        duracionMeses: form.duracionMeses,
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
      const destino = pathname?.startsWith('/supervisor') ? '/supervisor' : '/admin/prestamos'
      router.push(destino);

    } catch (error) {
      console.error('Error al crear el préstamo:', error);
      alert('Error al crear el préstamo. Por favor, intente nuevamente.');
    } finally {
      setCreandoPrestamo(false);
    }
  };

  const agregarCliente = () => {
    if (!nuevoCliente.nombre || !nuevoCliente.apellido || !nuevoCliente.identificacion || !nuevoCliente.telefono) {
      alert('Completa nombre, apellido, identificación y teléfono para crear el cliente.')
      return
    }

    // Asignar valores por defecto para clientes rápidos (salario mínimo y 1 año antigüedad)
    const ingresosDefault = nuevoCliente.ingresosMensuales || 1300000;
    const antiguedadDefault = nuevoCliente.antiguedadLaboral || 12;

    const score = calcularScore(ingresosDefault, antiguedadDefault);
    const limite = calcularLimiteCredito(score, ingresosDefault);

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
      referencia: '',
      ingresosMensuales: 0,
      antiguedadLaboral: 0,
      direccion: ''
    });
    setFotosClienteNuevo({
      fotoPerfil: null,
      documentoFrente: null,
      documentoReverso: null,
      comprobanteDomicilio: null,
    })
    setMostrarNuevoCliente(false);
  };

  const resetNuevoClienteModal = () => {
    setMostrarNuevoCliente(false)
    setNuevoCliente({
      nombre: '',
      apellido: '',
      identificacion: '',
      telefono: '',
      email: '',
      referencia: '',
      ingresosMensuales: 0,
      antiguedadLaboral: 0,
      direccion: '',
    })
    setFotosClienteNuevo({
      fotoPerfil: null,
      documentoFrente: null,
      documentoReverso: null,
      comprobanteDomicilio: null,
    })
  }

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
    <div className="min-h-screen bg-slate-50 relative">
      {/* Fondo arquitectónico */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="fixed left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-indigo-500 opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 px-8 pt-8">
        {/* Header Ultra Minimalista */}
        <div className="mb-8 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Volver</span>
          </button>

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
            <div className="text-xs font-bold text-slate-500 px-3 py-1.5 border border-slate-200 rounded-full">
              Paso {step} de 3
            </div>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
              <DollarSign className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              <span className="text-blue-600">Nuevo</span> <span className="text-orange-500">Préstamo</span>
            </h1>
          </div>
          <p className="text-slate-500 text-sm pl-11 font-medium">Gestión de financiamiento personalizado</p>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="w-full px-8 pb-12">
        {/* Panel Principal */}
        <div className="w-full">
          <div className={`space-y-8 transition-opacity duration-300 ${animating ? 'opacity-70' : 'opacity-100'}`}>

              {/* Paso 1: Selección de Cliente */}
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
                        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg hover:border-slate-400 hover:bg-slate-50 transition-all duration-200 group shadow-sm font-bold text-sm"
                      >
                        <PlusCircle className="w-4 h-4 text-slate-500 group-hover:text-slate-900 transition-colors" />
                        <span>Nuevo Cliente</span>
                      </button>
                    </div>
                  </div>

                  {/* Modal Nuevo Cliente */}
                  {mostrarNuevoCliente && (
                    <div
                      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
                      onClick={resetNuevoClienteModal}
                    >
                      <div
                        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="p-6">
                          <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-slate-900">Crear Cliente</h3>
                            <button
                              type="button"
                              onClick={resetNuevoClienteModal}
                              className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
                            >
                              <X className="h-5 w-5" />
                            </button>
                          </div>

                          <form
                            onSubmit={(e) => {
                              e.preventDefault()
                              console.log('Crear cliente:', { ...nuevoCliente, fotos: fotosClienteNuevo })
                              agregarCliente()
                            }}
                            className="space-y-4"
                          >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Cédula / CC</label>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  name="identificacion"
                                  value={nuevoCliente.identificacion}
                                  onChange={handleNuevoClienteChange}
                                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900 placeholder:text-slate-400"
                                  placeholder="Número de cédula (CC)"
                                  required
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Teléfono</label>
                                <input
                                  type="tel"
                                  inputMode="tel"
                                  name="telefono"
                                  value={nuevoCliente.telefono}
                                  onChange={handleNuevoClienteChange}
                                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900 placeholder:text-slate-400"
                                  placeholder="Ej: 3001234567"
                                  required
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Nombres</label>
                                <input
                                  name="nombre"
                                  value={nuevoCliente.nombre}
                                  onChange={handleNuevoClienteChange}
                                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900"
                                  required
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Apellidos</label>
                                <input
                                  name="apellido"
                                  value={nuevoCliente.apellido}
                                  onChange={handleNuevoClienteChange}
                                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900"
                                  required
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-bold text-slate-700 mb-2">Correo (Opcional)</label>
                              <input
                                type="email"
                                name="email"
                                value={nuevoCliente.email}
                                onChange={handleNuevoClienteChange}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900 placeholder:text-slate-400"
                                placeholder="correo@dominio.com"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-bold text-slate-700 mb-2">Dirección (Opcional)</label>
                              <input
                                name="direccion"
                                value={nuevoCliente.direccion}
                                onChange={handleNuevoClienteChange}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900 placeholder:text-slate-400"
                                placeholder="Dirección del cliente"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-bold text-slate-700 mb-2">Referencia (Opcional)</label>
                              <textarea
                                name="referencia"
                                value={nuevoCliente.referencia}
                                onChange={(e) => setNuevoCliente((prev) => ({ ...prev, referencia: e.target.value }))}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900 placeholder:text-slate-400 resize-none"
                                rows={3}
                                placeholder="Punto de referencia / observaciones"
                              />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Foto de perfil</label>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) =>
                                    setFotosClienteNuevo((prev) => ({
                                      ...prev,
                                      fotoPerfil: e.target.files?.[0] ?? null,
                                    }))
                                  }
                                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#08557f] file:text-white file:text-xs file:font-bold hover:file:bg-[#063a58]"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Cédula/CC (Frente)</label>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) =>
                                    setFotosClienteNuevo((prev) => ({
                                      ...prev,
                                      documentoFrente: e.target.files?.[0] ?? null,
                                    }))
                                  }
                                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#08557f] file:text-white file:text-xs file:font-bold hover:file:bg-[#063a58]"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Cédula/CC (Reverso)</label>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) =>
                                    setFotosClienteNuevo((prev) => ({
                                      ...prev,
                                      documentoReverso: e.target.files?.[0] ?? null,
                                    }))
                                  }
                                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#08557f] file:text-white file:text-xs file:font-bold hover:file:bg-[#063a58]"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Comprobante de domicilio</label>
                                <input
                                  type="file"
                                  accept="image/*,application/pdf"
                                  onChange={(e) =>
                                    setFotosClienteNuevo((prev) => ({
                                      ...prev,
                                      comprobanteDomicilio: e.target.files?.[0] ?? null,
                                    }))
                                  }
                                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#08557f] file:text-white file:text-xs file:font-bold hover:file:bg-[#063a58]"
                                />
                              </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                              <button
                                type="button"
                                onClick={resetNuevoClienteModal}
                                className="flex-1 bg-slate-100 text-slate-700 font-bold py-3.5 rounded-xl hover:bg-slate-200 transition-all"
                              >
                                Cancelar
                              </button>
                              <button
                                type="submit"
                                className="flex-1 bg-[#08557f] text-white font-bold py-3.5 rounded-xl shadow-lg shadow-[#08557f]/20 hover:bg-[#063a58] active:scale-[0.98] transition-all"
                              >
                                Guardar Cliente
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Lista de Clientes - Toolbar y Tabla */}
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                    {/* Toolbar de Búsqueda y Filtros */}
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
                                  form.clienteId === cliente.id ? 'bg-blue-50/50' : ''
                                }`}
                              >
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-slate-600 text-xs font-bold ${getAvatarColor(cliente.id)}`}>
                                      {cliente.nombre[0]}{cliente.apellido[0]}
                                    </div>
                                    <div>
                                      <p className="font-bold text-slate-900">{cliente.nombre} {cliente.apellido}</p>
                                      <p className="text-xs text-slate-500">{cliente.email}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 font-medium text-slate-600">
                                  {cliente.identificacion}
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
                                    form.clienteId === cliente.id 
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
                                  <p className="text-sm">Intenta con otra búsqueda o filtro</p>
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
                    {/* Monto y Cuotas */}
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
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-slate-500">Mínimo: $100.000</span>
                          <span className={form.montoTotal > (clienteSeleccionado?.saldoDisponible || 0) ? 'text-rose-500' : 'text-slate-500'}>
                            Máximo: {formatCurrency(clienteSeleccionado?.saldoDisponible || 0)}
                          </span>
                        </div>
                        <div className="mt-2 flex justify-end">
                          <button 
                            onClick={() => {
                              const destino = pathname?.startsWith('/supervisor') ? '/supervisor' : '/admin/solicitudes'
                              window.open(destino, '_blank')
                            }}
                            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          >
                            ¿Fondos insuficientes? Solicitar dinero
                          </button>
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
                    <p className="text-slate-500 text-sm font-medium">Adjunte los documentos del cliente</p>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-3">
                      <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400" />
                        Foto de perfil
                      </label>
                      <FileUploader
                        files={documentosRespaldo.fotoPerfil ? [documentosRespaldo.fotoPerfil] : []}
                        onFilesChange={(files) =>
                          setDocumentosRespaldo((prev) => ({
                            ...prev,
                            fotoPerfil: files[0] ?? null,
                          }))
                        }
                        maxFiles={1}
                        maxSize={5 * 1024 * 1024}
                        accept="image/jpeg,image/png"
                        multiple={false}
                        label="Arrastra la foto aquí"
                        description="Soporta JPG, PNG (Máx 5MB)"
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400" />
                        CC (Frente)
                      </label>
                      <FileUploader
                        files={documentosRespaldo.documentoFrente ? [documentosRespaldo.documentoFrente] : []}
                        onFilesChange={(files) =>
                          setDocumentosRespaldo((prev) => ({
                            ...prev,
                            documentoFrente: files[0] ?? null,
                          }))
                        }
                        maxFiles={1}
                        maxSize={5 * 1024 * 1024}
                        accept="image/jpeg,image/png"
                        multiple={false}
                        label="Arrastra la foto aquí"
                        description="Soporta JPG, PNG (Máx 5MB)"
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400" />
                        CC (Reverso)
                      </label>
                      <FileUploader
                        files={documentosRespaldo.documentoReverso ? [documentosRespaldo.documentoReverso] : []}
                        onFilesChange={(files) =>
                          setDocumentosRespaldo((prev) => ({
                            ...prev,
                            documentoReverso: files[0] ?? null,
                          }))
                        }
                        maxFiles={1}
                        maxSize={5 * 1024 * 1024}
                        accept="image/jpeg,image/png"
                        multiple={false}
                        label="Arrastra la foto aquí"
                        description="Soporta JPG, PNG (Máx 5MB)"
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400" />
                        Comprobante de domicilio
                      </label>
                      <FileUploader
                        files={documentosRespaldo.comprobanteDomicilio ? [documentosRespaldo.comprobanteDomicilio] : []}
                        onFilesChange={(files) =>
                          setDocumentosRespaldo((prev) => ({
                            ...prev,
                            comprobanteDomicilio: files[0] ?? null,
                          }))
                        }
                        maxFiles={1}
                        maxSize={5 * 1024 * 1024}
                        accept="image/*,application/pdf"
                        multiple={false}
                        label="Arrastra el archivo aquí"
                        description="Soporta JPG, PNG, PDF (Máx 5MB)"
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
      </div>
    </div>
  );
};

export default CreacionPrestamoElegante;
