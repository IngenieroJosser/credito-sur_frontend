'use client'

import { useState } from 'react';
import {
  Save,
  User,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  Shield,
  DollarSign,
  AlertCircle,
  BarChart3,
  ChevronRight,
  CreditCard,
  Target
} from 'lucide-react';

interface ClienteFormData {
  // Datos personales
  nombre: string;
  apellido: string;
  documento: string;
  fechaNacimiento: string;
  genero: string;
  
  // Contacto
  telefono: string;
  email: string;
  direccion: string;
  ciudad: string;
  
  // Laboral
  ocupacion: string;
  ingresoMensual: number;
  
  // Financiero
  scoreCredito: number;
  limiteCredito: number;
  
  // Cobro
  rutaCobro: string;
  diaPago: number;
  metodoPago: string;
  
  // Seguridad
  enListaNegra: boolean;
  observaciones: string;
  nivelRiesgo: string;
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
      <div className="absolute top-0 left-0" style={{ left: `${score - 2}%` }}>
        <div className="w-4 h-4 rounded-full bg-white border-2 border-current shadow-sm transform -translate-y-1/2"
             style={{ borderColor: getScoreColor(score).replace('bg-', 'text-') }}>
        </div>
      </div>
    </div>
  );
};

const ClienteFormPage = () => {
  const [isEditMode] = useState(false);
  const [activeSection, setActiveSection] = useState('personal');
  const [formData, setFormData] = useState<ClienteFormData>({
    nombre: '',
    apellido: '',
    documento: '',
    fechaNacimiento: '',
    genero: '',
    
    telefono: '',
    email: '',
    direccion: '',
    ciudad: '',
    
    ocupacion: '',
    ingresoMensual: 0,
    
    scoreCredito: 75,
    limiteCredito: 10000,
    
    rutaCobro: '',
    diaPago: 15,
    metodoPago: '',
    
    enListaNegra: false,
    observaciones: '',
    nivelRiesgo: 'medio'
  });

  const sections = [
    { id: 'personal', label: 'Personal', icon: <User className="h-4 w-4" /> },
    { id: 'contacto', label: 'Contacto', icon: <Phone className="h-4 w-4" /> },
    { id: 'laboral', label: 'Laboral', icon: <Briefcase className="h-4 w-4" /> },
    { id: 'financiero', label: 'Financiero', icon: <DollarSign className="h-4 w-4" /> },
    { id: 'cobro', label: 'Cobro', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'seguridad', label: 'Seguridad', icon: <Shield className="h-4 w-4" /> }
  ];

  const rutasCobro = [
    'Ruta Centro - Carlos Pérez',
    'Ruta Este - María Rodríguez',
    'Ruta Oeste - Juan López',
    'Ruta Norte - Ana Gómez'
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Formulario enviado:', formData);
    alert(isEditMode ? 'Cliente actualizado' : 'Cliente creado');
  };

  const getRiesgoColor = (nivel: string) => {
    switch (nivel) {
      case 'bajo': return 'text-green-500';
      case 'medio': return 'text-yellow-500';
      case 'alto': return 'text-orange-500';
      case 'critico': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getRiesgoBg = (nivel: string) => {
    switch (nivel) {
      case 'bajo': return 'bg-green-500/10';
      case 'medio': return 'bg-yellow-500/10';
      case 'alto': return 'bg-orange-500/10';
      case 'critico': return 'bg-red-500/10';
      default: return 'bg-gray-500/10';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100">
      {/* Header elegante */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b border-gray-100">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-dark rounded-lg flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-light text-gray-800">
                  {isEditMode ? 'Editar Cliente' : 'Nuevo Cliente'}
                </h1>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors text-sm">
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>{isEditMode ? 'Actualizar' : 'Guardar'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Navegación lateral elegante */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <div className="space-y-1">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg transition-all duration-200 ${
                      activeSection === section.id
                        ? 'bg-primary/10 text-primary'
                        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-1.5 rounded ${
                        activeSection === section.id ? 'bg-primary/20' : 'bg-gray-100'
                      }`}>
                        {section.icon}
                      </div>
                      <span className="text-sm font-medium">{section.label}</span>
                    </div>
                    {activeSection === section.id && (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                ))}
              </div>

              {/* Indicador de riesgo */}
              <div className="mt-6 p-4 border border-gray-100 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">Riesgo</span>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${getRiesgoBg(formData.nivelRiesgo)} ${getRiesgoColor(formData.nivelRiesgo)}`}>
                    {formData.nivelRiesgo.toUpperCase()}
                  </div>
                </div>
                <div className="text-2xl font-light text-gray-800 mb-2">{formData.scoreCredito}</div>
                <ScoreMeter score={formData.scoreCredito} />
              </div>
            </div>
          </div>

          {/* Formulario principal */}
          <div className="lg:col-span-3">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Sección Personal */}
              {activeSection === 'personal' && (
                <div className="bg-white border border-gray-100 rounded-xl p-6">
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-base font-medium text-gray-800 mb-4">Datos Personales</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-gray-600 mb-2">Nombre</label>
                          <input
                            type="text"
                            name="nombre"
                            value={formData.nombre}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 bg-transparent border-0 border-b border-gray-200 focus:border-primary focus:outline-none transition-colors"
                            placeholder="Nombre"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-2">Apellido</label>
                          <input
                            type="text"
                            name="apellido"
                            value={formData.apellido}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 bg-transparent border-0 border-b border-gray-200 focus:border-primary focus:outline-none transition-colors"
                            placeholder="Apellido"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-2">Documento</label>
                          <input
                            type="text"
                            name="documento"
                            value={formData.documento}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 bg-transparent border-0 border-b border-gray-200 focus:border-primary focus:outline-none transition-colors"
                            placeholder="V-12345678"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-2">Fecha Nacimiento</label>
                          <input
                            type="date"
                            name="fechaNacimiento"
                            value={formData.fechaNacimiento}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 bg-transparent border-0 border-b border-gray-200 focus:border-primary focus:outline-none transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-2">Género</label>
                          <select
                            name="genero"
                            value={formData.genero}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 bg-transparent border-0 border-b border-gray-200 focus:border-primary focus:outline-none transition-colors"
                          >
                            <option value="">Seleccionar</option>
                            <option value="masculino">Masculino</option>
                            <option value="femenino">Femenino</option>
                            <option value="otro">Otro</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sección Contacto */}
              {activeSection === 'contacto' && (
                <div className="bg-white border border-gray-100 rounded-xl p-6">
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-base font-medium text-gray-800 mb-4">Información de Contacto</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-gray-600 mb-2">Teléfono</label>
                          <div className="flex items-center">
                            <Phone className="h-4 w-4 text-gray-400 mr-2" />
                            <input
                              type="tel"
                              name="telefono"
                              value={formData.telefono}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 bg-transparent border-0 border-b border-gray-200 focus:border-primary focus:outline-none transition-colors"
                              placeholder="+58 412 555 1212"
                              required
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-2">Email</label>
                          <div className="flex items-center">
                            <Mail className="h-4 w-4 text-gray-400 mr-2" />
                            <input
                              type="email"
                              name="email"
                              value={formData.email}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 bg-transparent border-0 border-b border-gray-200 focus:border-primary focus:outline-none transition-colors"
                              placeholder="cliente@email.com"
                            />
                          </div>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm text-gray-600 mb-2">Dirección</label>
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                            <input
                              type="text"
                              name="direccion"
                              value={formData.direccion}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 bg-transparent border-0 border-b border-gray-200 focus:border-primary focus:outline-none transition-colors"
                              placeholder="Dirección completa"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-2">Ciudad</label>
                          <input
                            type="text"
                            name="ciudad"
                            value={formData.ciudad}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 bg-transparent border-0 border-b border-gray-200 focus:border-primary focus:outline-none transition-colors"
                            placeholder="Ciudad"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sección Laboral */}
              {activeSection === 'laboral' && (
                <div className="bg-white border border-gray-100 rounded-xl p-6">
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-base font-medium text-gray-800 mb-4">Información Laboral</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-gray-600 mb-2">Ocupación</label>
                          <div className="flex items-center">
                            <Briefcase className="h-4 w-4 text-gray-400 mr-2" />
                            <input
                              type="text"
                              name="ocupacion"
                              value={formData.ocupacion}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 bg-transparent border-0 border-b border-gray-200 focus:border-primary focus:outline-none transition-colors"
                              placeholder="Profesión u oficio"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-2">Ingreso Mensual</label>
                          <div className="flex items-center">
                            <DollarSign className="h-4 w-4 text-gray-400 mr-2" />
                            <input
                              type="number"
                              name="ingresoMensual"
                              value={formData.ingresoMensual}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 bg-transparent border-0 border-b border-gray-200 focus:border-primary focus:outline-none transition-colors"
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sección Financiero */}
              {activeSection === 'financiero' && (
                <div className="bg-white border border-gray-100 rounded-xl p-6">
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-base font-medium text-gray-800 mb-4">Información Financiera</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm text-gray-600 mb-2">Score Crediticio</label>
                            <div className="text-3xl font-light text-gray-800 mb-2">{formData.scoreCredito}</div>
                            <div className="relative">
                              <input
                                type="range"
                                name="scoreCredito"
                                min="0"
                                max="100"
                                value={formData.scoreCredito}
                                onChange={handleInputChange}
                                className="w-full h-1 bg-gray-200 rounded-full appearance-none cursor-pointer"
                              />
                              <div className="flex justify-between text-xs text-gray-400 mt-1">
                                <span>Bajo</span>
                                <span>Alto</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm text-gray-600 mb-2">Límite de Crédito</label>
                            <div className="flex items-center">
                              <CreditCard className="h-4 w-4 text-gray-400 mr-2" />
                              <input
                                type="number"
                                name="limiteCredito"
                                value={formData.limiteCredito}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 bg-transparent border-0 border-b border-gray-200 focus:border-primary focus:outline-none transition-colors"
                                placeholder="10000"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm text-gray-600 mb-2">Nivel de Riesgo</label>
                            <div className="flex items-center space-x-2">
                              <select
                                name="nivelRiesgo"
                                value={formData.nivelRiesgo}
                                onChange={handleInputChange}
                                className="flex-1 px-3 py-2 bg-transparent border-0 border-b border-gray-200 focus:border-primary focus:outline-none transition-colors"
                              >
                                <option value="bajo">Bajo</option>
                                <option value="medio">Medio</option>
                                <option value="alto">Alto</option>
                                <option value="critico">Crítico</option>
                              </select>
                              <div className={`w-3 h-3 rounded-full ${getRiesgoBg(formData.nivelRiesgo)} ${getRiesgoColor(formData.nivelRiesgo)}`}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sección Cobro */}
              {activeSection === 'cobro' && (
                <div className="bg-white border border-gray-100 rounded-xl p-6">
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-base font-medium text-gray-800 mb-4">Ruta de Cobro</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm text-gray-600 mb-2">Asignar Ruta</label>
                            <select
                              name="rutaCobro"
                              value={formData.rutaCobro}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 bg-transparent border-0 border-b border-gray-200 focus:border-primary focus:outline-none transition-colors"
                            >
                              <option value="">Seleccionar ruta...</option>
                              {rutasCobro.map((ruta, idx) => (
                                <option key={idx} value={ruta}>{ruta}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm text-gray-600 mb-2">Día de Pago</label>
                            <div className="flex items-center space-x-3">
                              <Target className="h-4 w-4 text-gray-400" />
                              <input
                                type="range"
                                name="diaPago"
                                min="1"
                                max="31"
                                value={formData.diaPago}
                                onChange={handleInputChange}
                                className="flex-1 h-1 bg-gray-200 rounded-full appearance-none cursor-pointer"
                              />
                              <span className="text-sm font-medium text-gray-700 min-w-[2rem] text-center">
                                {formData.diaPago}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm text-gray-600 mb-2">Método de Pago</label>
                            <select
                              name="metodoPago"
                              value={formData.metodoPago}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 bg-transparent border-0 border-b border-gray-200 focus:border-primary focus:outline-none transition-colors"
                            >
                              <option value="">Seleccionar método...</option>
                              <option value="efectivo">Efectivo</option>
                              <option value="transferencia">Transferencia</option>
                              <option value="tarjeta">Tarjeta</option>
                              <option value="pago_movil">Pago Móvil</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sección Seguridad */}
              {activeSection === 'seguridad' && (
                <div className="bg-white border border-gray-100 rounded-xl p-6">
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-base font-medium text-gray-800 mb-4">Controles de Seguridad</h2>
                      <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 border border-gray-100 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-red-50 rounded-lg">
                              <AlertCircle className="h-5 w-5 text-red-500" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-800">Lista Negra</div>
                              <div className="text-xs text-gray-500">Bloquear acceso al cliente</div>
                            </div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              name="enListaNegra"
                              checked={formData.enListaNegra}
                              onChange={handleInputChange}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                          </label>
                        </div>

                        {formData.enListaNegra && (
                          <div className="p-4 border border-red-100 bg-red-50/50 rounded-lg">
                            <label className="block text-sm text-gray-600 mb-2">Motivo</label>
                            <textarea
                              name="observaciones"
                              value={formData.observaciones}
                              onChange={handleInputChange}
                              rows={3}
                              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                              placeholder="Describa el motivo de inclusión en lista negra..."
                            />
                          </div>
                        )}

                        <div>
                          <label className="block text-sm text-gray-600 mb-2">Observaciones Internas</label>
                          <textarea
                            name="observaciones"
                            value={formData.observaciones}
                            onChange={handleInputChange}
                            rows={4}
                            className="w-full px-3 py-2 bg-transparent border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
                            placeholder="Notas privadas para uso interno..."
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Navegación inferior */}
              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => {
                    const currentIndex = sections.findIndex(s => s.id === activeSection);
                    if (currentIndex > 0) {
                      setActiveSection(sections[currentIndex - 1].id);
                    }
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors text-sm flex items-center space-x-2"
                >
                  <ChevronRight className="h-4 w-4 transform rotate-180" />
                  <span>Anterior</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const currentIndex = sections.findIndex(s => s.id === activeSection);
                    if (currentIndex < sections.length - 1) {
                      setActiveSection(sections[currentIndex + 1].id);
                    }
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors text-sm flex items-center space-x-2"
                >
                  <span>Siguiente</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Botón guardar fijo */}
              <div className="sticky bottom-6 mt-8">
                <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Save className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-800">
                          {isEditMode ? 'Actualizar Cliente' : 'Crear Cliente'}
                        </div>
                        <div className="text-xs text-gray-500">Guardar todos los cambios</div>
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm font-medium"
                    >
                      Guardar
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClienteFormPage;
