'use client';

import React, { useState, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  ArrowLeft, Package, CheckCircle2, Search,
  Plus, Trash2, Calendar, DollarSign, ShoppingBag
} from 'lucide-react';
import { useNotification } from '@/components/providers/NotificationProvider';
import { formatCOPInputValue, formatCurrency, parseCOPInputToNumber, cn } from '@/lib/utils';

import { clientesService, Cliente } from '@/services/clientes-service';
import NuevoClienteModal from '@/components/clientes/NuevoClienteModal';

// --- Tipos y Servicios ---
import { articulosService, Articulo } from '@/services/articulos-service';
import { prestamosService } from '@/services/prestamos-service';
import { obtenerPerfil } from '@/services/autenticacion-service';
import { TipoAmortizacion } from '@/types/enums';

type FrecuenciaPago = 'DIARIO' | 'SEMANAL' | 'QUINCENAL' | 'MENSUAL';

interface ArticuloSeleccionado extends Articulo {
    cantidad: number;
    precioUnitarioCredito: number;
}

interface CreacionCreditoArticuloProps {
  isModal?: boolean;
  onClose?: () => void;
  onSuccess?: (data?: any) => void;
}

export default function CreacionCreditoArticulo({ 
  isModal = false, 
  onClose, 
  onSuccess 
}: CreacionCreditoArticuloProps) {
  const { showNotification } = useNotification();
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
  const [listaClientes, setListaClientes] = useState<Cliente[]>([]);
  const [listaArticulos, setListaArticulos] = useState<Articulo[]>([]);
  const [loadingDatos, setLoadingDatos] = useState(true);

  // Cargar datos iniciales
  React.useEffect(() => {
    const cargar = async () => {
      try {
        const [clientes, articulos] = await Promise.all([
          clientesService.obtenerTodos(),
          articulosService.obtenerArticulos()
        ]);
        setListaClientes(clientes);
        setListaArticulos(articulos);
      } catch (error) {
        console.error("Error cargando datos", error);
        showNotification('error', 'Error al cargar clientes o artículos');
      } finally {
        setLoadingDatos(false);
      }
    };
    cargar();
  }, []);

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
    const cats = new Set(listaArticulos.map(p => p.categoria));
    return ['TODAS', ...Array.from(cats)];
  }, [listaArticulos]);

  const productosFiltrados = useMemo(() => {
    const filtrados = listaArticulos.filter(p => {
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
  }, [busquedaProducto, filtroCategoria, ordenPrecio, listaArticulos]);

  // Opciones de plazos (meses) disponibles
  const opcionesMesesDisponibles = useMemo(() => {
    if (articulosSeleccionados.length === 0) return [];
    let comunes = articulosSeleccionados[0].opcionesCuotas.map(o => o.numeroCuotas);
    for (let i = 1; i < articulosSeleccionados.length; i++) {
        const opcionesArticulo = articulosSeleccionados[i].opcionesCuotas.map(o => o.numeroCuotas);
        comunes = comunes.filter(c => opcionesArticulo.includes(c));
    }
    return comunes
      .filter(c => typeof c === 'number' && !isNaN(c) && c >= 1) // Filtramos meses >= 1
      .sort((a, b) => a - b);
  }, [articulosSeleccionados]);

  // Efecto para ajustar meses cuando cambian las opciones disponibles
  React.useEffect(() => {
    if (opcionesMesesDisponibles.length > 0) {
      if (!opcionesMesesDisponibles.includes(numeroCuotas)) {
        setNumeroCuotas(opcionesMesesDisponibles[0]);
      }
    }
  }, [opcionesMesesDisponibles, numeroCuotas]);

  const resumenFinanciero = useMemo(() => {
    const totalBase = articulosSeleccionados.reduce((sum, item) => sum + (item.precioBase * item.cantidad), 0);
    
    // totalFinanciadoBruto se basa en el precioTotal guardado en DB para ese número de MESES
    const totalFinanciadoBruto = articulosSeleccionados.reduce((sum, item) => {
      // El backend guarda 'meses' en numeroCuotas
      const opcion = item.opcionesCuotas.find(o => o.numeroCuotas === numeroCuotas);
      const precioItemTotal = opcion ? opcion.precioTotal : (item.opcionesCuotas[0]?.precioTotal || item.precioBase); 
      return sum + (precioItemTotal * item.cantidad);
    }, 0);

    const saldoAFinanciar = totalFinanciadoBruto - cuotaInicial;
    
    // El número de cuotas reales depende de la frecuencia elegida
    let factorFrecuencia = 1; // Mensual por defecto
    if (frecuenciaPago === 'DIARIO') factorFrecuencia = 30;
    else if (frecuenciaPago === 'SEMANAL') factorFrecuencia = 4;
    else if (frecuenciaPago === 'QUINCENAL') factorFrecuencia = 2;

    const cuotasTotales = Math.ceil(numeroCuotas * factorFrecuencia);
    const valorCuotaTotal = cuotasTotales > 0 ? Math.ceil(saldoAFinanciar / cuotasTotales) : 0;

    return {
      totalBase,
      totalFinanciadoBruto,
      saldoAFinanciar,
      valorCuota: valorCuotaTotal,
      numeroCuotas: cuotasTotales, // Cuotas reales
      meses: numeroCuotas // Meses de la DB
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

  const confirmarCredito = async () => {
    if (!clienteSeleccionado) return alert('Seleccione un cliente');
    if (articulosSeleccionados.length === 0) return alert('Seleccione al menos un artículo');

    try {
      setLoadingDatos(true);
      
      // Intentar obtener el perfil del usuario actual
      let creadorId = '';
      try {
        const userData = localStorage.getItem('user');
        if (userData) {
          creadorId = JSON.parse(userData).id;
        } else {
          const perfil = await obtenerPerfil();
          creadorId = perfil.id;
        }
      } catch (err) {
        console.error('Error al obtener usuario creador:', err);
      }

      // El backend actual soporta un producto por préstamo. 
      // Tomamos el primero de la lista para la creación formal.
      const articulo = articulosSeleccionados[0];
      // FIX: El PrecioProducto en DB no tiene frecuenciaPago, solo meses
      const opcionPlan = articulo.opcionesCuotas.find(o => o.numeroCuotas === numeroCuotas);
      
      const payload = {
        clienteId: clienteId,
        tipoPrestamo: 'ARTICULO',
        productoId: articulo.id,
        precioProductoId: opcionPlan?.id,
        monto: resumenFinanciero.totalFinanciadoBruto,
        tasaInteres: 0, // El interés ya viene en el precio del plan
        tasaInteresMora: 2.0,
        plazoMeses: numeroCuotas, // FIX: El plazo en meses es directamente numeroCuotas
        cantidadCuotas: resumenFinanciero.numeroCuotas, // Enviamos las cuotas calculadas
        frecuenciaPago: frecuenciaPago,
        fechaInicio: fechaInicio,
        creadoPorId: creadorId,
        cuotaInicial: cuotaInicial,
        notas: `Crédito de artículo: ${articulosSeleccionados.map(a => `${a.nombre} (x${a.cantidad})`).join(', ')}`,
        tipoAmortizacion: TipoAmortizacion.INTERES_SIMPLE
      };

      await prestamosService.crearPrestamo(payload as any);

      showNotification('success', 'El crédito de artículo ha sido registrado exitosamente.', 'Solicitud Exitosa');
      
      if (onSuccess) {
        onSuccess(payload);
        return;
      }

      router.push('/admin/prestamos');
    } catch (error: any) {
      console.error('Error al crear crédito de artículo:', error);
      showNotification('error', error.message || 'No se pudo crear el crédito. Verifique los datos.');
    } finally {
      setLoadingDatos(false);
    }
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
      <div className={cn("relative z-10", isModal ? "pt-0" : "px-8 pt-8")}>
        {/* Header */}
        <div className={cn("mb-8 flex items-center justify-between", isModal && "hidden")}>
          <button
            onClick={() => onClose ? onClose() : router.back()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Volver</span>
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

        {!isModal && (
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
        )}
      </div>

      <div className={cn("w-full", !isModal && "px-8")}>
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
                                <CheckCircle2 className="w-4 h-4" />
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
                        <div className="buscador-3d">
                          <Search className="icon w-4 h-4" />
                          <input 
                            type="text"
                            placeholder="Buscar artículos..."
                            value={busquedaProducto}
                            onChange={(e) => setBusquedaProducto(e.target.value)}
                            className="buscador-3d-input"
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
                          <label className="text-xs font-bold text-slate-700 uppercase">Plazo (Meses)</label>
                          <select
                            value={numeroCuotas}
                            onChange={(e) => setNumeroCuotas(Number(e.target.value))}
                            className="w-full px-4 py-2.5 rounded-xl border-slate-200 bg-slate-50 font-medium text-slate-900 focus:ring-2 focus:ring-blue-500/20"
                          >
                            {opcionesMesesDisponibles.length > 0 ? (
                                opcionesMesesDisponibles.map(m => (
                                    <option key={m} value={m}>
                                        {m} {m === 1 ? 'Mes' : 'Meses'}
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
                           <span className="font-medium">Intereses por Cuotas ({resumenFinanciero.numeroCuotas} pagos)</span>
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
                      <CheckCircle2 className="w-8 h-8" />
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
                {step < 4 ? <ArrowLeft className="w-4 h-4 rotate-180" /> : <CheckCircle2 className="w-4 h-4" />}
              </button>
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
