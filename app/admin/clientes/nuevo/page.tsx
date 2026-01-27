'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { clientesService, CrearClienteDto } from '@/services/clientes-service';
import { Save, User, Phone, Mail, MapPin, Briefcase, Shield, AlertCircle, ChevronRight, ArrowLeft, Camera } from 'lucide-react';
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

const ClienteFormPage = () => {
  const router = useRouter();
  const [isEditMode] = useState(false);
  const [activeSection, setActiveSection] = useState('personal');

  const [isSaving, setIsSaving] = useState(false)

  const [formData, setFormData] = useState<ClienteFormData>({
    nombres: '', apellidos: '', dni: '', telefono: '', correo: '', direccion: '', referencia: '',
    puntaje: 100, nivelRiesgo: 'VERDE', enListaNegra: false, razonListaNegra: '', rutaId: '', observaciones: ''
  });

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

    if (isEditMode) {
      alert('Funcionalidad de edición pendiente');
      // TODO: Implementar actualización
    } else {
      ;(async () => {
        setIsSaving(true)
        try {
          const nuevoCliente: CrearClienteDto = {
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
          await clientesService.crearCliente(nuevoCliente)
          alert('Cliente creado exitosamente')
          router.push('/admin/clientes')
        } catch (error) {
          console.error('Error al crear cliente:', error)
          alert('Error al crear el cliente. Verifique los datos.')
        } finally {
          setIsSaving(false)
        }
      })()
    }
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
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Volver</span>
          </button>
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
              <User className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              <span className="text-blue-600">{isEditMode ? 'Editar' : 'Nuevo'}</span> <span className="text-orange-500">Cliente</span>
            </h1>
          </div>
          <p className="text-slate-500 text-sm pl-11 font-medium">
            {isEditMode ? 'Actualizar información del cliente' : 'Registrar un nuevo cliente en el sistema'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-2 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              {sections.map((section) => (
                <button key={section.id} onClick={() => setActiveSection(section.id)} className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200 font-medium ${activeSection === section.id ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}>
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
                  <span className="text-xs text-slate-500 font-medium">Puntaje</span>
                  <span className="text-lg font-bold text-slate-900">{formData.puntaje}/100</span>
                </div>
                <ScoreMeter score={formData.puntaje} />
              </div>
              {formData.enListaNegra && (
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-100">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-4 w-4 text-rose-600 mt-0.5" />
                    <div className="text-xs text-rose-700">
                      <span className="font-bold block mb-1">En Lista Negra</span>
                      Cliente marcado como no apto para créditos.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-3">
            <form onSubmit={handleSubmit} className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
              {activeSection === 'personal' && (
                <div className="p-8 space-y-6">
                  <div className="flex items-center space-x-3 border-b border-slate-100 pb-4 mb-6">
                    <div className="p-2 bg-slate-100 rounded-lg"><User className="h-5 w-5 text-slate-500" /></div>
                    <h2 className="text-lg font-bold text-slate-900">Datos Personales</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Nombres <span className="text-rose-500">*</span></label>
                      <input type="text" name="nombres" value={formData.nombres} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 transition-all font-medium text-slate-900 placeholder:text-slate-400" placeholder="Ej. Juan Carlos" required />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Apellidos <span className="text-rose-500">*</span></label>
                      <input type="text" name="apellidos" value={formData.apellidos} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 transition-all font-medium text-slate-900 placeholder:text-slate-400" placeholder="Ej. Pérez Rodriguez" required />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Cédula / CC <span className="text-rose-500">*</span></label>
                      <div className="relative">
                        <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input type="text" name="dni" value={formData.dni} onChange={handleInputChange} className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 transition-all font-medium text-slate-900 placeholder:text-slate-400" placeholder="1.020.345.678" required />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'contacto' && (
                <div className="p-8 space-y-6">
                  <div className="flex items-center space-x-3 border-b border-slate-100 pb-4 mb-6">
                    <div className="p-2 bg-slate-100 rounded-lg"><MapPin className="h-5 w-5 text-slate-500" /></div>
                    <h2 className="text-lg font-bold text-slate-900">Contacto y Ubicación</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Teléfono Principal <span className="text-rose-500">*</span></label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input type="tel" name="telefono" value={formData.telefono} onChange={handleInputChange} className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 transition-all font-medium text-slate-900 placeholder:text-slate-400" placeholder="310 123 4567" required />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Correo Electrónico</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input type="email" name="correo" value={formData.correo} onChange={handleInputChange} className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 transition-all font-medium text-slate-900 placeholder:text-slate-400" placeholder="cliente@ejemplo.com" />
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-slate-700 mb-2">Dirección Exacta <span className="text-rose-500">*</span></label>
                      <textarea name="direccion" value={formData.direccion} onChange={handleInputChange} rows={3} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 transition-all resize-none font-medium text-slate-900 placeholder:text-slate-400" placeholder="Calle, número de casa, sector, parroquia..." required />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-slate-700 mb-2">Punto de Referencia</label>
                      <input type="text" name="referencia" value={formData.referencia} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 transition-all font-medium text-slate-900 placeholder:text-slate-400" placeholder="Ej. Frente a la panadería, casa de rejas azules..." />
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'fotos' && (
                <div className="p-8 space-y-6">
                  <div className="flex items-center space-x-3 border-b border-slate-100 pb-4 mb-6">
                    <div className="p-2 bg-slate-100 rounded-lg"><Camera className="h-5 w-5 text-slate-500" /></div>
                    <h2 className="text-lg font-bold text-slate-900">Fotos y Documentos</h2>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-bold text-slate-700 mb-2">Documentos de Identidad y Fotos del Cliente</h3>
                      <p className="text-sm text-slate-500 mb-4 font-medium">Sube fotos del documento de identidad (frente y reverso) y fotos del cliente.</p>
                      <FileUploader files={fotosCliente} onFilesChange={(newFiles) => setFotosCliente(newFiles)} label="Arrastra fotos del cliente o documentos aquí" description="Soporta JPG, PNG, PDF (Máx. 5MB)" multiple={true} maxSize={5 * 1024 * 1024} accept="image/*,application/pdf" />
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'riesgo' && (
                <div className="p-8 space-y-6">
                  <div className="flex items-center space-x-3 border-b border-slate-100 pb-4 mb-6">
                    <div className="p-2 bg-slate-100 rounded-lg"><Shield className="h-5 w-5 text-slate-500" /></div>
                    <h2 className="text-lg font-bold text-slate-900">Perfil de Riesgo</h2>
                  </div>
                  <div className="grid grid-cols-1 gap-6">
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <div className="flex items-start space-x-3">
                        <div className="flex items-center h-5">
                          <input id="enListaNegra" name="enListaNegra" type="checkbox" checked={formData.enListaNegra} onChange={handleInputChange} className="focus:ring-rose-500 h-4 w-4 text-rose-600 border-slate-300 rounded" />
                        </div>
                        <div className="ml-3 text-sm">
                          <label htmlFor="enListaNegra" className="font-bold text-slate-900">Marcar en Lista Negra</label>
                          <p className="text-slate-500 font-medium">El cliente no podrá solicitar nuevos préstamos mientras esté en lista negra.</p>
                        </div>
                      </div>
                    </div>
                    {formData.enListaNegra && (
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Razón de Lista Negra <span className="text-rose-500">*</span></label>
                        <textarea name="razonListaNegra" value={formData.razonListaNegra} onChange={handleInputChange} rows={3} className="w-full px-4 py-2.5 bg-white border border-rose-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-medium text-slate-900 placeholder:text-slate-400" placeholder="Explique el motivo por el cual el cliente está en lista negra..." required={formData.enListaNegra} />
                      </div>
                    )}
                    {!formData.enListaNegra && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Puntaje Inicial (Score)</label>
                          <input type="number" name="puntaje" min="0" max="100" value={formData.puntaje} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 transition-all font-medium text-slate-900" />
                          <p className="mt-1 text-xs text-slate-500 font-medium">Valor entre 0 y 100</p>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Nivel de Riesgo Manual</label>
                          <select name="nivelRiesgo" value={formData.nivelRiesgo} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 transition-all font-medium text-slate-900">
                            <option value="VERDE">Verde (Bajo Riesgo)</option>
                            <option value="AMARILLO">Amarillo (Riesgo Medio)</option>
                            <option value="ROJO">Rojo (Alto Riesgo)</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeSection === 'operativo' && (
                <div className="p-8 space-y-6">
                  <div className="flex items-center space-x-3 border-b border-slate-100 pb-4 mb-6">
                    <div className="p-2 bg-slate-100 rounded-lg"><Briefcase className="h-5 w-5 text-slate-500" /></div>
                    <h2 className="text-lg font-bold text-slate-900">Asignación y Notas</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Asignar Ruta</label>
                      <select name="rutaId" value={formData.rutaId} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 transition-all font-medium text-slate-900">
                        <option value="">Seleccionar Ruta...</option>
                        {rutasDisponibles.map(ruta => (<option key={ruta.id} value={ruta.id}>{ruta.nombre}</option>))}
                      </select>
                      <p className="mt-1 text-xs text-slate-500 font-medium">El cliente será visitado por el cobrador asignado a esta ruta.</p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-slate-700 mb-2">Observaciones Generales</label>
                      <textarea name="observaciones" value={formData.observaciones} onChange={handleInputChange} rows={4} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 transition-all resize-none font-medium text-slate-900 placeholder:text-slate-400" placeholder="Notas adicionales sobre el cliente, horarios de visita preferidos, etc." />
                    </div>
                  </div>
                </div>
              )}

              <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-200 flex justify-end space-x-3">
                <Link href="/admin/clientes" className="px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors text-sm font-medium">Cancelar</Link>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm font-bold shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? 'Guardando...' : (isEditMode ? 'Guardar Cambios' : 'Crear Cliente')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClienteFormPage;