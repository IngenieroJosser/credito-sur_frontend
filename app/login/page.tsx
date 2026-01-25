'use client'

import { useState, FormEvent, useEffect } from 'react';
import { Eye, EyeOff, Lock, User, ChevronRight } from 'lucide-react';
import { iniciarSesion } from '@/services/autenticacion-service';
import { LoginData, AuthResponse, UserProfile } from '@/lib/types/autenticacion-type';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface LoginFormData {
  nombres: string;
  password: string;
}

interface ToastState {
  show: boolean;
  message: string;
  userName: string;
  type: 'success' | 'error';
}

interface ApiError {
  response?: {
    status?: number;
    data?: unknown;
  };
  message?: string;
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
  const [toast, setToast] = useState<ToastState>({
    show: false,
    message: '',
    userName: '',
    type: 'success'
  });
  const router = useRouter();

  // Obtener año actual dinámico
  const currentYear = new Date().getFullYear();

  // Efecto para auto-ocultar el toast después de 3 segundos
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast(prev => ({ ...prev, show: false }));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Verificar si ya hay una sesión activa y redirigir a la ruta correspondiente
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        const roleRedirects: Record<string, string> = {
          'COBRADOR': '/cobranzas',
          'COORDINADOR': '/coordinador',
          'SUPER_ADMINISTRADOR': '/admin',
          'ADMINISTRADOR': '/admin',
          'SUPERVISOR': '/supervisor',
          'CONTADOR': '/admin'
        };
        const redirectPath = roleRedirects[user.rol] || '/admin';
        router.replace(redirectPath);
      } catch (e) {
        // Si hay error al parsear, limpiar sesión
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }, [router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const formatRol = (rol: string): string => {
    const roles: Record<string, string> = {
      'SUPER_ADMINISTRADOR': 'Super Administrador',
      'COORDINADOR': 'Coordinador',
      'SUPERVISOR': 'Supervisor',
      'COBRADOR': 'Cobrador',
      'CONTADOR': 'Contador',
    };
    return roles[rol] || rol;
  };

  const showToast = (message: string, userName: string = '', type: ToastState['type'] = 'success') => {
    setToast({
      show: true,
      message,
      userName,
      type
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!formData.nombres.trim() || !formData.password.trim()) {
      setError('Credenciales requeridas');
      showToast('Credenciales requeridas', '', 'error');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const payload: LoginData = {
        nombres: formData.nombres,
        contrasena: formData.password,
      };

      // Depuración: Verificar qué se envía
      console.log('Enviando payload:', payload);

      const response: AuthResponse = await iniciarSesion(payload);

      // Depuración: Verificar la respuesta completa
      console.log('Respuesta completa:', response);
      console.log('Tipo de respuesta:', typeof response);

      // Verificar si la respuesta es válida
      if (!response || typeof response !== 'object') {
        throw new Error('No se recibió respuesta del servidor');
      }

      // Verificar si la respuesta tiene la estructura AuthResponse esperada
      if (!response.access_token) {
        console.error('Respuesta no tiene access_token:', response);
        throw new Error('Respuesta de autenticación inválida');
      }

      // Verificar si tiene la propiedad usuario
      if (!response.usuario) {
        console.error('Respuesta no tiene usuario:', response);

        // Si no tiene usuario, crear un objeto básico con la información disponible
        const userFullName = formData.nombres;
        const userData: UserProfile & { nombreCompleto: string } = {
          id: 'temp-' + Date.now(),
          nombres: formData.nombres,
          apellidos: '',
          rol: 'SUPER_ADMINISTRADOR',
          nombreCompleto: formData.nombres
        };

        // Guardar datos en localStorage
        localStorage.setItem('token', response.access_token);
        localStorage.setItem('user', JSON.stringify(userData));

        showToast('Bienvenido', userFullName, 'success');

        setTimeout(() => {
          router.replace('/admin');
        }, 2000);
        return;
      }

      // Si tiene usuario, extraer los datos correctamente
      const userName = response.usuario.nombres || formData.nombres;
      const userFullName = `${response.usuario.nombres || ''} ${response.usuario.apellidos || ''}`.trim() || formData.nombres;

      // Construir datos del usuario para localStorage
      const userData: UserProfile & { nombreCompleto: string } = {
        ...response.usuario,
        nombreCompleto: userFullName
      };

      // Guardar token y datos del usuario en localStorage
      localStorage.setItem('token', response.access_token);
      localStorage.setItem('user', JSON.stringify(userData));

      // Mostrar toast de éxito con información del rol
      showToast('Bienvenido', `${userName} (${formatRol(response.usuario.rol)})`, 'success');

      // Determinar redirección según rol
      const roleRedirects: Record<string, string> = {
        'COBRADOR': '/cobranzas',
        'COORDINADOR': '/coordinador',
        'SUPER_ADMINISTRADOR': '/admin',
        'ADMINISTRADOR': '/admin',
        'SUPERVISOR': '/supervisor', // O su ruta específica si existe
        'CONTADOR': '/admin'    // O su ruta específica si existe
      };

      const redirectPath = roleRedirects[response.usuario.rol] || '/admin';

      // Siempre redirigir después de 2 segundos
      setTimeout(() => {
        console.log(`Redirigiendo a ${redirectPath} para usuario:`, userFullName);
        router.replace(redirectPath);
      }, 2000);

    } catch (err: unknown) {
      console.error('Error en login:', err);

      // Convertir error a tipo ApiError
      const error = err as ApiError;

      // Manejo de errores específicos
      if (error.response?.status === 401) {
        setError('Credenciales inválidas');
        showToast('Credenciales incorrectas', '', 'error');
      } else if (error.response?.status === 404) {
        setError('Usuario no encontrado');
        showToast('Usuario no encontrado', '', 'error');
      } else if (error.message === 'Network Error') {
        setError('Error de conexión');
        showToast('Error de conexión al servidor', '', 'error');
      } else if (error.message === 'No se recibió respuesta del servidor') {
        setError('No se recibió respuesta del servidor');
        showToast('Error del servidor', '', 'error');
      } else if (error.message === 'Respuesta de autenticación inválida') {
        setError('Error en la autenticación');
        showToast('Error en la autenticación', '', 'error');
      } else {
        setError('Error al iniciar sesión');
        showToast('Error al iniciar sesión', '', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Estilos ultra minimalistas
  const toastStyles = {
    success: {
      base: 'bg-white border border-gray-200',
      accent: 'from-emerald-400 to-emerald-500',
      text: 'text-gray-900',
      detail: 'text-emerald-600',
      time: 'text-emerald-400'
    },
    error: {
      base: 'bg-white border border-gray-200',
      accent: 'from-rose-400 to-rose-500',
      text: 'text-gray-900',
      detail: 'text-rose-600',
      time: 'text-rose-400'
    }
  };

  const styles = toastStyles[toast.type];

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 flex items-center justify-center p-4 relative">
      {/* Toast Ultra Minimalista */}
      <div className={`fixed top-6 right-6 z-50 transform transition-all duration-500 ease-out ${toast.show ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
        }`}>
        <div className="relative">
          {/* Tarjeta minimalista */}
          <div className={`${styles.base} rounded-xl shadow-lg min-w-[280px] overflow-hidden backdrop-blur-sm bg-white/95`}>
            {/* Línea superior sutil */}
            <div className={`h-0.5 bg-gradient-to-r ${styles.accent}`}></div>

            {/* Contenido */}
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Mensaje principal */}
                  <div className="flex items-baseline gap-2">
                    <h3 className={`text-sm font-medium ${styles.text}`}>
                      {toast.message}
                    </h3>
                    {toast.userName && (
                      <span className="text-sm font-medium text-gray-600">
                        {toast.userName}
                      </span>
                    )}
                  </div>

                  {/* Detalle sutil */}
                  <p className={`text-xs ${styles.detail} mt-1`}>
                    {toast.type === 'success' && toast.userName
                      ? 'Redirigiendo al panel de administración...'
                      : 'Verifica tus credenciales'}
                  </p>

                  {/* Indicador de tiempo ultra sutil */}
                  {toast.type === 'success' && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                        <span>Redirección</span>
                        <span>2s</span>
                      </div>
                      <div className="h-0.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full bg-gradient-to-r ${styles.accent} rounded-full animate-progress`} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Punto indicador de tiempo */}
                <div className="flex-shrink-0 pl-3">
                  <div className={`w-1.5 h-1.5 rounded-full ${styles.time}`}></div>
                </div>
              </div>
            </div>

            {/* Efecto de luz sutil */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent"></div>
          </div>

          {/* Sombra ultra sutil */}
          <div className="absolute -inset-2 -z-10 bg-gradient-to-br from-gray-200/10 to-transparent blur-sm"></div>
        </div>
      </div>

      {/* Fondo minimalista */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-24 w-96 h-96 bg-gradient-to-br from-[#08557f]/[0.02] to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 -right-24 w-96 h-96 bg-gradient-to-tr from-[#fb851b]/[0.02] to-transparent rounded-full blur-3xl"></div>

        {/* Líneas decorativas sutiles */}
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#08557f]/5 to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#08557f]/5 to-transparent"></div>
      </div>

      {/* Contenedor principal */}
      <div className="w-full max-w-sm relative z-10">
        {/* Encabezado ultra minimalista */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <div className="relative">
              <div className="w-14 h-14 bg-white border border-gray-200 rounded-xl flex items-center justify-center">
                <Image 
                  src='/favicon-32x32.png'
                  alt='Logo Oficial - Credisur'
                  width={32}
                  height={32}
                />
              </div>
            </div>
          </div>
          <h1 className="text-3xl font-light text-gray-800 mb-2">
            <span className="font-normal text-[#08557f]">Credi</span>
            <span className="font-normal text-[#fb851b]">Sur</span>
          </h1>
          <p className="text-xs text-gray-400 uppercase tracking-wider mt-4">Plataforma Financiera</p>
        </div>

        {/* Formulario de login */}
        <div className="mb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Campo Usuario */}
            <div className="relative">
              <div className={`absolute left-0 top-1/2 -translate-y-1/2 transition-all duration-300 ${focusedField === 'usuario' || formData.nombres
                  ? 'opacity-100'
                  : 'opacity-0'
                }`}>
                <User className="h-4 w-4 text-gray-400" />
              </div>
              <input
                id="nombres"
                name="nombres"
                type="text"
                value={formData.nombres}
                onChange={handleInputChange}
                onFocus={() => setFocusedField('usuario')}
                onBlur={() => setFocusedField(null)}
                className="w-full pl-8 pr-4 py-3 bg-transparent border-0 border-b border-gray-200 focus:border-[#08557f] focus:outline-none transition-all duration-300 text-gray-700 placeholder-gray-400 text-sm"
                placeholder="Usuario"
                autoComplete="username"
                disabled={isLoading}
              />
              <div className={`h-px bg-gradient-to-r from-[#08557f] to-transparent absolute bottom-0 left-0 transition-all duration-500 ${focusedField === 'usuario' ? 'w-full' : 'w-0'
                }`}></div>
            </div>

            {/* Campo Contraseña */}
            <div className="relative">
              <div className={`absolute left-0 top-1/2 -translate-y-1/2 transition-all duration-300 ${focusedField === 'password' || formData.password
                  ? 'opacity-100'
                  : 'opacity-0'
                }`}>
                <Lock className="h-4 w-4 text-gray-400" />
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={handleInputChange}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                className="w-full pl-8 pr-12 py-3 bg-transparent border-0 border-b border-gray-200 focus:border-[#08557f] focus:outline-none transition-all duration-300 text-gray-700 placeholder-gray-400 text-sm"
                placeholder="Contraseña"
                autoComplete="current-password"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
              <div className={`h-px bg-gradient-to-r from-[#08557f] to-transparent absolute bottom-0 left-0 transition-all duration-500 ${focusedField === 'password' ? 'w-full' : 'w-0'
                }`}></div>
            </div>

            {/* Botón de acceso minimalista */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full group relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="absolute inset-0 bg-white border border-gray-200 rounded-lg transition-all duration-300 group-hover:border-[#08557f]"></div>

                <div className="relative py-3 px-4 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 group-hover:text-[#08557f] transition-colors duration-300">
                    {isLoading ? 'Verificando...' : 'Acceder al Panel'}
                  </span>
                  <div className={`transition-all duration-300 ${isLoading ? 'opacity-0 translate-x-4' : 'opacity-100'
                    }`}>
                    <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-[#08557f] group-hover:translate-x-1 transition-all duration-300" />
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
                    <div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse"></div>
                    <span className="text-xs text-red-600">{error}</span>
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Información de seguridad */}
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-white text-xs text-gray-400">v1.0.0</span>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest">
              Acceso restringido
            </p>
            <p className="text-[9px] text-gray-300">
              © {currentYear} CrediFinanzas
            </p>
          </div>
        </div>

        {/* Indicador de sistema activo */}
        <div className="fixed bottom-8 right-8 flex items-center space-x-2 opacity-40 hover:opacity-100 transition-opacity duration-300">
          <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
          <span className="text-xs text-gray-500">En línea</span>
        </div>
      </div>

      <style jsx>{`
        @keyframes progress {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        
        .animate-progress {
          animation: progress 2s linear forwards;
        }
      `}</style>
    </div>
  );
};

export default LoginPage;