'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  MapPin,
  Save,
  ArrowLeft,
  Route,
  User,
  CheckCircle2
} from 'lucide-react';

interface RutaFormData {
  nombre: string;
  codigo: string;
  cobradorId: string;
  supervisorId: string;
  frecuenciaVisita: 'DIARIO' | 'SEMANAL' | 'QUINCENAL';
  estado: 'ACTIVA' | 'INACTIVA';
  descripcion: string;
}

const EditarRutaPage = () => {
  const router = useRouter();
  const params = useParams();
  const id = params?.id ? decodeURIComponent(params.id as string) : '';
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<RutaFormData>({
    nombre: '',
    codigo: '',
    cobradorId: '',
    supervisorId: '',
    frecuenciaVisita: 'DIARIO',
    estado: 'ACTIVA',
    descripcion: ''
  });

  // Mock data for selects
  const cobradores = [
    { id: 'CB-001', nombre: 'Carlos Pérez' },
    { id: 'CB-002', nombre: 'María Rodríguez' },
    { id: 'CB-003', nombre: 'Pedro Gómez' }
  ];

  const supervisores = [
    { id: 'SP-001', nombre: 'Ana López' },
    { id: 'SP-002', nombre: 'Luis Fernández' }
  ];

  // Simular carga de datos
  useEffect(() => {
    // En una implementación real, aquí se haría un fetch al API
    // const fetchRuta = async () => { ... }
    
    // Simulamos datos basados en el ID
    if (id) {
      setFormData({
        nombre: 'Ruta Centro - Comercial',
        codigo: 'RT-CEN-01',
        cobradorId: 'CB-001',
        supervisorId: 'SP-001',
        frecuenciaVisita: 'DIARIO',
        estado: 'ACTIVA',
        descripcion: 'Zona comercial del centro de la ciudad. Alta densidad de negocios.'
      });
    }
  }, [id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simular petición API
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Aquí iría la lógica real de actualización
    console.log('Actualizando ruta:', formData);

    setLoading(false);
    router.push('/admin/rutas');
  };

  return (
    <div className="min-h-screen bg-slate-50 relative">
      {/* Fondo arquitectónico */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-blue-500/20 opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 px-6 md:px-8 py-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-4">
            <Link 
              href="/admin/rutas"
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-900"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 text-xs text-orange-700 tracking-wide font-bold border border-orange-100 mb-2">
                <Route className="h-3.5 w-3.5" />
                <span>Gestión de Territorios</span>
              </div>
              <h1 className="text-3xl font-bold text-slate-900">
                <span className="text-blue-600">Editar</span> <span className="text-orange-500">Ruta</span>
              </h1>
              <p className="text-sm text-slate-500 font-medium">Actualice la información de la zona {id}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/rutas"
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-all text-sm font-bold shadow-sm"
            >
              Cancelar
            </Link>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>Actualizar Ruta</span>
            </button>
          </div>
        </div>

        {/* Formulario */}
        <div className="w-full">
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
            <div className="p-8">
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Sección 1: Información General */}
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                      <MapPin className="h-5 w-5" />
                    </div>
                    Información General
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Nombre de la Ruta</label>
                      <input
                        type="text"
                        name="nombre"
                        value={formData.nombre}
                        onChange={handleInputChange}
                        placeholder="Ej: Ruta Centro - Comercial"
                        className="w-full px-4 py-2.5 rounded-xl border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium text-slate-900"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Código Identificador</label>
                      <input
                        type="text"
                        name="codigo"
                        value={formData.codigo}
                        onChange={handleInputChange}
                        placeholder="Ej: RT-CEN-01"
                        className="w-full px-4 py-2.5 rounded-xl border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium text-slate-900"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Estado</label>
                      <select
                        name="estado"
                        value={formData.estado}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 rounded-xl border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium text-slate-900 appearance-none"
                      >
                        <option value="ACTIVA">Activa</option>
                        <option value="INACTIVA">Inactiva</option>
                      </select>
                    </div>

                    <div className="col-span-full space-y-2">
                      <label className="text-sm font-bold text-slate-700">Descripción</label>
                      <textarea
                        name="descripcion"
                        value={formData.descripcion}
                        onChange={handleInputChange}
                        rows={3}
                        placeholder="Detalles sobre la zona de cobertura..."
                        className="w-full px-4 py-2.5 rounded-xl border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium text-slate-900 resize-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="h-px bg-slate-100" />

                {/* Sección 2: Personal y Operación */}
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
                      <User className="h-5 w-5" />
                    </div>
                    Personal y Operación
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Cobrador Asignado</label>
                      <div className="relative">
                        <select
                          name="cobradorId"
                          value={formData.cobradorId}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2.5 rounded-xl border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium text-slate-900 appearance-none"
                          required
                        >
                          <option value="">Seleccione un cobrador</option>
                          {cobradores.map(c => (
                            <option key={c.id} value={c.id}>{c.nombre}</option>
                          ))}
                        </select>
                        <User className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Supervisor</label>
                      <div className="relative">
                        <select
                          name="supervisorId"
                          value={formData.supervisorId}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2.5 rounded-xl border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium text-slate-900 appearance-none"
                          required
                        >
                          <option value="">Seleccione un supervisor</option>
                          {supervisores.map(s => (
                            <option key={s.id} value={s.id}>{s.nombre}</option>
                          ))}
                        </select>
                        <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Frecuencia de Visita</label>
                      <select
                        name="frecuenciaVisita"
                        value={formData.frecuenciaVisita}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 rounded-xl border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium text-slate-900 appearance-none"
                      >
                        <option value="DIARIO">Diario</option>
                        <option value="SEMANAL">Semanal</option>
                        <option value="QUINCENAL">Quincenal</option>
                      </select>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditarRutaPage;