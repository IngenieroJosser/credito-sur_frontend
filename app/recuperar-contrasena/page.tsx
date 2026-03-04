'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Lock, ArrowLeft, CheckCircle, Loader2, Eye, EyeOff, ChevronRight } from 'lucide-react'
import Image from 'next/image'
import { apiClient } from '@/lib/api/apiClient'

type Paso = 'correo' | 'codigo' | 'listo'

export default function RecuperarContrasenaPage() {
  const router = useRouter()

  const [paso, setPaso] = useState<Paso>('correo')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [verContrasena, setVerContrasena] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)

  // Campos del formulario
  const [correo, setCorreo] = useState('')
  const [codigo, setCodigo] = useState('')
  const [nuevaContrasena, setNuevaContrasena] = useState('')

  // ── Paso 1: Solicitar el código ────────────────────────────
  const handleSolicitarCodigo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!correo.trim()) { setError('Ingresa tu correo electrónico'); return }
    setError('')
    setCargando(true)
    try {
      await apiClient.post('/auth/forgot-password', { correo: correo.trim() })
      setPaso('codigo')
    } catch {
      // Por seguridad siempre avanzamos (no revelar si el correo existe)
      setPaso('codigo')
    } finally {
      setCargando(false)
    }
  }

  // ── Paso 2: Verificar código y cambiar contraseña ──────────
  const handleResetear = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!codigo.trim() || codigo.length !== 6) { setError('El código debe tener 6 dígitos'); return }
    if (!nuevaContrasena || nuevaContrasena.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    setError('')
    setCargando(true)
    try {
      await apiClient.post('/auth/reset-password', {
        correo: correo.trim(),
        codigo: codigo.trim(),
        nuevaContrasena,
      })
      setPaso('listo')
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Código incorrecto o expirado'
      setError(msg)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 flex items-center justify-center p-4 relative">

      {/* Fondo decorativo — idéntico al login */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-24 w-96 h-96 bg-gradient-to-br from-[#08557f]/[0.02] to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-24 w-96 h-96 bg-gradient-to-tr from-[#fb851b]/[0.02] to-transparent rounded-full blur-3xl" />
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#08557f]/5 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#08557f]/5 to-transparent" />
      </div>

      <div className="w-full max-w-sm relative z-10">

        {/* Logo — idéntico al login */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="w-20 h-20 bg-white border border-gray-200 rounded-2xl flex items-center justify-center p-3 shadow-xl shadow-blue-900/10 overflow-hidden">
              <Image
                src="/favicon.ico"
                alt="Logo CrediSur"
                width={80}
                height={80}
                className="object-contain p-2 w-full h-full"
                priority
              />
            </div>
          </div>
          <h1 className="text-3xl font-light text-gray-800 mb-2">
            <span className="font-normal text-[#08557f]">Credi</span>
            <span className="font-normal text-[#fb851b]">Sur</span>
          </h1>
          <p className="text-xs text-gray-400 uppercase tracking-wider mt-1">
            {paso === 'correo' && 'Recuperación de contraseña'}
            {paso === 'codigo' && 'Verificar código'}
            {paso === 'listo' && 'Contraseña actualizada'}
          </p>
        </div>

        {/* ── PASO 1: CORREO ── */}
        {paso === 'correo' && (
          <form onSubmit={handleSolicitarCodigo} className="space-y-6">
            <div className="relative">
              <div className={`absolute left-0 top-1/2 -translate-y-1/2 transition-all duration-300 ${
                focusedField === 'correo' || correo ? 'opacity-100' : 'opacity-0'
              }`}>
                <Mail className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="email"
                value={correo}
                onChange={e => { setCorreo(e.target.value); setError('') }}
                onFocus={() => setFocusedField('correo')}
                onBlur={() => setFocusedField(null)}
                className="w-full pl-8 pr-4 py-3 bg-transparent border-0 border-b border-gray-200 focus:border-[#08557f] focus:outline-none transition-all duration-300 text-gray-700 placeholder-gray-400 text-sm"
                placeholder="Correo electrónico"
                autoComplete="email"
                disabled={cargando}
              />
              <div className={`h-px bg-gradient-to-r from-[#08557f] to-transparent absolute bottom-0 left-0 transition-all duration-500 ${
                focusedField === 'correo' ? 'w-full' : 'w-0'
              }`} />
            </div>

            <p className="text-xs text-gray-400 text-center leading-relaxed">
              Te enviaremos un código de 6 dígitos a tu correo registrado.
              <br />El código expira en 15 minutos.
            </p>

            {error && (
              <div className="flex items-center space-x-2 px-3 py-2 bg-red-50/80 border border-red-100 rounded-lg">
                <div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse flex-shrink-0" />
                <span className="text-xs text-red-600">{error}</span>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={cargando}
                className="w-full group relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="absolute inset-0 bg-white border border-gray-200 rounded-lg transition-all duration-300 group-hover:border-[#08557f]" />
                <div className="relative py-3 px-4 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 group-hover:text-[#08557f] transition-colors duration-300">
                    {cargando ? 'Enviando...' : 'Enviar código'}
                  </span>
                  <div className={`transition-all duration-300 ${cargando ? 'opacity-0' : 'opacity-100'}`}>
                    <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-[#08557f] group-hover:translate-x-1 transition-all duration-300" />
                  </div>
                </div>
                {cargando && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-4 h-4 text-[#08557f] animate-spin" />
                  </div>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ── PASO 2: CÓDIGO ── */}
        {paso === 'codigo' && (
          <form onSubmit={handleResetear} className="space-y-6">

            {/* Aviso de correo enviado */}
            <div className="text-center">
              <div className="inline-flex items-center gap-2 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-full px-4 py-2">
                <Mail className="h-3.5 w-3.5 text-[#08557f]" />
                Código enviado a <span className="font-semibold text-gray-700">{correo}</span>
              </div>
            </div>

            {/* Input código — 6 dígitos grandes */}
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={codigo}
                onChange={e => { setCodigo(e.target.value.replace(/\D/g, '')); setError('') }}
                onFocus={() => setFocusedField('codigo')}
                onBlur={() => setFocusedField(null)}
                placeholder="• • • • • •"
                required
                className="w-full text-center tracking-[0.6em] text-3xl font-light py-3 bg-transparent border-0 border-b border-gray-200 focus:border-[#08557f] focus:outline-none transition-all duration-300 text-gray-800 placeholder-gray-200"
                disabled={cargando}
              />
              <div className={`h-px bg-gradient-to-r from-[#08557f] to-transparent absolute bottom-0 left-0 transition-all duration-500 ${
                focusedField === 'codigo' ? 'w-full' : 'w-0'
              }`} />
            </div>

            {/* Input nueva contraseña */}
            <div className="relative">
              <div className={`absolute left-0 top-1/2 -translate-y-1/2 transition-all duration-300 ${
                focusedField === 'pass' || nuevaContrasena ? 'opacity-100' : 'opacity-0'
              }`}>
                <Lock className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type={verContrasena ? 'text' : 'password'}
                value={nuevaContrasena}
                onChange={e => { setNuevaContrasena(e.target.value); setError('') }}
                onFocus={() => setFocusedField('pass')}
                onBlur={() => setFocusedField(null)}
                placeholder="Nueva contraseña"
                required
                minLength={6}
                className="w-full pl-8 pr-10 py-3 bg-transparent border-0 border-b border-gray-200 focus:border-[#08557f] focus:outline-none transition-all duration-300 text-gray-700 placeholder-gray-400 text-sm"
                disabled={cargando}
              />
              <button
                type="button"
                onClick={() => setVerContrasena(v => !v)}
                className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {verContrasena ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              <div className={`h-px bg-gradient-to-r from-[#08557f] to-transparent absolute bottom-0 left-0 transition-all duration-500 ${
                focusedField === 'pass' ? 'w-full' : 'w-0'
              }`} />
            </div>

            {error && (
              <div className="flex items-center space-x-2 px-3 py-2 bg-red-50/80 border border-red-100 rounded-lg">
                <div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse flex-shrink-0" />
                <span className="text-xs text-red-600">{error}</span>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={cargando}
                className="w-full group relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="absolute inset-0 bg-white border border-gray-200 rounded-lg transition-all duration-300 group-hover:border-[#08557f]" />
                <div className="relative py-3 px-4 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 group-hover:text-[#08557f] transition-colors duration-300">
                    {cargando ? 'Verificando...' : 'Confirmar nueva contraseña'}
                  </span>
                  <div className={`transition-all duration-300 ${cargando ? 'opacity-0' : 'opacity-100'}`}>
                    <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-[#08557f] group-hover:translate-x-1 transition-all duration-300" />
                  </div>
                </div>
                {cargando && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-4 h-4 text-[#08557f] animate-spin" />
                  </div>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={() => { setPaso('correo'); setError(''); setCodigo('') }}
              className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors text-center py-1"
            >
              Solicitar nuevo código
            </button>
          </form>
        )}

        {/* ── PASO 3: LISTO ── */}
        {paso === 'listo' && (
          <div className="text-center space-y-6">
            <div className="relative mx-auto w-16 h-16">
              <div className="absolute inset-0 bg-emerald-100 rounded-full animate-ping opacity-30" />
              <div className="relative w-full h-full bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center">
                <CheckCircle className="h-7 w-7 text-emerald-500" />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Contraseña actualizada correctamente</p>
              <p className="text-xs text-gray-400 mt-1">Ya puedes ingresar con tu nueva contraseña.</p>
            </div>
            <button
              onClick={() => router.push('/login')}
              className="w-full group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-white border border-gray-200 rounded-lg transition-all duration-300 group-hover:border-[#08557f]" />
              <div className="relative py-3 px-4 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 group-hover:text-[#08557f] transition-colors duration-300">
                  Ir al inicio de sesión
                </span>
                <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-[#08557f] group-hover:translate-x-1 transition-all duration-300" />
              </div>
            </button>
          </div>
        )}

        {/* Volver al login */}
        {paso !== 'listo' && (
          <div className="mt-8 text-center">
            <button
              onClick={() => router.push('/login')}
              className="inline-flex items-center gap-1.5 text-xs text-gray-300 hover:text-gray-500 transition-colors duration-200"
            >
              <ArrowLeft className="h-3 w-3" />
              Volver al inicio de sesión
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="mt-10 text-center space-y-1">
          <p className="text-[10px] text-gray-300 uppercase tracking-widest">Acceso restringido</p>
          <p className="text-[9px] text-gray-200">© {new Date().getFullYear()} CrediSur</p>
        </div>

      </div>
    </div>
  )
}
