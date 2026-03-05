'use client'

/**
 * ============================================================================
 * LOGIN PAGE (GATEWAY)
 * ============================================================================
 * 
 * @description
 * Punto de entrada único a la plataforma. Gestiona la autenticación de
 * credenciales (Usuario/Contraseña) contra el backend.
 * 
 * @features
 * - Redirección inteligente basada en Rol (Cobrador -> /cobranzas, Admin -> /admin).
 * - Persistencia de sesión (localStorage).
 * - UI Minimalista con feedback visual avanzado (Toasts, Spinners).
 * - Soporte para modo offline: verificar sesión cacheada y permitir acceso sin conexión.
 */

import { useState, FormEvent, useEffect, Suspense } from 'react';
import { Eye, EyeOff, Lock, User, ChevronRight, WifiOff } from 'lucide-react';
import { LoginData } from '@/lib/types/autenticacion-type';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { restoreOfflineSession, hasValidOfflineSession, getOfflineSessionDaysRemaining, isTokenExpired, cacheSession } from '@/lib/auth/offlineAuth';
import { setAuthCookiesAction } from './actions';
import { apiClient } from '@/lib/api/apiClient';

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



const LoginPage = () => {
  // Manejamos los datos del formulario aquí
  const [formData, setFormData] = useState<LoginFormData>({
    nombres: '',
    password: ''
  });

  // Contador secreto para revelar el link de recuperacion (solo superadmin lo sabe)
  const [versionClicks, setVersionClicks] = useState(0);
  const [showRecoveryLink, setShowRecoveryLink] = useState(false);

  const handleVersionClick = () => {
    const next = versionClicks + 1;
    setVersionClicks(next);
    if (next >= 5) {
      setShowRecoveryLink(true);
      setVersionClicks(0);
    }
  };
  
  // Estados para controlar la interfaz visual
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false); // Para mostrar la pantalla blanca de carga al final
  const [error, setError] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null); // Para animar los inputs cuando los seleccionas
  
  // Sistema de notificaciones (Toasts)
  const [toast, setToast] = useState<ToastState>({
    show: false,
    message: '',
    userName: '',
    type: 'success'
  });
  
  const router = useRouter();
  const searchParams = useSearchParams();

  // Obtenemos el año actual para el footer
  const currentYear = new Date().getFullYear();

  // Este efecto oculta la notificación automáticamente después de 3 segundos
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast(prev => ({ ...prev, show: false }));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Mostrar aviso si la sesión expiró (viene desde ?expired=1)
  useEffect(() => {
    if (searchParams.get('expired') === '1') {
      setError('Tu sesión expiró. Por favor inicia sesión de nuevo.');
    }
  }, [searchParams]);

  // Ping the backend directly from the browser on mount to wake up Render instances
  // bypassing Vercel's 10-second timeout limits.
  useEffect(() => {
    fetch('https://credito-sur-backend.onrender.com/api-credisur/auth', { method: 'GET' })
      .catch((e) => console.log('Ping para despertar el backend enviado.'));
  }, []);

  // Si ya hay sesión válida en localStorage, redirigir directo al dashboard
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (token && userStr) {
      // Si el token ya expiró, limpiamos y nos quedamos en login
      if (isTokenExpired(token)) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setError('Tu sesión expiró. Por favor inicia sesión de nuevo.');
        return;
      }

      try {
        const user = JSON.parse(userStr);
        const roleRedirects: Record<string, string> = {
          'COBRADOR': '/cobranzas',
          'COORDINADOR': '/coordinador',
          'SUPER_ADMINISTRADOR': '/admin',
          'ADMINISTRADOR': '/admin',
          'SUPERVISOR': '/supervisor',
          'CONTADOR': '/contador/contable',
          'PUNTO_DE_VENTA': '/punto-de-venta'
        };
        const redirectPath = roleRedirects[user.rol] || '/admin';
        router.replace(redirectPath);
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }, []);

  // Actualiza el estado cuando el usuario escribe en los inputs
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Si había un error mostrado, lo quitamos apenas empiece a escribir
    if (error) setError('');
  };

  // Convierte los roles técnicos (SUPER_ADMINISTRADOR) a texto legible (Super Administrador)
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

  // Utilidad para mostrar notificaciones flotantes
  const showToast = (message: string, userName: string = '', type: ToastState['type'] = 'success') => {
    setToast({
      show: true,
      message,
      userName,
      type
    });
  };

  // Acceso offline con sesión cacheada
  const handleOfflineAccess = () => {
    if (!hasValidOfflineSession()) {
      showToast('No hay sesión offline disponible', '', 'error');
      return;
    }

    const restored = restoreOfflineSession();
    if (!restored) {
      showToast('Error al restaurar sesión offline', '', 'error');
      return;
    }

    const user = restored.user;
    const roleRedirects: Record<string, string> = {
      'COBRADOR': '/cobranzas',
      'COORDINADOR': '/coordinador',
      'SUPER_ADMINISTRADOR': '/admin',
      'ADMINISTRADOR': '/admin',
      'SUPERVISOR': '/supervisor',
      'CONTADOR': '/contador/contable',
      'PUNTO_DE_VENTA': '/punto-de-venta'
    };

    const redirectPath = roleRedirects[user.rol] || '/admin';
    const userName = user.nombres || 'Usuario';
    
    showToast('Modo Offline', `${userName} (${formatRol(user.rol)})`, 'success');
    
    setTimeout(() => {
      setIsRedirecting(true);
      setTimeout(() => {
        window.location.href = redirectPath;
      }, 500);
    }, 800);
  };

  // Lógica principal de inicio de sesión
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Validamos que no envíe campos vacíos
    if (!formData.nombres.trim() || !formData.password.trim()) {
      setError('Credenciales requeridas');
      showToast('Credenciales requeridas', '', 'error');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const payload: LoginData = {
        nombres: formData.nombres.trim(),
        contrasena: formData.password.trim(),
      };

      console.log('Iniciando proceso de login directo al backend...');
      
      // 1. Enviamos petición directa a Render (el browser espera tranquilamente 60s)
      const res = await apiClient.post('/auth/login', payload, { timeout: 65000 });
      const result = res.data;

      if (!result || !result.access_token) {
        throw new Error('Respuesta inválida del servidor');
      }

      // 2. Usamos Server Action muy rápida solo para inyectar Cookies seguras
      const cookieRes = await setAuthCookiesAction(result.access_token, result.usuario?.rol);
      if (!cookieRes.success) {
        throw new Error(cookieRes.error || 'Error seteando sesión');
      }

      // Guardamos datos en localStorage para uso en el cliente
      if (result.usuario) {
        const userFullName = `${result.usuario.nombres || ''} ${result.usuario.apellidos || ''}`.trim() || formData.nombres;
        const userData = { ...result.usuario, nombreCompleto: userFullName };
        
        localStorage.setItem('user', JSON.stringify(userData));
        
        // Guardamos el token también para las peticiones desde el cliente
        if (result.access_token) {
          localStorage.setItem('token', result.access_token);
          // Cachear sesión para que el modo offline funcione cuando no hay internet
          cacheSession(result.access_token, userData);
        }
      }

      // ── Descarga background para modo offline ──────────────────────────
      // Fire & Forget: no bloquea la redirección. Descarga clientes,
      // préstamos, rutas, cajas, productos y usuarios en IndexedDB para
      // que estén disponibles si el usuario pierde internet más adelante.
      import('@/lib/offline/syncManager')
        .then(({ syncManager }) => {
          console.log('[PWA] Iniciando descarga de datos offline en background...');
          return syncManager.downloadAll();
        })
        .then((counts) => {
          console.log('[PWA] Datos offline actualizados:', counts);
        })
        .catch(() => {
          // Silencioso: no afecta el login
        });
      // ───────────────────────────────────────────────────────────────────


      const userName = result.usuario?.nombres || formData.nombres;
      const rol = result.usuario?.rol || 'Usuario';
      
      showToast('Bienvenido', `${userName} (${formatRol(rol)})`, 'success');

      // Determinar ruta de redirección
      const fallbackRedirects: Record<string, string> = {
        'COBRADOR': '/cobranzas',
        'COORDINADOR': '/coordinador',
        'SUPER_ADMINISTRADOR': '/admin',
        'ADMINISTRADOR': '/admin',
        'SUPERVISOR': '/supervisor',
        'CONTADOR': '/contable',
        'PUNTO_DE_VENTA': '/punto-de-venta'
      };

      const redirectPath = result.usuario?.rutaDefault 
        || (result.usuario?.rol && fallbackRedirects[result.usuario.rol]) 
        || '/admin';


      // Forzamos la redirección usando el navegador (hard redirect) para evadir bugs
      // y bucles de re-renderizado infinitos que ocurren con router.replace de Next.js
      setTimeout(() => {
        setIsRedirecting(true); 
        setTimeout(() => {
          if (redirectPath) {
            window.location.href = redirectPath;
          }
        }, 400); 
      }, 600); 

      // NO seteamos isLoading a false porque queremos que la pantalla parezca bloqueada 
      // mientras cambiamos de página, previniendo doble click y saltos visuales.

    } catch (err: any) {
      console.error('Error en login:', err);
      // Manejamos el error de forma amigable (axios data vs generic error)
      const axiosMsg = err?.response?.data?.message;
      let msg = axiosMsg || (err instanceof Error ? err.message : 'Error al iniciar sesión');
      
      if (err?.response?.status === 401) {
        msg = 'Credenciales incorrectas';
      } else if (err?.code === 'ECONNABORTED' || msg.includes('timeout')) {
        msg = 'El servidor está iniciando (Cold Start). Sigue intentando un momento más.';
      }

      setError(msg);
      showToast(msg, '', 'error');
      setIsLoading(false);
    }
  };

  // Estilos ultra minimalistas para los toasts
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
      
      {/* --- NOTIFICACIONES FLOTANTES (TOASTS) --- */}
      <div className={`fixed top-6 right-6 z-50 transform transition-all duration-500 ease-out ${toast.show ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
        }`}>
        <div className="relative">
          {/* Tarjeta con efecto glassmorphism */}
          <div className={`${styles.base} rounded-xl shadow-lg min-w-[280px] overflow-hidden backdrop-blur-sm bg-white/95`}>
            {/* Línea superior de color (indicador de estado) */}
            <div className={`h-0.5 bg-gradient-to-r ${styles.accent}`}></div>

            <div className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Título y Nombre */}
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

                  {/* Mensaje descriptivo */}
                  <p className={`text-xs ${styles.detail} mt-1`}>
                    {toast.type === 'success' && toast.userName
                      ? 'Redirigiendo al panel de administración...'
                      : 'Verifica tus credenciales'}
                  </p>

                  {/* Barra de progreso de tiempo (solo éxito) */}
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

                {/* Indicador visual circular */}
                <div className="flex-shrink-0 pl-3">
                  <div className={`w-1.5 h-1.5 rounded-full ${styles.time}`}></div>
                </div>
              </div>
            </div>

            {/* Efecto de brillo superior */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent"></div>
          </div>

          {/* Sombra difusa trasera */}
          <div className="absolute -inset-2 -z-10 bg-gradient-to-br from-gray-200/10 to-transparent blur-sm"></div>
        </div>
      </div>

      {/* --- FONDO DECORATIVO --- */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Orbes de color difuminados */}
        <div className="absolute top-1/4 -left-24 w-96 h-96 bg-gradient-to-br from-[#08557f]/[0.02] to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 -right-24 w-96 h-96 bg-gradient-to-tr from-[#fb851b]/[0.02] to-transparent rounded-full blur-3xl"></div>

        {/* Líneas sutiles */}
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#08557f]/5 to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#08557f]/5 to-transparent"></div>
      </div>

      {/* --- TARJETA DE LOGIN PRINCIPAL --- */}
      <div className="w-full max-w-sm relative z-10">
        
        {/* Header con Logo */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <div className="relative">
              <div className="w-20 h-20 bg-white border border-gray-200 rounded-2xl flex items-center justify-center p-3 shadow-xl shadow-blue-900/10 transition-transform hover:scale-105 hover:rotate-2 overflow-hidden relative">
                <Image
                  src="/favicon.ico"
                  alt="Logo Oficial - Credisur"
                  width={80}
                  height={80}
                  className="object-contain p-2 w-full h-full"
                  priority
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

        {/* Formulario */}
        <div className="mb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Input Usuario */}
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
                placeholder="Nombre"
                autoComplete="username"
                disabled={isLoading}
              />
              {/* Línea animada inferior */}
              <div className={`h-px bg-gradient-to-r from-[#08557f] to-transparent absolute bottom-0 left-0 transition-all duration-500 ${focusedField === 'usuario' ? 'w-full' : 'w-0'
                }`}></div>
            </div>

            {/* Input Contraseña */}
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
              {/* Toggle ver contraseña */}
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

            {/* Botón de Ingreso */}
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

                {/* Spinner de carga (visible solo isLoading) */}
                {isLoading && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border border-gray-300 border-t-[#08557f] rounded-full animate-spin"></div>
                  </div>
                )}
              </button>

              {/* Mensaje de Error */}
              {error && (
                <div className="mt-4 text-center">
                  <div className="inline-flex items-center space-x-2 px-3 py-2 bg-red-50/80 border border-red-100 rounded-lg">
                    <div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse"></div>
                    <span className="text-xs text-red-600">{error}</span>
                  </div>
                </div>
              )}

              {/* Botón de Acceso Offline */}
              {!navigator.onLine && hasValidOfflineSession() && (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={handleOfflineAccess}
                    className="w-full group relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-slate-50 border border-slate-200 rounded-lg transition-all duration-300 group-hover:border-slate-300"></div>

                    <div className="relative py-3 px-4 flex items-center justify-center gap-2">
                      <WifiOff className="h-4 w-4 text-slate-500" />
                      <span className="text-sm font-medium text-slate-600">
                        Continuar Offline ({getOfflineSessionDaysRemaining()}d restantes)
                      </span>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </form>

          {/* Link de recuperacion — solo visible tras 5 clicks en el texto de version */}
          {showRecoveryLink && (
            <div className="text-center mt-4 animate-in fade-in duration-500">
              <a
                href="/recuperar-contrasena"
                className="text-xs text-[#08557f] hover:text-[#064d73] transition-colors duration-200 underline underline-offset-4"
              >
                Recuperar contraseña de administrador
              </a>
            </div>
          )}
        </div>

        {/* Footer / Copyright */}
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center">
              <span
                className="px-3 bg-white text-xs text-gray-400 cursor-default select-none"
                onClick={handleVersionClick}
                title=""
              >
                Versión Alpha 1.0
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest">
              Acceso restringido
            </p>
            <p className="text-[9px] text-gray-300">
              © {currentYear} CrediSur
            </p>
          </div>
        </div>

        {/* Indicador de estado del sistema (Decorativo) */}
        <div className="fixed bottom-8 right-8 flex items-center space-x-2 opacity-40 hover:opacity-100 transition-opacity duration-300">
          <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
          <span className="text-xs text-gray-500">En línea</span>
        </div>
      </div>

      {/* CORTINA DE TRANSICIÓN PREMIUM CON ESTILOS INLINE (ANTI-FOUC) */}
      <div 
        className={`fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center transition-all duration-700 ease-in-out pointer-events-none ${isRedirecting ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
        style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 9999,
            backgroundColor: '#ffffff',
            opacity: isRedirecting ? 1 : 0,
            visibility: isRedirecting ? 'visible' : 'hidden',
            pointerEvents: 'none',
            display: isRedirecting ? 'flex' : 'none',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
        }}
      >
         <div 
            className={`flex flex-col items-center transform transition-all duration-1000 ${isRedirecting ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
         >
            <div 
                className="relative w-24 h-24 mb-8"
                style={{ width: '96px', height: '96px', marginBottom: '32px', position: 'relative' }}
            >
                <div 
                    className="relative w-full h-full bg-white shadow-2xl rounded-2xl flex items-center justify-center border border-gray-100 p-5 z-10"
                    style={{
                        width: '100%',
                        height: '100%',
                        backgroundColor: '#ffffff',
                        borderRadius: '16px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        border: '1px solid #f3f4f6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1.25rem',
                        zIndex: 10
                    }}
                >
                   {/* Usamos img tag simple para evitar dependencias de Next/Image si JS falla */}
                   <img 
                      src="/favicon.ico" 
                      alt="CrediSur" 
                      width="64" 
                      height="64" 
                      style={{ objectFit: 'contain', width: '64px', height: '64px' }}
                   />
                </div>
            </div>

            <h2 className="text-2xl font-bold text-slate-800 mb-2 tracking-tight" style={{ fontFamily: 'sans-serif' }}>
                <span style={{ color: '#08557f' }}>Credi</span><span style={{ color: '#fb851b' }}>Sur</span>
            </h2>
            <p className="text-slate-400 font-medium text-sm mb-10 tracking-widest uppercase text-xs" style={{ fontFamily: 'sans-serif', color: '#94a3b8' }}>Accediendo al sistema seguro</p>

            <div className="flex flex-col items-center gap-3">
               <div 
                   className="w-12 h-12 border-4 border-slate-100 border-t-[#08557f] border-r-[#08557f] rounded-full animate-spin"
                   style={{ 
                       width: '48px', 
                       height: '48px', 
                       border: '4px solid #f1f5f9', 
                       borderTop: '4px solid #08557f', 
                       borderRight: '4px solid #08557f', 
                       borderRadius: '50%' 
                   }}
               ></div>
            </div>
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

// Suspense wrapper requerido por Next.js para useSearchParams()
// sin esto el build falla con "missing-suspense-with-csr-bailout"
export default function LoginPageWrapper() {
  return (
    <Suspense fallback={null}>
      <LoginPage />
    </Suspense>
  );
}
