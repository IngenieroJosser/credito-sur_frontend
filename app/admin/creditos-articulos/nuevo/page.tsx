'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Package, User, CheckCircle, Search, Filter,
  Plus, Trash2, Calendar, DollarSign, ShoppingBag, AlertCircle
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

// --- Tipos y Mocks ---

type FrecuenciaPago = 'DIARIO' | 'SEMANAL' | 'QUINCENAL' | 'MENSUAL';
type NivelRiesgo = 'VERDE' | 'AMARILLO' | 'ROJO' | 'LISTA_NEGRA';

interface Cliente {
  id: string;
  nombre: string;
  apellido: string;
  identificacion: string;
  telefono: string;
  email: string;
  nivelRiesgo: NivelRiesgo;
  saldoDisponible: number;
}

interface Articulo {
  id: string;
  nombre: string;
  categoria: string;
  precioBase: number; // Precio de contado
  imagen?: string;
}

interface ArticuloSeleccionado extends Articulo {
    cantidad: number;
    precioUnitarioCredito: number; // Precio calculado según meses (cuotas)
    total: number;
  }

// Datos Mock
const CLIENTES_MOCK: Cliente[] = [
  { id: 'CL-001', nombre: 'Carlos', apellido: 'Rodríguez', identificacion: '12.345.678', telefono: '300-1234567', email: 'carlos@email.com', nivelRiesgo: 'VERDE', saldoDisponible: 5200000 },
  { id: 'CL-002', nombre: 'Ana', apellido: 'Gómez', identificacion: '23.456.789', telefono: '310-9876543', email: 'ana@email.com', nivelRiesgo: 'VERDE', saldoDisponible: 8500000 },
  { id: 'CL-003', nombre: 'Roberto', apellido: 'Sánchez', identificacion: '34.567.890', telefono: '320-5556666', email: 'roberto@email.com', nivelRiesgo: 'AMARILLO', saldoDisponible: 3200000 },
];

const PRODUCTOS_MOCK: Articulo[] = [
  { id: 'ART-001', nombre: 'Televisor Samsung 55" 4K', categoria: 'Tecnología', precioBase: 1800000 },
  { id: 'ART-002', nombre: 'Nevera Haceb 300L', categoria: 'Electrodomésticos', precioBase: 1500000 },
  { id: 'ART-003', nombre: 'Lavadora LG 18kg', categoria: 'Electrodomésticos', precioBase: 2100000 },
  { id: 'ART-004', nombre: 'Celular Xiaomi Redmi Note 13', categoria: 'Tecnología', precioBase: 900000 },
  { id: 'ART-005', nombre: 'Juego de Sala en L', categoria: 'Muebles', precioBase: 2500000 },
  { id: 'ART-006', nombre: 'Cama Doble con Colchón', categoria: 'Muebles', precioBase: 1200000 },
];

export default function NuevoCreditoArticuloPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [animating, setAnimating] = useState(false);

  // Estados del Formulario
  const [clienteId, setClienteId] = useState<string>('');
  const [articulosSeleccionados, setArticulosSeleccionados] = useState<ArticuloSeleccionado[]>([]);
  
  // Configuración del Crédito
  const [meses, setMeses] = useState<number>(6);
  const [frecuenciaPago, setFrecuenciaPago] = useState<FrecuenciaPago>('QUINCENAL');
  const [cuotaInicial, setCuotaInicial] = useState<number>(0);
  const [fechaInicio, setFechaInicio] = useState<string>(new Date().toISOString().split('T')[0]);
  const [observaciones, setObservaciones] = useState('');

  // Estados UI Auxiliares
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [filtroRiesgo, setFiltroRiesgo] = useState('TODOS');
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('TODAS');
  const [ordenPrecio, setOrdenPrecio] = useState<'asc' | 'desc' | 'none'>('none');

  // --- Lógica Derivada ---

  const clienteSeleccionado = useMemo(() => 
    CLIENTES_MOCK.find(c => c.id === clienteId), 
  [clienteId]);

  const clientesFiltrados = useMemo(() => 
    CLIENTES_MOCK.filter(c => {
      const matchNombre = c.nombre.toLowerCase().includes(busquedaCliente.toLowerCase()) || 
                          c.identificacion.includes(busquedaCliente);
      const matchRiesgo = filtroRiesgo === 'TODOS' || c.nivelRiesgo === filtroRiesgo;
      return matchNombre && matchRiesgo;
    }), 
  [busquedaCliente, filtroRiesgo]);

  const categorias = useMemo(() => {
    const cats = new Set(PRODUCTOS_MOCK.map(p => p.categoria));
    return ['TODAS', ...Array.from(cats)];
  }, []);

  const productosFiltrados = useMemo(() => {
    let filtrados = PRODUCTOS_MOCK.filter(p => {
      const matchNombre = p.nombre.toLowerCase().includes(busquedaProducto.toLowerCase());
      const matchCategoria = filtroCategoria === 'TODAS' || p.categoria === filtroCategoria;
      return matchNombre && matchCategoria;
    });

    if (ordenPrecio !== 'none') {
      filtrados.sort((a, b) => {
        return ordenPrecio === 'asc' ? a.precioBase - b.precioBase : b.precioBase - a.precioBase;
      });
    }

    return filtrados;
  }, [busquedaProducto, filtroCategoria, ordenPrecio]);

  // Cálculo de Precios según Cuotas (Regla de Negocio: Precio depende de meses)
  const calcularPrecioCredito = (precioBase: number, duracionMeses: number) => {
    // Ejemplo: Incremento del 3.5% por mes de financiación sobre el precio base
    // Esto simula que el precio del producto "a crédito" es mayor según la duración (cuotas)
    const porcentajeIncremento = 0.035 * duracionMeses; 
    return precioBase * (1 + porcentajeIncremento);
  };

  // Recalcular totales cuando cambian los artículos o la duración
  const resumenFinanciero = useMemo(() => {
    const totalBase = articulosSeleccionados.reduce((sum, item) => sum + (item.precioBase * item.cantidad), 0);
    
    // Total con precio financiado (Simulación de "Precio de lista a X meses")
    const totalFinanciadoBruto = articulosSeleccionados.reduce((sum, item) => {
      const precioCredito = calcularPrecioCredito(item.precioBase, duracionMeses);
      return sum + (precioCredito * item.cantidad);
    }, 0);

    const saldoAFinanciar = totalFinanciadoBruto - cuotaInicial;
    
    // Cálculo de cuotas (Amortización simple para este ejemplo, ya que el interés está en el precio del producto)
    // Nota: En algunos modelos se cobra interés ADICIONAL sobre el saldo. 
    // Aquí asumimos el modelo "Precio Diferenciado" donde el precio ya incluye el interés.
    
    let numeroCuotas = 1;
    if (frecuenciaPago === 'MENSUAL') numeroCuotas = duracionMeses;
    if (frecuenciaPago === 'QUINCENAL') numeroCuotas = duracionMeses * 2;
    if (frecuenciaPago === 'SEMANAL') numeroCuotas = duracionMeses * 4.33;
    if (frecuenciaPago === 'DIARIO') numeroCuotas = duracionMeses * 30;

    const valorCuota = Math.ceil(saldoAFinanciar / numeroCuotas);

    return {
      totalBase,
      totalFinanciadoBruto,
      saldoAFinanciar,
      valorCuota,
      numeroCuotas: Math.ceil(numeroCuotas)
    };
  }, [articulosSeleccionados, duracionMeses, cuotaInicial, frecuenciaPago]);

  // --- Handlers ---

  const handleAgregarArticulo = (articulo: Articulo) => {
    setArticulosSeleccionados(prev => {
      const existe = prev.find(p => p.id === articulo.id);
      if (existe) {
        return prev.map(p => p.id === articulo.id 
          ? { ...p, cantidad: p.cantidad + 1, total: (p.precioUnitarioCredito || p.precioBase) * (p.cantidad + 1) } 
          : p
        );
      }
      return [...prev, { 
        ...articulo, 
        cantidad: 1, 
        precioUnitarioCredito: articulo.precioBase, // Se recalcula en render o efecto
        total: articulo.precioBase 
      }];
    });
  };

  const handleRemoverArticulo = (id: string) => {
    setArticulosSeleccionados(prev => prev.filter(p => p.id !== id));
  };

  const handleCambiarCantidad = (id: string, delta: number) => {
    setArticulosSeleccionados(prev => prev.map(p => {
      if (p.id === id) {
        const nuevaCantidad = Math.max(1, p.cantidad + delta);
        return { ...p, cantidad: nuevaCantidad };
      }
      return p;
    }));
  };

  const siguientePaso = () => {
    if (step === 1 && !clienteId) return alert('Seleccione un cliente');
    if (step === 2 && articulosSeleccionados.length === 0) return alert('Seleccione al menos un artículo');
    
    setAnimating(true);
    setTimeout(() => {
      setStep(prev => (prev + 1) as 1 | 2 | 3 | 4);
      setAnimating(false);
    }, 200);
  };

  const anteriorPaso = () => {
    if (step > 1) {
      setAnimating(true);
      setTimeout(() => {
        setStep(prev => (prev - 1) as 1 | 2 | 3 | 4);
        setAnimating(false);
      }, 200);
    }
  };

  const confirmarCredito = () => {
    alert('Crédito creado exitosamente (Simulación)');
    router.push('/admin/creditos-articulos');
  };

  const getAvatarColor = (id: string) => {
    const colors = ['bg-blue-100 text-blue-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700'];
    return colors[parseInt(id.replace(/\D/g, '')) % 3];
  };

  return (
    <div className="min-h-screen bg-slate-50 relative pb-12">
      {/* Fondo arquitectónico */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="fixed left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-blue-500 opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 px-8 pt-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform duration-200" />
            <span className="text-sm font-bold">Volver</span>
          </button>

          {/* Stepper */}
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-4">
              {[1, 2, 3, 4].map((num) => (
                <div key={num} className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                    step >= num ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'border border-slate-300 text-slate-400'
                  }`}>
                    {step > num ? '✓' : num}
                  </div>
                  {num < 4 && (
                    <div className={`w-8 h-px transition-colors duration-300 ${step > num ? 'bg-blue-600' : 'bg-slate-200'}`} />
                  )}
                </div>
              ))}
            </div>
            <div className="text-xs font-bold text-slate-500 px-3 py-1.5 border border-slate-200 rounded-full bg-white">
              Paso {step} de 4
            </div>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
              <Package className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              <span className="text-blue-600">Nuevo</span> <span className="text-orange-500">Crédito Artículo</span>
            </h1>
          </div>
          <p className="text-slate-500 text-sm pl-11 font-medium">Gestión de financiamiento para electrodomésticos y muebles</p>
        </div>
      </div>

      <div className="w-full px-8">
        <div className={`transition-opacity duration-300 ${animating ? 'opacity-70' : 'opacity-100'}`}>
          
          {/* PASO 1: SELECCIÓN DE CLIENTE */}
          {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-4 justify-between items-center">
                  <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text"
                      placeholder="Buscar cliente..."
                      value={busquedaCliente}
                      onChange={(e) => setBusquedaCliente(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div className="w-full md:w-48">
                    <select
                      value={filtroRiesgo}
                      onChange={(e) => setFiltroRiesgo(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:ring-2 focus:ring-blue-500/20 text-slate-600"
                    >
                      <option value="TODOS">Todos los Riesgos</option>
                      <option value="VERDE">Verde</option>
                      <option value="AMARILLO">Amarillo</option>
                      <option value="ROJO">Rojo</option>
                      <option value="LISTA_NEGRA">Lista Negra</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-4 font-bold text-slate-700">Cliente</th>
                        <th className="px-6 py-4 font-bold text-slate-700">Identificación</th>
                        <th className="px-6 py-4 font-bold text-slate-700">Saldo Disp.</th>
                        <th className="px-6 py-4 font-bold text-slate-700 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {clientesFiltrados.map((cliente) => (
                        <tr 
                          key={cliente.id}
                          onClick={() => setClienteId(cliente.id)}
                          className={`cursor-pointer transition-colors hover:bg-slate-50 ${clienteId === cliente.id ? 'bg-blue-50/50' : ''}`}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${getAvatarColor(cliente.id)}`}>
                                {cliente.nombre[0]}{cliente.apellido[0]}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{cliente.nombre} {cliente.apellido}</p>
                                <p className="text-xs text-slate-500">{cliente.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-600 font-medium">{cliente.identificacion}</td>
                          <td className="px-6 py-4 text-emerald-600 font-bold">{formatCurrency(cliente.saldoDisponible)}</td>
                          <td className="px-6 py-4 text-right">
                            <div className={`inline-flex items-center justify-center w-6 h-6 rounded-full transition-all ${
                              clienteId === cliente.id ? 'bg-blue-600 text-white scale-100' : 'border-2 border-slate-200 text-transparent scale-90'
                            }`}>
                              <CheckCircle className="w-4 h-4" />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* PASO 2: SELECCIÓN DE ARTÍCULOS */}
          {step === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Catálogo */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex flex-col gap-4 mb-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                          type="text"
                          placeholder="Buscar artículos..."
                          value={busquedaProducto}
                          onChange={(e) => setBusquedaProducto(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                      
                    {/* Filtros Categoría y Orden */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex flex-wrap items-center gap-2 w-full">
                          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide max-w-[calc(100%-120px)]">
                            {categorias.map(cat => (
                              <button
                                key={cat}
                                onClick={() => setFiltroCategoria(cat)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border ${
                                  filtroCategoria === cat
                                    ? 'bg-slate-800 text-white border-slate-800'
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                {cat === 'TODAS' ? 'Todas' : cat}
                              </button>
                            ))}
                          </div>

                          {(filtroCategoria !== 'TODAS' || busquedaProducto || ordenPrecio !== 'none') && (
                            <button
                              onClick={() => {
                                setFiltroCategoria('TODAS');
                                setBusquedaProducto('');
                                setOrdenPrecio('none');
                              }}
                              className="text-xs text-rose-500 font-bold hover:underline px-2"
                            >
                              Limpiar
                            </button>
                          )}
                        </div>
                        
                        <select
                          value={ordenPrecio}
                          onChange={(e) => setOrdenPrecio(e.target.value as any)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 bg-white focus:ring-2 focus:ring-blue-500/20"
                        >
                          <option value="none">Orden: Por Defecto</option>
                          <option value="asc">Precio: Menor a Mayor</option>
                          <option value="desc">Precio: Mayor a Menor</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2">
                      {productosFiltrados.map((prod) => (
                        <div key={prod.id} className="p-4 border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all group bg-white">
                          <div className="flex justify-between items-start mb-2">
                            <div className="p-2 bg-slate-100 rounded-lg text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                              <Package className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-bold px-2 py-1 bg-slate-100 rounded-full text-slate-500">{prod.categoria}</span>
                          </div>
                          <h4 className="font-bold text-slate-900 mb-1">{prod.nombre}</h4>
                          <p className="text-slate-500 text-xs mb-3">Precio Contado: {formatCurrency(prod.precioBase)}</p>
                          <button 
                            onClick={() => handleAgregarArticulo(prod)}
                            className="w-full py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                          >
                            <Plus className="w-3 h-3" /> Agregar
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Carrito / Selección */}
                <div className="lg:col-span-1">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden sticky top-8">
                    <div className="p-4 bg-slate-50 border-b border-slate-200">
                      <h3 className="font-bold text-slate-900 flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4 text-blue-600" />
                        Artículos Seleccionados
                      </h3>
                    </div>
                    <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto">
                      {articulosSeleccionados.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                          <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No hay artículos seleccionados</p>
                        </div>
                      ) : (
                        articulosSeleccionados.map((item) => (
                          <div key={item.id} className="flex gap-3 items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-slate-900 truncate">{item.nombre}</p>
                              <p className="text-xs text-slate-500">{formatCurrency(item.precioBase)} c/u</p>
                            </div>
                            <div className="flex items-center gap-2 bg-white rounded-lg border border-slate-200 px-1 py-0.5">
                              <button onClick={() => handleCambiarCantidad(item.id, -1)} className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-slate-900">-</button>
                              <span className="text-xs font-bold w-4 text-center">{item.cantidad}</span>
                              <button onClick={() => handleCambiarCantidad(item.id, 1)} className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-slate-900">+</button>
                            </div>
                            <button onClick={() => handleRemoverArticulo(item.id)} className="text-rose-400 hover:text-rose-600 p-1">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="p-4 bg-slate-50 border-t border-slate-200">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-slate-500 font-medium">Total Base</span>
                        <span className="text-lg font-bold text-slate-900">{formatCurrency(resumenFinanciero.totalBase)}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 text-right">* El precio final variará según las cuotas seleccionadas en el siguiente paso.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PASO 3: CONFIGURACIÓN Y PLAZOS */}
          {step === 3 && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Configuración */}
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      Condiciones del Crédito
                    </h3>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700 uppercase">Cuotas (Meses)</label>
                        <select
                          value={meses}
                          onChange={(e) => setMeses(Number(e.target.value))}
                          className="w-full px-4 py-2.5 rounded-xl border-slate-200 bg-slate-50 font-medium text-slate-900 focus:ring-2 focus:ring-blue-500/20"
                        >
                          {[1, 2, 3, 4, 5, 6, 9, 12, 18, 24].map(m => (
                            <option key={m} value={m}>{m} Meses</option>
                          ))}
                        </select>
                        <p className="text-xs text-blue-600 font-medium flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          El precio de los artículos aumenta según las cuotas
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700 uppercase">Frecuencia de Pago</label>
                        <select
                          value={frecuenciaPago}
                          onChange={(e) => setFrecuenciaPago(e.target.value as FrecuenciaPago)}
                          className="w-full px-4 py-2.5 rounded-xl border-slate-200 bg-slate-50 font-medium text-slate-900 focus:ring-2 focus:ring-blue-500/20"
                        >
                          <option value="DIARIO">Diario</option>
                          <option value="SEMANAL">Semanal</option>
                          <option value="QUINCENAL">Quincenal</option>
                          <option value="MENSUAL">Mensual</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700 uppercase">Cuota Inicial</label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="number"
                            value={cuotaInicial}
                            onChange={(e) => setCuotaInicial(Number(e.target.value))}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border-slate-200 bg-slate-50 font-medium text-slate-900 focus:ring-2 focus:ring-blue-500/20"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700 uppercase">Fecha Primer Pago</label>
                        <input
                          type="date"
                          value={fechaInicio}
                          onChange={(e) => setFechaInicio(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border-slate-200 bg-slate-50 font-medium text-slate-900 focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Resumen Financiero Dinámico */}
                <div className="bg-white p-8 rounded-3xl shadow-[0_20px_50px_rgb(8_112_184_/_7%)] flex flex-col justify-between relative overflow-hidden ring-1 ring-slate-900/5">
                   {/* Decoración de fondo */}
                   <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600"></div>
                   
                   <div>
                     <h4 className="text-slate-500 font-bold uppercase tracking-wider text-xs mb-6">Resumen de Financiación</h4>
                     
                     <div className="space-y-4 mb-8">
                       <div className="flex justify-between items-center text-sm">
                         <span className="text-slate-500">Valor Artículos (Base)</span>
                         <span className="font-medium text-slate-900">{formatCurrency(resumenFinanciero.totalBase)}</span>
                       </div>
                       <div className="flex justify-between items-center text-sm text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                        <span className="font-medium">Intereses por Cuotas ({duracionMeses}m)</span>
                        <span className="font-bold">+{formatCurrency(resumenFinanciero.totalFinanciadoBruto - resumenFinanciero.totalBase)}</span>
                      </div>
                       <div className="flex justify-between items-center text-lg font-bold border-t border-slate-100 pt-3 text-slate-900">
                         <span>Total Crédito</span>
                         <span>{formatCurrency(resumenFinanciero.totalFinanciadoBruto)}</span>
                       </div>
                       <div className="flex justify-between items-center text-sm text-slate-500">
                         <span>(-) Cuota Inicial</span>
                         <span>{formatCurrency(cuotaInicial)}</span>
                       </div>
                       <div className="flex justify-between items-center text-xl font-black text-blue-600 pt-2">
                         <span>Saldo a Financiar</span>
                         <span>{formatCurrency(resumenFinanciero.saldoAFinanciar)}</span>
                       </div>
                     </div>
                   </div>

                   <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                     <p className="text-xs font-bold text-slate-400 uppercase mb-1">Valor Estimado de Cuota</p>
                     <div className="flex items-baseline gap-2">
                       <span className="text-3xl font-black text-slate-900">{formatCurrency(resumenFinanciero.valorCuota)}</span>
                       <span className="text-sm text-slate-500 font-medium capitalize">/ {frecuenciaPago.toLowerCase()}</span>
                     </div>
                     <div className="mt-3 flex items-center gap-2 text-xs font-medium text-blue-600 bg-blue-50 w-fit px-2 py-1 rounded">
                       <CheckCircle className="w-3 h-3" />
                       {resumenFinanciero.numeroCuotas} pagos {frecuenciaPago.toLowerCase()}s
                     </div>
                   </div>
                </div>
              </div>
            </div>
          )}

          {/* PASO 4: CONFIRMACIÓN */}
          {step === 4 && (
            <div className="max-w-3xl mx-auto animate-in zoom-in-95 duration-300">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
                <div className="p-8 border-b border-slate-100 text-center bg-slate-50/50">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Confirmar Crédito</h2>
                  <p className="text-slate-500">Verifique los detalles antes de finalizar</p>
                </div>

                <div className="p-8 space-y-8">
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase mb-4">Cliente</h4>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600">
                          {clienteSeleccionado?.nombre[0]}{clienteSeleccionado?.apellido[0]}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{clienteSeleccionado?.nombre} {clienteSeleccionado?.apellido}</p>
                          <p className="text-sm text-slate-500">{clienteSeleccionado?.identificacion}</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase mb-4">Plan de Pagos</h4>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-900"><span className="text-slate-500">Frecuencia:</span> {frecuenciaPago}</p>
                        <p className="text-sm font-medium text-slate-900"><span className="text-slate-500">Cuotas:</span> {duracionMeses} Meses</p>
                        <p className="text-sm font-medium text-slate-900"><span className="text-slate-500">Inicio:</span> {fechaInicio}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-4">Artículos ({articulosSeleccionados.length})</h4>
                    <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                      {articulosSeleccionados.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-slate-700">{item.cantidad}x {item.nombre}</span>
                          <span className="font-medium text-slate-900">{formatCurrency(calcularPrecioCredito(item.precioBase, duracionMeses) * item.cantidad)}</span>
                        </div>
                      ))}
                      <div className="border-t border-slate-200 pt-2 mt-2 flex justify-between font-bold text-slate-900">
                        <span>Total Financiado</span>
                        <span>{formatCurrency(resumenFinanciero.totalFinanciadoBruto)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-blue-50 text-blue-700 rounded-xl border border-blue-100">
                    <div className="flex-1">
                      <p className="text-xs font-bold uppercase opacity-70">Cuota {frecuenciaPago}</p>
                      <p className="text-2xl font-bold">{formatCurrency(resumenFinanciero.valorCuota)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold uppercase opacity-70">Total a Pagar</p>
                      <p className="text-lg font-bold">{formatCurrency(resumenFinanciero.saldoAFinanciar)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Botones de Navegación */}
          <div className="mt-8 flex justify-between items-center pt-8 border-t border-slate-200">
            <button
              onClick={anteriorPaso}
              disabled={step === 1}
              className={`px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors ${step === 1 ? 'opacity-0 pointer-events-none' : ''}`}
            >
              Anterior
            </button>
            
            {step < 4 ? (
              <button
                onClick={siguientePaso}
                className="px-8 py-2.5 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 flex items-center gap-2"
              >
                Siguiente
                <ArrowLeft className="w-4 h-4 rotate-180" />
              </button>
            ) : (
              <button
                onClick={confirmarCredito}
                className="px-8 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2"
              >
                Confirmar y Crear Crédito
                <CheckCircle className="w-4 h-4" />
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}