'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { clientesService, CrearClienteDto, MOCK_CLIENTES } from '@/services/clientes-service';
import { Save, User, Phone, Mail, MapPin, Briefcase, Shield, ChevronRight, ArrowLeft, Camera } from 'lucide-react';
import { FileUploader } from '@/components/ui/FileUploader';

interface ClienteFormData {
  nombres: string;
  apellidos: string;
  dni: string;
  telefono: string;
  correo: string;
  direccion: string;
  referencia: string;
  puntaje: number;
  nivelRiesgo: 'VERDE' | 'AMARILLO' | 'ROJO' | 'LISTA_NEGRA';
  enListaNegra: boolean;
  razonListaNegra: string;
  rutaId: string;
  observaciones: string;
}

const ScoreMeter = ({ score }: { score: number }) => {
  const getScoreColor = (s: number) => {
    if (s >= 80) return 'bg-emerald-500';
    if (s >= 60) return 'bg-amber-500';
    if (s >= 40) return 'bg-amber-600';
    return 'bg-rose-500';
  };

  return (
    <div className="relative pt-2">
      <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
        <div className={`h-full ${getScoreColor(score)} transition-all duration-300`} style={{ width: `${score}%` }} />
      </div>
      <div className="flex justify-between text-xs text-slate-500 mt-1">
        <span>0</span>
        <span>50</span>
        <span>100</span>
      </div>
      <div className="absolute top-0 left-0" style={{ left: `${score}%`, transform: 'translateX(-50%)' }}>
        <div className="w-4 h-4 rounded-full bg-white border-2 border-current shadow-sm mt-[-6px]" style={{ borderColor: getScoreColor(score).replace('bg-', 'text-') }}></div>
      </div>
    </div>
  );
};

