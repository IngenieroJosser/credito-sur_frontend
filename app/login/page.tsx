'use client'

import { useState, FormEvent, useEffect } from 'react';
import { Eye, EyeOff, Lock, User, ChevronRight } from 'lucide-react';
import { iniciarSesion } from '@/services/autenticacion-service';
import { LoginData } from '@/lib/types/autenticacion-type';
import { useRouter } from 'next/navigation';

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
        setToast({ ...toast, show: false });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
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
  
      const response = await iniciarSesion(payload);
      const userName = response.usuario.nombres || 'Usuario';
      
      // Guardar sesión
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', response.access_token);
        localStorage.setItem('user', JSON.stringify(response.usuario));
      }
      
      // Mostrar toast de éxito
      showToast('Bienvenido', userName, 'success');
      
      // Redirigir después de 2 segundos
      setTimeout(() => {
        // Redirección centralizada al dashboard administrativo
        router.replace('/admin');
      }, 1500);
      
    } catch {
      setError('Credenciales inválidas');
      showToast('Credenciales incorrectas', '', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Estilos ultra minimalistas
  const toastStyles = {
    success: {
      base: 'bg-white border border-gray-200',
      accent: 'from-[#08557f] to-[#064366]',
      text: 'text-gray-900',
      detail: 'text-[#08557f]',
      time: 'text-[#08557f]'
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
    <div className="min-h-screen bg-white flex items-center justify-center p-4 relative overflow-hidden">
      {/* Fondo arquitectónico ultra sutil */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-white via-gray-50/50 to-white"></div>
        {/* Líneas de estructura */}
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(to right, #08557f 0.5px, transparent 0.5px)`,
          backgroundSize: '96px 1px',
          opacity: 0.03
        }}></div>
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(to bottom, #08557f 0.5px, transparent 0.5px)`,
          backgroundSize: '1px 96px',
          opacity: 0.03
        }}></div>
      </div>

      {/* Toast Ultra Minimalista */}
      <div className={`fixed top-6 right-6 z-50 transform transition-all duration-500 ease-out ${
        toast.show ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
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
                      ? 'Redirigiendo...'
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

      {/* Main Container */}
      <div className="w-full max-w-md relative z-10">
        <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 md:p-10">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#08557f]/5 text-[#08557f] mb-6">
              <User className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-light text-gray-900 tracking-tight mb-2">
              Bienvenido a <span className="font-semibold text-[#08557f]">CrediSur</span>
            </h1>
            <p className="text-sm text-gray-500 font-light">
              Ingresa tus credenciales para acceder al sistema
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="group relative">
                <div className={`absolute left-4 top-1/2 transform -translate-y-1/2 transition-colors duration-200 ${
                  focusedField === 'nombres' ? 'text-[#08557f]' : 'text-gray-400'
                }`}>
                  <User className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  name="nombres"
                  value={formData.nombres}
                  onChange={handleInputChange}
                  onFocus={() => setFocusedField('nombres')}
                  onBlur={() => setFocusedField(null)}
                  className={`w-full pl-12 pr-4 py-3.5 bg-gray-50/50 border rounded-xl outline-none transition-all duration-200 text-sm text-gray-900 ${
                    focusedField === 'nombres' 
                      ? 'border-[#08557f] ring-2 ring-[#08557f]/5 bg-white' 
                      : 'border-gray-100 hover:border-gray-200'
                  }`}
                  placeholder="Usuario"
                />
              </div>

              <div className="group relative">
                <div className={`absolute left-4 top-1/2 transform -translate-y-1/2 transition-colors duration-200 ${
                  focusedField === 'password' ? 'text-[#08557f]' : 'text-gray-400'
                }`}>
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  className={`w-full pl-12 pr-12 py-3.5 bg-gray-50/50 border rounded-xl outline-none transition-all duration-200 text-sm text-gray-900 ${
                    focusedField === 'password' 
                      ? 'border-[#08557f] ring-2 ring-[#08557f]/5 bg-white' 
                      : 'border-gray-100 hover:border-gray-200'
                  }`}
                  placeholder="Contraseña"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#08557f] text-white py-3.5 rounded-xl text-sm font-medium transition-all duration-300 hover:bg-[#064366] hover:shadow-lg hover:shadow-[#08557f]/20 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Iniciar Sesión</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-xs text-gray-400 font-light">
              &copy; {currentYear} CrediSur. Sistema Interno de Gestión.
            </p>
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

export default LoginPage;