'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Home, Search, AlertTriangle, ChevronLeft } from 'lucide-react'
import { useState, useEffect } from 'react'

const NotFoundPage = () => {
  const [path, setPath] = useState('')
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    // Obtener la ruta actual
    setPath(window.location.pathname)
    
    // Verificar estado de conexión
    setIsOnline(navigator.onLine)
    
    // Efecto de partículas sutil
    const particles = document.querySelectorAll('.particle') as NodeListOf<HTMLElement>
    particles.forEach((particle, i) => {
      particle.style.animationDelay = `${i * 0.5}s`
    })
  }, [])

  const goBack = () => {
    if (window.history.length > 1) {
      window.history.back()
    } else {
      window.location.href = '/'
    }
  }

  const searchSuggestions = [
    { label: 'Dashboard Principal', path: '/dashboard' },
    { label: 'Gestión de Créditos', path: '/creditos' },
    { label: 'Cartera de Préstamos', path: '/prestamos' },
    { label: 'Gestión de Cobranzas', path: '/cobranzas' },
    { label: 'Reportes Financieros', path: '/reportes' },
    { label: 'Clientes', path: '/clientes' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Fondo minimalista - Coherente con login */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-24 w-96 h-96 bg-gradient-to-br from-[#08557f]/[0.02] to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 -right-24 w-96 h-96 bg-gradient-to-tr from-[#fb851b]/[0.02] to-transparent rounded-full blur-3xl"></div>
        
        {/* Líneas de estructura financiera sutiles */}
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#08557f]/10 to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#08557f]/10 to-transparent"></div>
        
        {/* Partículas decorativas */}
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="particle absolute w-px h-16 bg-gradient-to-b from-transparent via-[#08557f]/5 to-transparent"
            style={{
              left: `${10 + i * 15}%`,
              top: '20%',
              transform: `rotate(${15 * i}deg)`,
            }}
          ></div>
        ))}
      </div>

      {/* Contenedor principal */}
      <div className="w-full max-w-4xl relative z-10">
        {/* Encabezado con logo */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="relative">
              <div className="w-16 h-16 bg-white border border-gray-200 rounded-xl flex items-center justify-center shadow-sm">
                {/* Logo del sistema - Usando la imagen proporcionada */}
                <div className="relative w-12 h-12">
                  <Image
                    src="/android-chrome-512x512.png"
                    alt="CrediFinanzas Logo"
                    width={48}
                    height={48}
                    className="object-contain"
                    priority
                  />
                  {/* Indicador de estado del sistema */}
                  <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border border-white ${
                    isOnline ? 'bg-green-400' : 'bg-red-400'
                  }`}></div>
                </div>
              </div>
              {/* Indicador de error */}
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-[#fb851b] to-[#e07415] rounded-full flex items-center justify-center">
                <AlertTriangle className="w-3 h-3 text-white" />
              </div>
            </div>
          </div>
          
          <h1 className="text-4xl font-light text-gray-800 tracking-tight mb-2">
            <span className="font-normal text-[#08557f]">Credi</span>Finanzas
          </h1>
          <p className="text-xs text-gray-400 tracking-widest uppercase mt-2">
            Sistema de Gestión Financiera • 404
          </p>
        </div>

        {/* Contenido principal del error */}
        <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-sm p-8 mb-8">
          {/* Código de error destacado */}
          <div className="text-center mb-10">
            <div className="inline-flex items-baseline mb-4">
              <span className="text-9xl font-light text-[#08557f]/10 tracking-tighter">4</span>
              <span className="text-9xl font-light text-[#08557f]/10 tracking-tighter mx-2">0</span>
              <span className="text-9xl font-light text-[#08557f]/10 tracking-tighter">4</span>
            </div>
            
            <div className="mb-6">
              <h2 className="text-2xl font-medium text-gray-800 mb-2">
                Recurso No Encontrado
              </h2>
              <p className="text-gray-600 max-w-md mx-auto">
                La ruta especificada no existe o ha sido movida a otra ubicación.
              </p>
            </div>

            {/* Detalles técnicos (solo visibles para roles técnicos) */}
            <div className="inline-block bg-gray-50/80 border border-gray-200 rounded-lg px-4 py-3 mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-[#08557f] rounded-full animate-pulse"></div>
                <code className="text-sm text-gray-500 font-mono">
                  Ruta: <span className="text-gray-700">{path}</span>
                </code>
              </div>
            </div>
          </div>

          {/* Acciones principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {/* Botón para volver */}
            <button
              onClick={goBack}
              className="group relative overflow-hidden bg-white border border-gray-300 hover:border-[#08557f]/30 rounded-xl p-5 transition-all duration-300 hover:shadow-sm"
            >
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-gray-400 to-gray-300 transition-all duration-300 group-hover:from-[#08557f] group-hover:to-[#063a58]"></div>
              
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-100 group-hover:bg-[#08557f]/5 rounded-lg flex items-center justify-center transition-colors duration-300">
                  <ChevronLeft className="w-5 h-5 text-gray-500 group-hover:text-[#08557f] transition-colors duration-300" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-gray-800 group-hover:text-[#08557f] transition-colors duration-300">
                    Volver atrás
                  </div>
                  <div className="text-sm text-gray-500">
                    Regresar a la página anterior
                  </div>
                </div>
              </div>
            </button>

            {/* Botón para ir al dashboard */}
            <Link
              href="/dashboard"
              className="group relative overflow-hidden bg-white border border-gray-300 hover:border-[#08557f]/30 rounded-xl p-5 transition-all duration-300 hover:shadow-sm"
            >
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-gray-400 to-gray-300 transition-all duration-300 group-hover:from-[#08557f] group-hover:to-[#063a58]"></div>
              
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-100 group-hover:bg-[#08557f]/5 rounded-lg flex items-center justify-center transition-colors duration-300">
                  <Home className="w-5 h-5 text-gray-500 group-hover:text-[#08557f] transition-colors duration-300" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-gray-800 group-hover:text-[#08557f] transition-colors duration-300">
                    Ir al Dashboard
                  </div>
                  <div className="text-sm text-gray-500">
                    Acceder al panel principal
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* Búsqueda y sugerencias */}
          <div className="mb-8">
            <div className="mb-4">
              <div className="flex items-center space-x-2 mb-3">
                <Search className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">
                  Buscar en el sistema
                </span>
              </div>
              
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar módulos, clientes, reportes..."
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:border-[#08557f] focus:outline-none focus:ring-1 focus:ring-[#08557f]/20 transition-all duration-300 text-gray-700 placeholder-gray-400"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      // Implementar búsqueda
                      console.log('Buscar:', e.currentTarget.value)
                    }
                  }}
                />
                <button className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200">
                  <Search className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Sugerencias de navegación */}
            <div>
              <div className="text-sm font-medium text-gray-700 mb-3">
                Páginas frecuentes
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {searchSuggestions.map((item, index) => (
                  <Link
                    key={index}
                    href={item.path}
                    className="px-3 py-2.5 bg-gray-50 hover:bg-[#08557f]/5 border border-gray-200 hover:border-[#08557f]/30 rounded-lg transition-all duration-200 group"
                  >
                    <div className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full group-hover:bg-[#08557f] transition-colors duration-300"></div>
                      <span className="text-sm text-gray-600 group-hover:text-[#08557f] transition-colors duration-300">
                        {item.label}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Información de soporte */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[#08557f] to-[#063a58]"></div>
                <span className="text-sm text-gray-600">
                  Si el problema persiste, contacte al soporte técnico
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <span className="text-xs text-gray-500">
                  {isOnline ? 'Sistema en línea' : 'Sin conexión'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Pie de página */}
        <div className="text-center space-y-4">
          {/* Información de versión */}
          <div className="inline-flex items-center space-x-4 px-4 py-2 bg-white/50 backdrop-blur-sm border border-gray-200 rounded-full">
            <span className="text-xs text-gray-500">v1.0.0</span>
            <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
            <span className="text-xs text-gray-500">ID: ERROR_404</span>
            <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
            <span className="text-xs text-gray-500">{new Date().toLocaleDateString()}</span>
          </div>

          {/* Información legal */}
          <div className="space-y-1">
            <p className="text-[10px] text-gray-400 tracking-widest uppercase">
              Sistema de Gestión Financiera • Solo uso autorizado
            </p>
            <p className="text-[9px] text-gray-300">
              © {new Date().getFullYear()} CrediFinanzas • Código de error 404-NSF
            </p>
          </div>
        </div>
      </div>

      {/* Efecto de animación para las partículas */}
      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) rotate(var(--tw-rotate));
            opacity: 0;
          }
          50% {
            transform: translateY(-40px) rotate(var(--tw-rotate));
            opacity: 0.5;
          }
        }
        
        .particle {
          animation: float 8s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}

export default NotFoundPage