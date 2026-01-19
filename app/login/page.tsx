'use client'

import { useState, FormEvent, useEffect } from 'react';
import { Eye, EyeOff, Lock, User, ChevronRight, Check } from 'lucide-react';
import { iniciarSesion } from '@/services/autenticacion-service';
import { LoginData } from '@/lib/types/autenticacion-type';
import { useRouter } from 'next/navigation';
import { RolUsuario } from '@/lib/types/autenticacion-type';

interface LoginFormData {
  nombres: string;
  password: string;
}

interface WelcomeState {
  show: boolean;
  name: string;
}

const LoginPage = () => {
  const [formData, setFormData] = useState<LoginFormData>({
    nombres: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [welcome, setWelcome] = useState<WelcomeState>({ show: false, name: '' });
  const router = useRouter();

  // Obtener año actual dinámico
  const currentYear = new Date().getFullYear();

  // Efecto para limpiar el mensaje de bienvenida después de 3 segundos
  useEffect(() => {
    if (welcome.show) {
      const timer = setTimeout(() => {
        setWelcome({ show: false, name: '' });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [welcome.show]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const ROLE_REDIRECT_MAP: Record<RolUsuario, string> = {
    SUPER_ADMINISTRADOR: '/admin',
    COORDINADOR: '/coordinacion',
    SUPERVISOR: '/supervision',
    COBRADOR: '/cobranzas',
    CONTADOR: '/contabilidad',
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
  
    if (!formData.nombres.trim() || !formData.password.trim()) {
      setError('Credenciales requeridas');
      return;
    }
  
    setIsLoading(true);
    setError('');
  
    try {
      const payload: LoginData = {
        nombres: formData.nombres,
        contrasena: formData.password,
      };
  
      const response = await iniciarSesion(payload);
      const userName = response.usuario.nombres || 'Usuario';
      
      // Mostrar mensaje de bienvenida
      setWelcome({ show: true, name: userName });
      
      // Esperar 1.5 segundos para mostrar el mensaje y luego redirigir
      setTimeout(() => {
        const rol = response.usuario.rol as RolUsuario;
        const redirectPath = ROLE_REDIRECT_MAP[rol] ?? '/';
        router.replace(redirectPath);
      }, 1500);
      
    } catch (err) {
      setError('Credenciales inválidas');
    } finally {
      setIsLoading(false);
    }
  };

  // Opciones de acceso rápido para demostración
  const demoCredentials = [
    { role: 'Administrador', user: 'admin', pass: 'demo123', initial: 'A' },
    { role: 'Coordinador', user: 'coord', pass: 'demo123', initial: 'C' },
    { role: 'Supervisor', user: 'super', pass: 'demo123', initial: 'S' },
    { role: 'Cobrador', user: 'cobrador', pass: 'demo123', initial: 'B' },
    { role: 'Contable', user: 'contable', pass: 'demo123', initial: 'T' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 flex items-center justify-center p-4 relative">
      {/* Fondo minimalista */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-24 w-96 h-96 bg-gradient-to-br from-[#08557f]/[0.02] to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 -right-24 w-96 h-96 bg-gradient-to-tr from-[#fb851b]/[0.02] to-transparent rounded-full blur-3xl"></div>
        
        {/* Líneas decorativas sutiles */}
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#08557f]/10 to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#08557f]/10 to-transparent"></div>
      </div>

      {/* Mensaje de Bienvenida (Overlay) */}
      {welcome.show && (
        <div className="fixed inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl transform transition-all duration-500 scale-100 animate-in zoom-in">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center">
                <Check className="w-10 h-10 text-emerald-600" />
              </div>
              
              <h2 className="text-2xl font-light text-gray-900 mb-3">
                ¡Bienvenid@,{' '}
                <span className="font-medium bg-gradient-to-r from-[#08557f] to-[#063a58] bg-clip-text text-transparent">
                  {welcome.name}
                </span>
                !
              </h2>
              
              <p className="text-gray-600 mb-6">
                Has iniciado sesión exitosamente. Redirigiendo a tu panel de control...
              </p>
              
              <div className="flex items-center justify-center space-x-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse delay-150"></div>
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse delay-300"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contenedor principal */}
      <div className="w-full max-w-sm relative z-10">
        {/* Encabezado ultra minimalista */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <div className="relative group">
              <div className="w-14 h-14 bg-white border border-gray-200 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-all duration-300">
                <div className="w-8 h-8 flex items-center justify-center">
                  <div className="w-6 h-6 bg-gradient-to-br from-[#08557f] to-[#063a58] rounded"></div>
                  <div className="absolute w-2 h-2 bg-[#fb851b] rounded-full -translate-y-1 translate-x-1"></div>
                </div>
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-br from-[#fb851b] to-[#e07415] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>
          </div>
          <h1 className="text-4xl font-light text-gray-800 tracking-tight mb-2">
            <span className="font-normal text-[#08557f]">Credi</span>Finanzas
          </h1>
          <p className="text-xs text-gray-400 tracking-widest uppercase mt-4">Plataforma Financiera</p>
        </div>

        {/* Formulario de login */}
        <div className="mb-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Campo Usuario */}
            <div className="relative">
              <div className={`absolute left-0 top-1/2 -translate-y-1/2 transition-all duration-300 ${
                focusedField === 'usuario' || formData.nombres 
                  ? 'opacity-100 translate-x-0' 
                  : 'opacity-0 -translate-x-2'
              }`}>
                <User className={`h-4 w-4 ${
                  focusedField === 'usuario' ? 'text-[#08557f]' : 'text-gray-400'
                } transition-colors`} />
              </div>
              <input
                id="nombres"
                name="nombres"
                type="text"
                value={formData.nombres}
                onChange={handleInputChange}
                onFocus={() => setFocusedField('usuario')}
                onBlur={() => setFocusedField(null)}
                className="w-full pl-8 pr-4 py-3 bg-transparent border-0 border-b border-gray-200 focus:border-[#08557f] focus:outline-none transition-all duration-300 text-gray-700 placeholder-gray-400 text-sm tracking-wide"
                placeholder="Identificación de usuario"
                autoComplete="username"
              />
              <div className={`h-px bg-gradient-to-r from-[#08557f] to-transparent absolute bottom-0 left-0 transition-all duration-500 ${
                focusedField === 'usuario' ? 'w-full opacity-100' : 'w-0 opacity-0'
              }`}></div>
            </div>

            {/* Campo Contraseña */}
            <div className="relative">
              <div className={`absolute left-0 top-1/2 -translate-y-1/2 transition-all duration-300 ${
                focusedField === 'password' || formData.password 
                  ? 'opacity-100 translate-x-0' 
                  : 'opacity-0 -translate-x-2'
              }`}>
                <Lock className={`h-4 w-4 ${
                  focusedField === 'password' ? 'text-[#08557f]' : 'text-gray-400'
                } transition-colors`} />
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={handleInputChange}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                className="w-full pl-8 pr-12 py-3 bg-transparent border-0 border-b border-gray-200 focus:border-[#08557f] focus:outline-none transition-all duration-300 text-gray-700 placeholder-gray-400 text-sm tracking-wide"
                placeholder="Clave de acceso"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
              <div className={`h-px bg-gradient-to-r from-[#08557f] to-transparent absolute bottom-0 left-0 transition-all duration-500 ${
                focusedField === 'password' ? 'w-full opacity-100' : 'w-0 opacity-0'
              }`}></div>
            </div>

            {/* Botón de acceso ultra minimalista */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full group relative overflow-hidden"
              >
                {/* Fondo sutil */}
                <div className="absolute inset-0 bg-gradient-to-r from-white to-gray-50 border border-gray-200 rounded-lg transition-all duration-300 group-hover:border-[#08557f]/30"></div>
                
                {/* Efecto de acento naranja */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#fb851b] to-[#e07415] transition-all duration-300 group-hover:w-full group-hover:opacity-10"></div>
                
                {/* Contenido */}
                <div className="relative py-3 px-4 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 group-hover:text-[#08557f] transition-colors duration-300">
                    {isLoading ? 'Verificando identidad...' : 'Acceder al sistema'}
                  </span>
                  <div className={`transition-all duration-300 ${
                    isLoading ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'
                  }`}>
                    <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-[#fb851b] group-hover:translate-x-1 transition-all duration-300" />
                  </div>
                </div>

                {/* Spinner minimalista */}
                {isLoading && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border border-gray-300 border-t-[#08557f] rounded-full animate-spin"></div>
                  </div>
                )}
              </button>

              {/* Mensaje de error elegante */}
              {error && (
                <div className="mt-4 text-center">
                  <div className="inline-flex items-center space-x-2 px-3 py-2 bg-red-50/80 border border-red-100 rounded-lg">
                    <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                    <span className="text-xs text-red-600 font-medium">{error}</span>
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Accesos rápidos ultra sutiles */}
        <div className="mb-12">
          <div className="flex items-center justify-center space-x-1">
            {demoCredentials.map((cred, index) => (
              <button
                key={index}
                onClick={() => {
                  setFormData({ 
                    nombres: cred.user, 
                    password: cred.pass 
                  });
                  // Feedback visual
                  const button = document.getElementById(`demo-btn-${index}`);
                  button?.classList.add('animate-pulse');
                  setTimeout(() => {
                    button?.classList.remove('animate-pulse');
                  }, 300);
                }}
                id={`demo-btn-${index}`}
                className="w-8 h-8 flex items-center justify-center text-xs text-gray-400 hover:text-gray-600 transition-colors duration-200 relative group"
              >
                {/* Indicador de hover */}
                <div className="absolute inset-0 border border-gray-200 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <span className="relative">{cred.initial}</span>
                
                {/* Tooltip sutil */}
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap pointer-events-none z-20">
                  {cred.role}
                </div>
              </button>
            ))}
          </div>
          <p className="text-center text-xs text-gray-400 mt-4">
            Acceso rápido para demostración
          </p>
        </div>

        {/* Información de seguridad y versión */}
        <div className="text-center space-y-6">
          {/* Línea divisoria elegante */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-white text-xs text-gray-400">v1.0.0 • Sistema seguro</span>
            </div>
          </div>

          {/* Información legal sutil */}
          <div className="space-y-2">
            <p className="text-[10px] text-gray-400 tracking-widest uppercase">
              Acceso restringido • Solo personal autorizado
            </p>
            <p className="text-[9px] text-gray-300">
              © {currentYear} CrediFinanzas • Todos los derechos reservados
            </p>
          </div>
        </div>

        {/* Indicador de sistema activo (muy sutil) */}
        <div className="fixed bottom-8 right-8 flex items-center space-x-2 opacity-40 hover:opacity-100 transition-opacity duration-300">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-xs text-gray-500 font-mono">Sistema en línea</span>
        </div>
      </div>

      {/* Efecto de partículas sutiles (opcional) */}
      <div className="fixed inset-0 pointer-events-none">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="absolute w-px h-24 bg-gradient-to-b from-transparent via-[#08557f]/5 to-transparent"
            style={{
              left: `${20 + i * 30}%`,
              top: '10%',
              transform: `rotate(${15 * i}deg)`,
              animation: `float 10s ease-in-out ${i * 2}s infinite`
            }}
          ></div>
        ))}
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(var(--tw-rotate)); }
          50% { transform: translateY(-20px) rotate(var(--tw-rotate)); }
        }
      `}</style>
    </div>
  );
};

export default LoginPage;