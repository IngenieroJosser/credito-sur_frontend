'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Save,
  User,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  Shield,
  AlertCircle,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';

// Tipos alineados con Prisma Schema
interface ClienteFormData {
  // Datos personales
  nombres: string;
  apellidos: string;
  dni: string;
  
  // Contacto
  telefono: string;
  correo: string;
  direccion: string;
  referencia: string;
  
  // Financiero / Riesgo
  puntaje: number; // 0-100
  nivelRiesgo: 'VERDE' | 'AMARILLO' | 'ROJO' | 'LISTA_NEGRA';
  enListaNegra: boolean;
  razonListaNegra: string;
  
  // Operativo
  rutaId: string; // Para asignación inicial
  observaciones: string;
}

const ScoreMeter = ({ score }: { score: number }) => {
  const getScoreColor = (s: number) => {
    if (s >= 80) return 'bg-green-500';
    if (s >= 60) return 'bg-yellow-500';
    if (s >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="relative pt-2">
      <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={`h-full ${getScoreColor(score)} transition-all duration-300`}
          style={{ width: `${score}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>0</span>
        <span>50</span>
        <span>100</span>
      </div>
      <div className="absolute top-0 left-0" style={{ left: `${score}%`, transform: 'translateX(-50%)' }}>
        <div className="w-4 h-4 rounded-full bg-white border-2 border-current shadow-sm mt-[-6px]"
             style={{ borderColor: getScoreColor(score).replace('bg-', 'text-') }}>
        </div>
      </div>
    </div>
  );
};

const ClienteFormPage = () => {
  const router = useRouter();
  const [isEditMode] = useState(false); // Podría venir de props/params
  const [activeSection, setActiveSection] = useState('personal');
  const [formData, setFormData] = useState<ClienteFormData>({
    nombres: '',
    apellidos: '',
    dni: '',
    telefono: '',
    correo: '',
    direccion: '',
    referencia: '',
    puntaje: 100, // Empieza con buen score
    nivelRiesgo: 'VERDE',
    enListaNegra: false,
    razonListaNegra: '',
    rutaId: '',
    observaciones: ''
  });

  const sections = [
    { id: 'personal', label: 'Datos Personales', icon: <User className="h-4 w-4" /> },
    { id: 'contacto', label: 'Contacto y Ubicación', icon: <MapPin className="h-4 w-4" /> },
    { id: 'riesgo', label: 'Perfil de Riesgo', icon: <Shield className="h-4 w-4" /> },
    { id: 'operativo', label: 'Asignación y Notas', icon: <Briefcase className="h-4 w-4" /> }
  ];

  // Mock de rutas disponibles
  const rutasDisponibles = [
    { id: 'ruta-1', nombre: 'Ruta Centro - Carlos Pérez' },
    { id: 'ruta-2', nombre: 'Ruta Norte - Ana Gómez' },
    { id: 'ruta-3', nombre: 'Ruta Sur - Juan López' }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ 
        ...prev, 
        [name]: checked,
        // Auto-asignar riesgo si se marca lista negra
        ...(name === 'enListaNegra' && checked ? { nivelRiesgo: 'LISTA_NEGRA', puntaje: 0 } : {})
      }));
    } else if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Formulario enviado:', formData);
    // Aquí iría la llamada a la API
    alert(isEditMode ? 'Cliente actualizado' : 'Cliente creado exitosamente');
    router.push('/admin/clientes');
  };

  const getRiesgoColor = (nivel: string) => {
    switch (nivel) {
      case 'VERDE': return 'text-green-600';
      case 'AMARILLO': return 'text-yellow-600';
      case 'ROJO': return 'text-red-600';
      case 'LISTA_NEGRA': return 'text-gray-800';
      default: return 'text-gray-600';
    }
  };

  const getRiesgoBg = (nivel: string) => {
    switch (nivel) {
      case 'VERDE': return 'bg-green-100';
      case 'AMARILLO': return 'bg-yellow-100';
      case 'ROJO': return 'bg-red-100';
      case 'LISTA_NEGRA': return 'bg-gray-200';
      default: return 'bg-gray-100';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b border-gray-200/50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link 
                href="/admin/clientes"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">
                    {isEditMode ? 'Editar Cliente' : 'Nuevo Cliente'}
                  </h1>
                  <p className="text-sm text-gray-500">
                    {isEditMode ? 'Actualizar información del cliente' : 'Registrar un nuevo cliente en el sistema'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Link
                href="/admin/clientes"
                className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium"
              >
                Cancelar
              </Link>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm font-medium flex items-center space-x-2 shadow-sm hover:shadow-md"
              >
                <Save className="h-4 w-4" />
                <span>{isEditMode ? 'Actualizar Cliente' : 'Guardar Cliente'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Navegación lateral */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white border border-gray-200 rounded-xl p-2 shadow-sm">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg transition-all duration-200 ${
                    activeSection === section.id
                      ? 'bg-primary/5 text-primary font-medium'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${
                      activeSection === section.id ? 'bg-primary/10' : 'bg-gray-100'
                    }`}>
                      {section.icon}
                    </div>
                    <span className="text-sm">{section.label}</span>
                  </div>
                  {activeSection === section.id && (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              ))}
            </div>

            {/* Resumen de Riesgo */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Resumen de Riesgo</h3>
              
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Nivel</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getRiesgoBg(formData.nivelRiesgo)} ${getRiesgoColor(formData.nivelRiesgo)}`}>
                  {formData.nivelRiesgo.replace('_', ' ')}
                </span>
              </div>
              
              <div className="mb-4">
                <div className="flex justify-between items-end mb-1">
                  <span className="text-xs text-gray-500">Puntaje</span>
                  <span className="text-lg font-semibold text-gray-900">{formData.puntaje}/100</span>
                </div>
                <ScoreMeter score={formData.puntaje} />
              </div>

              {formData.enListaNegra && (
                <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                    <div className="text-xs text-red-700">
                      <span className="font-semibold block mb-1">En Lista Negra</span>
                      Cliente marcado como no apto para créditos.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Formulario */}
          <div className="lg:col-span-3">
            <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              {/* Sección Personal */}
              {activeSection === 'personal' && (
                <div className="p-6 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="flex items-center space-x-2 border-b border-gray-100 pb-4 mb-6">
                    <User className="h-5 w-5 text-gray-400" />
                    <h2 className="text-lg font-medium text-gray-900">Datos Personales</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nombres <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="nombres"
                        value={formData.nombres}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        placeholder="Ej. Juan Carlos"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Apellidos <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="apellidos"
                        value={formData.apellidos}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        placeholder="Ej. Pérez Rodriguez"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        DNI / Cédula <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          name="dni"
                          value={formData.dni}
                          onChange={handleInputChange}
                          className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                          placeholder="V-12345678"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sección Contacto */}
              {activeSection === 'contacto' && (
                <div className="p-6 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="flex items-center space-x-2 border-b border-gray-100 pb-4 mb-6">
                    <MapPin className="h-5 w-5 text-gray-400" />
                    <h2 className="text-lg font-medium text-gray-900">Contacto y Ubicación</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Teléfono Principal <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="tel"
                          name="telefono"
                          value={formData.telefono}
                          onChange={handleInputChange}
                          className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                          placeholder="+58 412 123 4567"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Correo Electrónico
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="email"
                          name="correo"
                          value={formData.correo}
                          onChange={handleInputChange}
                          className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                          placeholder="cliente@ejemplo.com"
                        />
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Dirección Exacta <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        name="direccion"
                        value={formData.direccion}
                        onChange={handleInputChange}
                        rows={3}
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                        placeholder="Calle, número de casa, sector, parroquia..."
                        required
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Punto de Referencia
                      </label>
                      <input
                        type="text"
                        name="referencia"
                        value={formData.referencia}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        placeholder="Ej. Frente a la panadería, casa de rejas azules..."
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Sección Riesgo */}
              {activeSection === 'riesgo' && (
                <div className="p-6 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="flex items-center space-x-2 border-b border-gray-100 pb-4 mb-6">
                    <Shield className="h-5 w-5 text-gray-400" />
                    <h2 className="text-lg font-medium text-gray-900">Perfil de Riesgo</h2>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <div className="flex items-start space-x-3">
                        <div className="flex items-center h-5">
                          <input
                            id="enListaNegra"
                            name="enListaNegra"
                            type="checkbox"
                            checked={formData.enListaNegra}
                            onChange={handleInputChange}
                            className="focus:ring-red-500 h-4 w-4 text-red-600 border-gray-300 rounded"
                          />
                        </div>
                        <div className="ml-3 text-sm">
                          <label htmlFor="enListaNegra" className="font-medium text-gray-900">
                            Marcar en Lista Negra
                          </label>
                          <p className="text-gray-500">
                            El cliente no podrá solicitar nuevos préstamos mientras esté en lista negra.
                          </p>
                        </div>
                      </div>
                    </div>

                    {formData.enListaNegra && (
                      <div className="animate-in fade-in slide-in-from-top-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Razón de Lista Negra <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          name="razonListaNegra"
                          value={formData.razonListaNegra}
                          onChange={handleInputChange}
                          rows={3}
                          className="w-full px-4 py-2 bg-white border border-red-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                          placeholder="Explique el motivo por el cual el cliente está en lista negra..."
                          required={formData.enListaNegra}
                        />
                      </div>
                    )}

                    {!formData.enListaNegra && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Puntaje Inicial (Score)
                          </label>
                          <input
                            type="number"
                            name="puntaje"
                            min="0"
                            max="100"
                            value={formData.puntaje}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                          />
                          <p className="mt-1 text-xs text-gray-500">Valor entre 0 y 100</p>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Nivel de Riesgo Manual
                          </label>
                          <select
                            name="nivelRiesgo"
                            value={formData.nivelRiesgo}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                          >
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

              {/* Sección Operativo */}
              {activeSection === 'operativo' && (
                <div className="p-6 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="flex items-center space-x-2 border-b border-gray-100 pb-4 mb-6">
                    <Briefcase className="h-5 w-5 text-gray-400" />
                    <h2 className="text-lg font-medium text-gray-900">Asignación y Notas</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Asignar Ruta
                      </label>
                      <select
                        name="rutaId"
                        value={formData.rutaId}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      >
                        <option value="">Seleccionar Ruta...</option>
                        {rutasDisponibles.map(ruta => (
                          <option key={ruta.id} value={ruta.id}>
                            {ruta.nombre}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-gray-500">
                        El cliente será visitado por el cobrador asignado a esta ruta.
                      </p>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Observaciones Generales
                      </label>
                      <textarea
                        name="observaciones"
                        value={formData.observaciones}
                        onChange={handleInputChange}
                        rows={4}
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                        placeholder="Notas adicionales sobre el cliente, horarios de visita preferidos, etc."
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Footer del formulario */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
                <Link
                  href="/admin/clientes"
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium"
                >
                  Cancelar
                </Link>
                <button
                  onClick={handleSubmit}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm font-medium shadow-sm"
                >
                  {isEditMode ? 'Guardar Cambios' : 'Crear Cliente'}
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
