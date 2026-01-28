'use client';

import React, { useState, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  ArrowLeft, Package, CheckCircle, Search,
  Plus, Trash2, Calendar, DollarSign, ShoppingBag
} from 'lucide-react';
import { formatCOPInputValue, formatCurrency, parseCOPInputToNumber } from '@/lib/utils';

import { MOCK_CLIENTES, Cliente } from '@/services/clientes-service';
import NuevoClienteModal from '@/components/clientes/NuevoClienteModal';

// --- Tipos y Mocks ---
import { MOCK_ARTICULOS, Articulo } from '@/services/articulos-service';

type FrecuenciaPago = 'DIARIO' | 'SEMANAL' | 'QUINCENAL' | 'MENSUAL';

interface ArticuloSeleccionado extends Articulo {
    cantidad: number;
    precioUnitarioCredito: number;
}

export default function CreacionCreditoArticulo() {
  const router = useRouter();
  const pathname = usePathname();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [animating, setAnimating] = useState(false);

  // Estados del Formulario
  const [clienteId, setClienteId] = useState<string>('');
  const [showNuevoClienteModal, setShowNuevoClienteModal] = useState(false);
  const [articulosSeleccionados, setArticulosSeleccionados] = useState<ArticuloSeleccionado[]>([]);
  
  // Configuración del Crédito (Basado en número de pagos según Mock)
  const [numeroCuotas, setNumeroCuotas] = useState<number>(12);
  const [frecuenciaPago, setFrecuenciaPago] = useState<FrecuenciaPago>('QUINCENAL');
  const [cuotaInicial, setCuotaInicial] = useState<number>(0);
  const [fechaInicio, setFechaInicio] = useState<string>(new Date().toISOString().split('T')[0]);
  
  // Estados UI Auxiliares
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [filtroRiesgo] = useState('TODOS');
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('TODAS');
  const [ordenPrecio, setOrdenPrecio] = useState<'asc' | 'desc' | 'none'>('none');
  const [listaClientes, setListaClientes] = useState<Cliente[]>(MOCK_CLIENTES);

  // --- Lógica Derivada ---

  const clientesFiltrados = useMemo(() => 
    listaClientes.filter(c => {
      const nombre = (c.nombres || '').toLowerCase();
      const apellido = (c.apellidos || '').toLowerCase();
      const documento = (c.dni || '').toLowerCase();
      const term = busquedaCliente.toLowerCase();
      
      const matchNombre = nombre.includes(term) || apellido.includes(term) || documento.includes(term);
      const matchRiesgo = filtroRiesgo === 'TODOS' || (c.nivelRiesgo === filtroRiesgo);
      return matchNombre && matchRiesgo;
    }), 
  [busquedaCliente, filtroRiesgo, listaClientes]);

  const clienteSeleccionado = useMemo(() => 
    listaClientes.find(c => String(c.id) === String(clienteId)), 
  [clienteId, listaClientes]);

  const categorias = useMemo(() => {
    const cats = new Set(MOCK_ARTICULOS.map(p => p.categoria));
    return ['TODAS', ...Array.from(cats)];
  }, []);

  const productosFiltrados = useMemo(() => {
    const filtrados = MOCK_ARTICULOS.filter(p => {
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

  // Plazos disponibles (Intersección de todos los artículos)
  const opcionesCuotasDisponibles = useMemo(() => {
    if (articulosSeleccionados.length === 0) return [];
    let comunes = articulosSeleccionados[0].opcionesCuotas.map(o => o.numeroCuotas);
    for (let i = 1; i < articulosSeleccionados.length; i++) {
        const opcionesArticulo = articulosSeleccionados[i].opcionesCuotas.map(o => o.numeroCuotas);
        comunes = comunes.filter(c => opcionesArticulo.includes(c));
    }
    return comunes.sort((a, b) => a - b);
  }, [articulosSeleccionados]);

  // Efecto para ajustar cuotas cuando cambian las opciones disponibles
  React.useEffect(() => {
    if (opcionesCuotasDisponibles.length > 0) {
      if (!opcionesCuotasDisponibles.includes(numeroCuotas)) {
        setNumeroCuotas(opcionesCuotasDisponibles[0]);
      }
    }
  }, [opcionesCuotasDisponibles, numeroCuotas]);

  const resumenFinanciero = useMemo(() => {
    const totalBase = articulosSeleccionados.reduce((sum, item) => sum + (item.precioBase * item.cantidad), 0);
    
    const totalFinanciadoBruto = articulosSeleccionados.reduce((sum, item) => {
      const opcion = item.opcionesCuotas.find(o => o.numeroCuotas === numeroCuotas && o.frecuenciaPago === frecuenciaPago);
      const precioItemTotal = opcion ? opcion.precioTotal : (item.opcionesCuotas[0]?.precioTotal || item.precioBase); 
      return sum + (precioItemTotal * item.cantidad);
    }, 0);

    const saldoAFinanciar = totalFinanciadoBruto - cuotaInicial;
    
    const valorCuotaTotal = articulosSeleccionados.reduce((sum, item) => {
         const opcion = item.opcionesCuotas.find(o => o.numeroCuotas === numeroCuotas && o.frecuenciaPago === frecuenciaPago);
         return sum + ((opcion ? opcion.valorCuota : 0) * item.cantidad);
    }, 0);

    return {
      totalBase,
      totalFinanciadoBruto,
      saldoAFinanciar,
      valorCuota: valorCuotaTotal,
      numeroCuotas: numeroCuotas
    };
  }, [articulosSeleccionados, numeroCuotas, cuotaInicial, frecuenciaPago]);

  // --- Handlers ---

  const handleAgregarArticulo = (articulo: Articulo) => {
    setArticulosSeleccionados(prev => {
      const existe = prev.find(p => p.id === articulo.id);
      if (existe) {
        return prev.map(p => p.id === articulo.id 
          ? { ...p, cantidad: p.cantidad + 1 } 
          : p
        );
      }
      return [...prev, { 
        ...articulo, 
        cantidad: 1, 
        precioUnitarioCredito: articulo.precioBase
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
    let destino = '/admin/prestamos';
    if (pathname?.startsWith('/supervisor')) destino = '/supervisor';
    if (pathname?.startsWith('/coordinador')) destino = '/coordinador/creditos';
    router.push(destino);
  };

  const handleClienteCreado = (nuevoCliente: Cliente) => {
    setListaClientes(prev => [nuevoCliente, ...prev]);
    setClienteId(nuevoCliente.id);
    setShowNuevoClienteModal(false);
  };

  const getAvatarColor = (id: string) => {
    const colors = ['bg-blue-100 text-blue-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700'];
    const numId = parseInt(String(id).match(/\d+/)?.[0] || '0');
    return colors[numId % 3];
  };

  return (
    <div className="bg-slate-50 relative pb-12">
      <div className="relative z-10 pt-4 px-0">
        <div className="mb-6 flex items-center justify-between">
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

        <div className="w-full">
          <div className={`transition-opacity duration-300 ${animating ? 'opacity-70' : 'opacity-100'}`}>
            
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

                    <button
                        onClick={() => setShowNuevoClienteModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-blue-200 text-[#08557f] rounded-xl shadow-sm hover:bg-blue-50 transition-all text-sm font-bold active:scale-95"
                    >
                        <Plus className="w-4 h-4" />
                        Nuevo Cliente
                    </button>
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
                            className={`cursor-pointer transition-colors hover:bg-slate-50 ${String(clienteId) === String(cliente.id) ? 'bg-blue-50/50' : ''}`}
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${getAvatarColor(cliente.id)}`}>
                                  {(cliente.nombres || ' ')[0]}{(cliente.apellidos || ' ')[0]}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900">{cliente.nombres} {cliente.apellidos}</p>
                                  <p className="text-xs text-slate-500">{cliente.correo}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-slate-600 font-medium">{cliente.dni}</td>
                            <td className="px-6 py-4 text-emerald-600 font-bold">{formatCurrency(10000000)}</td>
                            <td className="px-6 py-4 text-right">
                              <div className={`inline-flex items-center justify-center w-6 h-6 rounded-full transition-all ${
                                String(clienteId) === String(cliente.id) ? 'bg-blue-600 text-white scale-100' : 'border-2 border-slate-200 text-transparent scale-90'
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

            {step === 2 && (
              <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
                        
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div className="flex flex-wrap items-center gap-2 w-full">
                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide max-w-[calc(100%-120px)]">
                              {categorias.map(cat => (
                                <button
                                  key={cat}
                                  onClick={() => setFiltroCategoria(cat)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-black whitespace-nowrap transition-all border ${
                                    filtroCategoria === cat
                                      ? 'bg-white text-[#08557f] border-[#08557f] shadow-sm'
                                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                                  }`}
                                >
                                  {cat === 'TODAS' ? 'Todas' : cat}
                                </button>
                              ))}
                            </div>
                          </div>
                          
                          <select
                            value={ordenPrecio}
                            onChange={(e) => setOrdenPrecio(e.target.value as 'asc' | 'desc' | 'none')}
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
                              className="w-full py-2 bg-white text-[#08557f] border border-blue-200 rounded-lg text-xs font-black hover:bg-blue-50 transition-all flex items-center justify-center gap-2 active:scale-95"
                            >
                              <Plus className="w-3 h-3" /> Agregar
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
   
                  <div className="lg:col-span-1">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden sticky top-8">
                      <div className="p-4 bg-slate-50 border-b border-slate-200">
                        <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
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
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
   
            {step === 3 && (
              <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        Condiciones del Crédito
                      </h3>
                      
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-700 uppercase">Plazo / Cuotas</label>
                          <select
                            value={numeroCuotas}
                            onChange={(e) => setNumeroCuotas(Number(e.target.value))}
                            className="w-full px-4 py-2.5 rounded-xl border-slate-200 bg-slate-50 font-medium text-slate-900 focus:ring-2 focus:ring-blue-500/20"
                          >
                            {opcionesCuotasDisponibles.length > 0 ? (
                                opcionesCuotasDisponibles.map(num => (
                                    <option key={num} value={num}>
                                        {num} {frecuenciaPago === 'QUINCENAL' ? 'Quincenas' : 'Cuotas'} ({Math.round(num / (frecuenciaPago === 'QUINCENAL' ? 2 : 1))} Meses)
                                    </option>
                                ))
                            ) : (
                                <option value={0}>Seleccione artículos primero</option>
                            )}
                          </select>
                        </div>
   
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-700 uppercase">Frecuencia de Pago</label>
                          <select
                            value={frecuenciaPago}
                            onChange={(e) => setFrecuenciaPago(e.target.value as FrecuenciaPago)}
                            className="w-full px-4 py-2.5 rounded-xl border-slate-200 bg-slate-50 font-medium text-slate-900 focus:ring-2 focus:ring-blue-500/20"
                          >
                            <option value="QUINCENAL">Quincenal</option>
                            <option value="MENSUAL">Mensual</option>
                          </select>
                        </div>
   
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-700 uppercase">Cuota Inicial</label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                              type="text"
                              inputMode="numeric"
                              value={cuotaInicial ? formatCOPInputValue(String(cuotaInicial)) : ''}
                              onChange={(e) => setCuotaInicial(parseCOPInputToNumber(e.target.value))}
                              className="w-full pl-10 pr-4 py-2.5 rounded-xl border-slate-200 bg-slate-50 font-medium text-slate-900 focus:ring-2 focus:ring-blue-500/20"
                            />
                          </div>
                        </div>
   
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-700 uppercase">Fecha del Crédito</label>
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
   
                  <div className="bg-white p-8 rounded-3xl shadow-[0_20px_50px_rgb(8_112_184_/_7%)] flex flex-col justify-between relative overflow-hidden ring-1 ring-slate-900/5">
                     <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600"></div>
                     
                     <div>
                       <h4 className="text-slate-500 font-bold uppercase tracking-wider text-xs mb-6">Resumen de Financiación</h4>
                       <div className="space-y-4 mb-8">
                         <div className="flex justify-between items-center text-sm">
                           <span className="text-slate-500">Valor Artículos (Base)</span>
                           <span className="font-medium text-slate-900">{formatCurrency(resumenFinanciero.totalBase)}</span>
                         </div>
                         <div className="flex justify-between items-center text-sm text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                           <span className="font-medium">Intereses por Cuotas ({numeroCuotas} pagos)</span>
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
                     </div>
                  </div>
                </div>
              </div>
            )}
   
            {step === 4 && (
              <div className="max-w-3xl mx-auto animate-in zoom-in-95 duration-300">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
                  <div className="p-8 border-b border-slate-100 text-center bg-slate-50/50">
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Confirmar Crédito</h2>
                  </div>
   
                  <div className="p-8 space-y-8">
                    {/* Resumen Principal */}
                    <div className="flex flex-col md:flex-row gap-8 pb-8 border-b border-slate-100">
                      <div className="flex-1 space-y-4">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Cliente</h4>
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-xl border border-slate-200">
                            {(clienteSeleccionado?.nombres || ' ')[0]}
                          </div>
                          <div>
                            <p className="text-lg font-bold text-slate-900">{clienteSeleccionado?.nombres} {clienteSeleccionado?.apellidos}</p>
                            <p className="text-sm text-slate-500 font-medium">{clienteSeleccionado?.dni}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex-1 space-y-4">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Plan Seleccionado</h4>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                           <div className="flex items-baseline gap-2 mb-1">
                              <span className="text-2xl font-black text-slate-900">{formatCurrency(resumenFinanciero.valorCuota)}</span>
                              <span className="text-sm font-bold text-slate-500 lowercase">/ {frecuenciaPago.toLowerCase()}</span>
                           </div>
                           <p className="text-xs font-bold text-blue-600 uppercase">{numeroCuotas} Cuotas en Total</p>
                        </div>
                      </div>
                    </div>

                    {/* Detalles Financieros y Artículos */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-4">
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Artículos ({articulosSeleccionados.length})</h4>
                          <div className="space-y-3">
                             {articulosSeleccionados.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-start text-sm">
                                   <span className="text-slate-700 font-medium">{item.nombre}</span>
                                   <span className="text-slate-900 font-bold">{formatCurrency(item.precioBase)}</span>
                                </div>
                             ))}
                             <div className="pt-3 border-t border-slate-100 flex justify-between items-center font-bold text-slate-900">
                                <span>Total Base</span>
                                <span>{formatCurrency(resumenFinanciero.totalBase)}</span>
                             </div>
                          </div>
                       </div>

                       <div className="space-y-4">
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Detalle del Crédito</h4>
                          <div className="space-y-3 text-sm">
                             <div className="flex justify-between items-center">
                                <span className="text-slate-500">Fecha del Crédito</span>
                                <span className="font-bold text-slate-900">{fechaInicio}</span>
                             </div>
                             <div className="flex justify-between items-center">
                                <span className="text-slate-500">Monto Financiado</span>
                                <span className="font-bold text-slate-900">{formatCurrency(resumenFinanciero.saldoAFinanciar)}</span>
                             </div>
                             <div className="flex justify-between items-center">
                                <span className="text-slate-500">Total a Pagar</span>
                                <span className="font-bold text-emerald-600">{formatCurrency(resumenFinanciero.totalFinanciadoBruto)}</span>
                             </div>
                             <div className="pt-3 border-t border-slate-100 mt-2">
                                <p className="text-xs text-slate-400 leading-relaxed">
                                   Al confirmar, se generará el plan de pagos y se notificará al cliente.
                                </p>
                             </div>
                          </div>
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
   
            <div className="mt-8 flex justify-between items-center pt-8 border-t border-slate-200">
              <button
                onClick={anteriorPaso}
                disabled={step === 1}
                className={`px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors ${step === 1 ? 'opacity-0 pointer-events-none' : ''}`}
              >
                Anterior
              </button>
              
              <button
                onClick={step < 4 ? siguientePaso : confirmarCredito}
                className={`px-8 py-2.5 rounded-xl font-black transition-all shadow-sm flex items-center gap-2 border bg-white ${
                  step < 4 ? 'border-slate-200 text-slate-800 hover:bg-slate-50' : 'border-blue-200 text-[#08557f] hover:bg-blue-50 shadow-blue-100'
                }`}
              >
                {step < 4 ? 'Siguiente' : 'Confirmar y Crear'}
                {step < 4 ? <ArrowLeft className="w-4 h-4 rotate-180" /> : <CheckCircle className="w-4 h-4" />}
              </button>
            </div>
   
          </div>
        </div>
      </div>

      {showNuevoClienteModal && (
        <NuevoClienteModal 
            onClose={() => setShowNuevoClienteModal(false)}
            onClienteCreado={handleClienteCreado}
        />
      )}
    </div>
  );
}
