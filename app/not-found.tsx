'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Search, X, Grid, ChevronRight, AlertCircle } from 'lucide-react'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

const NotFoundPage = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const isVisible = true
  const [activeModule, setActiveModule] = useState<number | null>(null)
  const pathname = usePathname()
  const [rutaActual, setRutaActual] = useState('')

  useEffect(() => {
    setRutaActual(pathname || '')
  }, [pathname])

  const modules = [
    { id: 1, label: 'Dashboard', path: '/dashboard', icon: Grid },
    { id: 2, label: 'Créditos', path: '/creditos' },
    { id: 3, label: 'Préstamos', path: '/prestamos' },
    { id: 4, label: 'Cobranzas', path: '/cobranzas' },
    { id: 5, label: 'Clientes', path: '/clientes' },
    { id: 6, label: 'Reportes', path: '/reportes' },
  ]

  const goBack = () => {
    if (window.history.length > 1) {
      window.history.back()
    } else {
      window.location.href = '/'
    }
  }

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Fondo ultra minimalista - Líneas arquitectónicas */}
        <div className="absolute inset-0">
        {/* Líneas de cuadrícula sutiles */}
        <div className="absolute inset-0 opacity-5">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(to right, var(--primary) 1px, transparent 1px),
                linear-gradient(to bottom, var(--primary) 1px, transparent 1px)
              `,
              backgroundSize: '64px 64px',
            }}
          ></div>
        </div>
        
        {/* Acentos de color extremadamente sutiles */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-primary/5 to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-secondary/10 to-transparent"></div>
        
        {/* Líneas horizontales decorativas */}
        <div className="absolute top-32 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/5 to-transparent"></div>
        <div className="absolute bottom-32 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/5 to-transparent"></div>
      </div>

      {/* Contenedor principal */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header minimalista */}
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* Logo extremadamente discreto */}
              <Link href="/" className="flex items-center space-x-3 group">
                <div className="relative w-10 h-10 opacity-80 transition-opacity duration-300 group-hover:opacity-100">
                  <Image
                    src="/android-chrome-512x512.png"
                    alt="CrediSur"
                    width={40}
                    height={40}
                    className="object-contain drop-shadow-sm"
                    priority
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-normal text-gray-800 tracking-tight leading-none">
                    CREDI<span className="text-primary font-semibold">SUR</span>
                  </span>
                  <span className="text-[10px] text-gray-400 font-light tracking-widest uppercase mt-0.5">
                    Sistema Financiero
                  </span>
                </div>
              </Link>
            </div>
            
            {/* Acción mínima */}
            <button
              onClick={goBack}
              className="group flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-all duration-300"
            >
              <div className="relative w-5 h-5 overflow-hidden">
                <ArrowLeft className="w-4 h-4 text-gray-400 group-hover:text-primary transition-all duration-300 absolute inset-0 group-hover:-translate-x-0.5" />
                <ArrowLeft className="w-4 h-4 text-secondary transition-all duration-300 absolute inset-0 translate-x-4 group-hover:translate-x-0" />
              </div>
              <span className="text-sm text-gray-500 font-light group-hover:text-primary transition-colors duration-300">
                Regresar
              </span>
            </button>
          </div>
        </div>

        {/* Contenido central - Error 404 */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
          {/* Número de error - Ultra minimalista */}
          <div className={`relative mb-16 fade-in ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          } transition-all duration-700`}>
            <div className="text-[280px] font-light tracking-tighter leading-none text-gray-100 select-none">
              404
            </div>
            
            {/* Imagen superpuesta sutilmente */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-48 h-48 opacity-10">
                <Image
                  src="/android-chrome-512x512.png"
                  alt="CrediSur"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </div>
            
            {/* Mensaje de error */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-center">
                <div className="mb-6 flex justify-center">
                  <div className="inline-flex items-center space-x-2 px-4 py-2 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-full">
                    <AlertCircle className="w-4 h-4 text-secondary" />
                    <span className="text-sm font-medium text-gray-700">
                      Recurso no encontrado
                    </span>
                  </div>
                </div>
                <div className="text-gray-600 font-light text-lg max-w-md mx-auto tracking-wide leading-relaxed">
                  La dirección solicitada no existe en el sistema
                </div>
              </div>
            </div>
          </div>

          {/* Path actual - Muy discreto */}
          <div className={`mb-12 fade-in ${
            isVisible ? 'opacity-100' : 'opacity-0'
          } transition-opacity duration-700 delay-300`}>
            <div className="px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-xl shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-gradient-to-br from-primary to-primary-dark rounded-full"></div>
                <code className="text-xs text-gray-500 font-mono tracking-wide">
                  RUTA ACTUAL: <span className="text-gray-700 font-medium">{rutaActual}</span>
                </code>
              </div>
            </div>
          </div>

          {/* Búsqueda elegante */}
          <div className={`w-full max-w-md mb-12 fade-in ${
            isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          } transition-all duration-500 delay-500`}>
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-white to-gray-50 border border-gray-200 rounded-2xl transition-all duration-500 group-hover:border-primary/30 group-hover:shadow-sm"></div>
              <div className="relative px-4 py-1">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 flex items-center justify-center bg-gray-100/50 rounded-lg transition-colors duration-300 group-hover:bg-primary/5">
                    <Search className="w-4 h-4 text-gray-400 transition-colors duration-300 group-hover:text-primary" />
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar en el sistema..."
                      className="w-full bg-transparent border-none outline-none text-gray-700 placeholder-gray-400 text-sm tracking-wide py-3"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && searchQuery.trim()) {
                          console.log('Buscando:', searchQuery)
                        }
                      }}
                    />
                  </div>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Módulos de navegación - Grid elegante */}
          <div className={`w-full max-w-2xl fade-in ${
            isVisible ? 'opacity-100' : 'opacity-0'
          } transition-opacity duration-500 delay-700`}>
            <div className="mb-4 text-center">
              <div className="text-sm font-medium text-gray-500 uppercase tracking-widest mb-2">
                Navegación Rápida
              </div>
              <div className="w-16 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent mx-auto"></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {modules.map((module) => {
                const Icon = module.icon || ChevronRight
                return (
                  <Link
                    key={module.id}
                    href={module.path}
                    className="group relative"
                    onMouseEnter={() => setActiveModule(module.id)}
                    onMouseLeave={() => setActiveModule(null)}
                  >
                    <div className={`
                      relative overflow-hidden rounded-xl p-4 transition-all duration-500
                      ${activeModule === module.id 
                        ? 'bg-white border border-primary/20 shadow-sm' 
                        : 'bg-gray-50/50 border border-gray-200/50 hover:bg-white hover:border-gray-300'
                      }
                    `}>
                      {/* Efecto de acento naranja sutil */}
                      {activeModule === module.id && (
                        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-secondary/0 via-secondary/40 to-secondary/0"></div>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-gray-800 group-hover:text-primary transition-colors duration-300 mb-0.5">
                            {module.label}
                          </div>
                          <div className="text-xs text-gray-400 font-light tracking-wide">
                            Acceder al módulo
                          </div>
                        </div>
                        <div className={`
                          p-2 rounded-lg transition-all duration-300
                          ${activeModule === module.id 
                            ? 'bg-primary/10' 
                            : 'bg-gray-100/50 group-hover:bg-gray-100'
                          }
                        `}>
                          <Icon className={`
                            w-4 h-4 transition-all duration-300
                            ${activeModule === module.id 
                              ? 'text-primary translate-x-0.5' 
                              : 'text-gray-400 group-hover:text-gray-600'
                            }
                          `} />
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Acción principal */}
          <div className={`mt-16 fade-in ${
            isVisible ? 'opacity-100' : 'opacity-0'
          } transition-opacity duration-500 delay-900`}>
            <Link
              href="/dashboard"
              className="group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white to-gray-50 border border-gray-200 rounded-2xl transition-all duration-500 group-hover:border-primary/30 group-hover:shadow-sm"></div>
              
              {/* Efecto de acento naranja */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-secondary/0 via-secondary to-secondary/0 transition-all duration-500 group-hover:w-full group-hover:opacity-5"></div>
              
              <div className="relative px-6 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-dark rounded-xl flex items-center justify-center">
                    <div className="relative w-6 h-6">
                      <Image
                        src="/android-chrome-512x512.png"
                        alt="Dashboard"
                        fill
                        className="object-contain opacity-90"
                      />
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-800 group-hover:text-primary transition-colors duration-300">
                      Ir al Dashboard Principal
                    </div>
                    <div className="text-sm text-gray-500 font-light">
                      Acceder al panel de control del sistema
                    </div>
                  </div>
                </div>
                <div className="relative overflow-hidden w-5 h-5">
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary transition-all duration-300 absolute inset-0 group-hover:translate-x-1" />
                  <ChevronRight className="w-5 h-5 text-secondary transition-all duration-300 absolute inset-0 -translate-x-4 group-hover:translate-x-0" />
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Footer ultra minimalista */}
        <div className="px-8 py-6 border-t border-gray-100/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="relative w-6 h-6 opacity-60">
                  <Image
                    src="/android-chrome-512x512.png"
                    alt="CF"
                    width={24}
                    height={24}
                    className="object-contain"
                  />
                </div>
                <span className="text-xs text-gray-400 font-light tracking-wide">
                  <span className="text-gray-500">ERROR 404</span> • v1.0.0
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-gray-400 font-light">SISTEMA ACTIVO</span>
              </div>
              <div className="w-px h-4 bg-gray-200"></div>
              <div className="text-xs text-gray-400 font-light">
                {new Date().toLocaleDateString('es-ES', { 
                  day: '2-digit', 
                  month: 'short', 
                  year: 'numeric' 
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Efectos visuales sutiles */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Partículas flotantes sutiles */}
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="absolute w-px h-32 bg-gradient-to-b from-transparent via-primary/10 to-transparent"
            style={{
              left: `${10 + i * 25}%`,
              top: '20%',
              transform: `rotate(${i * 15}deg)`,
              animation: `float 25s ease-in-out ${i * 4}s infinite`
            }}
          ></div>
        ))}
        
        {/* Destello naranja sutil en hover sobre módulos */}
        {activeModule && (
          <div 
            className="absolute w-96 h-96 rounded-full bg-gradient-to-r from-secondary/10 to-transparent blur-3xl transition-all duration-1000"
            style={{
              left: '50%',
              top: '60%',
              transform: 'translate(-50%, -50%)',
              opacity: 0.4
            }}
          ></div>
        )}
      </div>

      <style jsx global>{`
        @keyframes float {
          0%, 100% { 
            transform: translateY(0) rotate(var(--tw-rotate)); 
            opacity: 0;
          }
          50% { 
            transform: translateY(-80px) rotate(var(--tw-rotate)); 
            opacity: 0.1;
          }
        }
        
        .fade-in {
          animation: fadeInUp 0.8s ease-out forwards;
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        /* Estilos de scroll personalizados */
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        
        ::-webkit-scrollbar-track {
          background: rgba(var(--primary-rgb), 0.05);
          border-radius: 3px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: rgba(var(--primary-rgb), 0.2);
          border-radius: 3px;
          transition: background 0.3s ease;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(var(--primary-rgb), 0.3);
        }
        
        /* Selección de texto sutil */
        ::selection {
          background: rgba(var(--primary-rgb), 0.15);
          color: var(--primary);
        }
        
        ::-moz-selection {
          background: rgba(var(--primary-rgb), 0.15);
          color: var(--primary);
        }
      `}</style>
    </div>
  )
}

export default NotFoundPage