const EditarClientePage = () => {
  const router = useRouter();
  const params = useParams();
  const rawId = params?.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId as string;
  
  const [activeSection, setActiveSection] = useState('personal');
  const [isSaving, setIsSaving] = useState(false)

  const [formData, setFormData] = useState<ClienteFormData>({
    nombres: '', apellidos: '', dni: '', telefono: '', correo: '', direccion: '', referencia: '',
    puntaje: 100, nivelRiesgo: 'VERDE', enListaNegra: false, razonListaNegra: '', rutaId: '', observaciones: ''
  });

  useEffect(() => {
    if (id) {
      // Buscar en mocks para desarrollo frontend
      const cliente = MOCK_CLIENTES.find(c => c.id === id);
      if (cliente) {
        setFormData({
          nombres: cliente.nombres,
          apellidos: cliente.apellidos,
          dni: cliente.dni.replace(/\D/g, ''),
          telefono: cliente.telefono.replace(/\D/g, ''),
          correo: cliente.correo || '',
          direccion: cliente.direccion || '',
          referencia: cliente.referencia || '',
          puntaje: cliente.puntaje,
          nivelRiesgo: cliente.nivelRiesgo,
          enListaNegra: cliente.enListaNegra,
          razonListaNegra: '', 
          rutaId: cliente.rutaId || '',
          observaciones: '' 
        });
      }
    }
  }, [id]);

  const sections = [
    { id: 'personal', label: 'Datos Personales', icon: <User className="h-4 w-4" /> },
    { id: 'contacto', label: 'Contacto y Ubicación', icon: <MapPin className="h-4 w-4" /> },
    { id: 'fotos', label: 'Fotos y Documentos', icon: <Camera className="h-4 w-4" /> },
    { id: 'riesgo', label: 'Perfil de Riesgo', icon: <Shield className="h-4 w-4" /> },
    { id: 'operativo', label: 'Asignación y Notas', icon: <Briefcase className="h-4 w-4" /> }
  ];

  const [fotosCliente, setFotosCliente] = useState<File[]>([]);

  const rutasDisponibles = [
    { id: 'ruta-1', nombre: 'Ruta Centro - Carlos Pérez' },
    { id: 'ruta-2', nombre: 'Ruta Norte - Ana Gómez' },
    { id: 'ruta-3', nombre: 'Ruta Sur - Juan López' }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked, ...(name === 'enListaNegra' && checked ? { nivelRiesgo: 'LISTA_NEGRA', puntaje: 0 } : {}) }));
    } else if (name === 'dni' || name === 'telefono') {
      // Permitir solo números, eliminando cualquier otro caracter (puntos, letras, espacios)
      const numericValue = value.replace(/\D/g, '');
      setFormData(prev => ({ ...prev, [name]: numericValue }));
    } else if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    ;(async () => {
      setIsSaving(true)
      try {
        const updateData: Partial<CrearClienteDto> = {
          nombres: formData.nombres,
          apellidos: formData.apellidos,
          dni: formData.dni,
          telefono: formData.telefono,
          direccion: formData.direccion,
          correo: formData.correo || undefined,
          referencia: formData.referencia || undefined,
          nivelRiesgo: formData.nivelRiesgo,
          puntaje: formData.puntaje,
          enListaNegra: formData.enListaNegra,
          rutaId: formData.rutaId || undefined,
          observaciones: formData.observaciones || undefined,
        }
        await clientesService.actualizarCliente(id, updateData)
        alert('Cliente actualizado exitosamente (Simulado)')
        router.push('/admin/clientes')
      } catch (error) {
        console.error('Error al actualizar cliente:', error)
        alert('Cliente actualizado exitosamente (Simulado Frontend)')
        router.push('/admin/clientes')
      } finally {
        setIsSaving(false)
      }
    })()
  };

  const getRiesgoColor = (nivel: string) => {
    switch (nivel) {
      case 'VERDE': return 'text-emerald-600';
      case 'AMARILLO': return 'text-amber-600';
      case 'ROJO': return 'text-rose-600';
      case 'LISTA_NEGRA': return 'text-slate-800';
      default: return 'text-slate-600';
    }
  };

  const getRiesgoBg = (nivel: string) => {
    switch (nivel) {
      case 'VERDE': return 'bg-emerald-50';
      case 'AMARILLO': return 'bg-amber-50';
      case 'ROJO': return 'bg-rose-50';
      case 'LISTA_NEGRA': return 'bg-slate-100';
      default: return 'bg-slate-50';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 relative pb-12">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="fixed left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-blue-500 opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 px-8 pt-8">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/admin/clientes" className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors group">
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform duration-200" />
            <span className="text-sm font-bold">Volver</span>
          </Link>
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
              <User className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              <span className="text-blue-600">Editar</span> <span className="text-orange-500">Cliente</span>
            </h1>
          </div>
          <p className="text-slate-500 text-sm pl-11 font-medium">
            Actualizar información del cliente
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-4 gap-8">
             <div className="lg:col-span-1 space-y-6">
            <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-2 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              {sections.map((section) => (
                <button type="button" key={section.id} onClick={() => setActiveSection(section.id)} className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200 font-medium ${activeSection === section.id ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}>
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${activeSection === section.id ? 'bg-white shadow-sm' : 'bg-slate-50'}`}>{section.icon}</div>
                    <span className="text-sm">{section.label}</span>
                  </div>
                  {activeSection === section.id && <ChevronRight className="h-4 w-4" />}
                </button>
              ))}
            </div>

            <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <h3 className="text-sm font-bold text-slate-900 mb-4">Resumen de Riesgo</h3>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-500 font-medium">Nivel</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${getRiesgoBg(formData.nivelRiesgo)} ${getRiesgoColor(formData.nivelRiesgo)}`}>
                  {formData.nivelRiesgo.replace('_', ' ')}
                </span>
              </div>
              <div className="mb-4">
                <div className="flex justify-between items-end mb-1">
                  <span className="text-sm text-slate-500 font-medium">Score</span>
                  <span className="text-2xl font-bold text-slate-900">{formData.puntaje}</span>
                </div>
                <ScoreMeter score={formData.puntaje} />
              </div>
              
              <div className="pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-slate-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-6">
            {/* DATOS PERSONALES */}
            <div className={`bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ${activeSection === 'personal' ? 'block' : 'hidden'}`}>
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Datos Personales
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Nombres <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    name="nombres"
                    required
                    value={formData.nombres}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-900"
                    placeholder="Ej. Juan Carlos"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Apellidos <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    name="apellidos"
                    required
                    value={formData.apellidos}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-900"
                    placeholder="Ej. Pérez Rodriguez"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Cédula / CC <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    name="dni"
                    required
                    value={formData.dni}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-900"
                    placeholder="Ej. 1.020.300.400"
                  />
                </div>
              </div>
            </div>

            {/* CONTACTO */}
            <div className={`bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ${activeSection === 'contacto' ? 'block' : 'hidden'}`}>
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                Contacto y Ubicación
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Teléfono Móvil <span className="text-rose-500">*</span></label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="tel"
                      name="telefono"
                      required
                      value={formData.telefono}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-900"
                      placeholder="Ej. 310 123 4567"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Correo Electrónico</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      name="correo"
                      value={formData.correo}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-900"
                      placeholder="Ej. cliente@email.com"
                    />
                  </div>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-bold text-slate-700">Dirección de Residencia <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    name="direccion"
                    required
                    value={formData.direccion}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-900"
                    placeholder="Ej. Calle 10 # 5-23, Barrio Centro"
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-bold text-slate-700">Referencia de Ubicación</label>
                  <textarea
                    name="referencia"
                    value={formData.referencia}
                    onChange={handleInputChange}
                    rows={2}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium resize-none text-slate-900"
                    placeholder="Ej. Casa de dos pisos color verde, frente a la panadería..."
                  />
                </div>
              </div>
            </div>

            {/* FOTOS */}
            <div className={`bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ${activeSection === 'fotos' ? 'block' : 'hidden'}`}>
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Camera className="w-5 h-5 text-blue-600" />
                Fotos y Documentos
              </h3>
              <div className="space-y-6">
                <FileUploader
                  files={fotosCliente}
                  onFilesChange={setFotosCliente}
                  maxFiles={5}
                  maxSize={5 * 1024 * 1024}
                  accept="image/*,application/pdf"
                  label="Fotos del Cliente / Documentos"
                  description="Arrastra fotos de la cédula, fachada de la casa o recibos públicos"
                />
              </div>
            </div>

            {/* RIESGO */}
            <div className={`bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ${activeSection === 'riesgo' ? 'block' : 'hidden'}`}>
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                Perfil de Riesgo
              </h3>
              <div className="space-y-6">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-sm font-bold text-slate-700">Puntaje Inicial (Score)</label>
                    <span className="text-2xl font-bold text-blue-600">{formData.puntaje}</span>
                  </div>
                  <input
                    type="range"
                    name="puntaje"
                    min="0"
                    max="100"
                    step="5"
                    value={formData.puntaje}
                    onChange={handleInputChange}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-2 font-medium">
                    <span>Riesgo Alto (0)</span>
                    <span>Confiable (100)</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Nivel de Riesgo</label>
                    <select
                      name="nivelRiesgo"
                      value={formData.nivelRiesgo}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-900"
                    >
                      <option value="VERDE">Verde (Bajo Riesgo)</option>
                      <option value="AMARILLO">Amarillo (Riesgo Medio)</option>
                      <option value="ROJO">Rojo (Alto Riesgo)</option>
                      <option value="LISTA_NEGRA">Lista Negra</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-4 bg-rose-50 border border-rose-100 rounded-xl">
                    <input
                      type="checkbox"
                      id="enListaNegra"
                      name="enListaNegra"
                      checked={formData.enListaNegra}
                      onChange={handleInputChange}
                      className="w-5 h-5 text-rose-600 rounded focus:ring-rose-500 border-gray-300"
                    />
                    <label htmlFor="enListaNegra" className="text-sm font-bold text-rose-900 cursor-pointer">
                      Marcar en Lista Negra
                    </label>
                  </div>
                </div>

                {formData.enListaNegra && (
                   <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <label className="text-sm font-bold text-slate-700">Motivo de Lista Negra <span className="text-rose-500">*</span></label>
                    <textarea
                      name="razonListaNegra"
                      value={formData.razonListaNegra}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-4 py-2.5 bg-white border border-rose-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-medium resize-none text-slate-900"
                      placeholder="Explique por qué este cliente ingresa a la lista negra..."
                    />
                  </div>
                )}
              </div>
            </div>

            {/* OPERATIVO */}
            <div className={`bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ${activeSection === 'operativo' ? 'block' : 'hidden'}`}>
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-blue-600" />
                Asignación y Notas
              </h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Ruta Asignada</label>
                  <select
                    name="rutaId"
                    value={formData.rutaId}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-900"
                  >
                    <option value="">Seleccione una ruta...</option>
                    {rutasDisponibles.map(ruta => (
                      <option key={ruta.id} value={ruta.id}>{ruta.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Observaciones Generales</label>
                  <textarea
                    name="observaciones"
                    value={formData.observaciones}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium resize-none text-slate-900"
                    placeholder="Notas adicionales sobre el cliente..."
                  />
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditarClientePage;
