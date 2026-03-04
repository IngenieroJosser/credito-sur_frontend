'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, KeyRound, Lock, ArrowLeft, CheckCircle, Loader2, Eye, EyeOff } from 'lucide-react'
import { apiRequest } from '@/lib/api/api'

type Paso = 'correo' | 'codigo' | 'listo'

export default function RecuperarContrasenaPage() {
  const router = useRouter()

  const [paso, setPaso] = useState<Paso>('correo')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [verContrasena, setVerContrasena] = useState(false)

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
      await apiRequest('POST', '/auth/forgot-password', { correo: correo.trim() }, { cacheTTL: 0 })
      setPaso('codigo')
    } catch {
      // Por seguridad siempre avanzamos al siguiente paso
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
      await apiRequest('POST', '/auth/reset-password', {
        correo: correo.trim(),
        codigo: codigo.trim(),
        nuevaContrasena,
      }, { cacheTTL: 0 })
      setPaso('listo')
    } catch (err: any) {
      setError(err?.message || 'Código incorrecto o expirado. Solicita uno nuevo.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#08557f] to-slate-900 flex items-center justify-center p-4">
      {/* Fondo decorativo */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 space-y-6">

          {/* Encabezado */}
          <div className="text-center">
            <div className="inline-flex p-3 rounded-2xl bg-blue-50 mb-4">
              <KeyRound className="h-7 w-7 text-[#08557f]" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {paso === 'listo' ? '¡Contraseña actualizada!' : 'Recuperar contraseña'}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {paso === 'correo' && 'Ingresa tu correo y te enviaremos un código de 6 dígitos.'}
              {paso === 'codigo' && `Ingresa el código que enviamos a ${correo}`}
              {paso === 'listo' && 'Ya puedes iniciar sesión con tu nueva contraseña.'}
            </p>
          </div>

          {/* ── PASO 1: CORREO ── */}
          {paso === 'correo' && (
            <form onSubmit={handleSolicitarCodigo} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    value={correo}
                    onChange={e => setCorreo(e.target.value)}
                    placeholder="tucorreo@ejemplo.com"
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#08557f]/30 focus:border-[#08557f] text-slate-900 placeholder:text-slate-400 text-sm font-medium"
                  />
                </div>
              </div>

              {error && (
                <p className="text-rose-600 text-xs font-bold bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={cargando}
                className="w-full py-3 rounded-xl bg-[#08557f] hover:bg-[#064d73] text-white font-bold text-sm transition-all shadow-lg shadow-[#08557f]/20 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {cargando ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</> : 'Enviar código'}
              </button>
            </form>
          )}

          {/* ── PASO 2: CÓDIGO + NUEVA CONTRASEÑA ── */}
          {paso === 'codigo' && (
            <form onSubmit={handleResetear} className="space-y-4">
              {/* Info aviso */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700 font-medium">
                Revisa tu bandeja de entrada y spam. El código expira en <strong>15 minutos</strong>.
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                  Código de 6 dígitos
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={codigo}
                  onChange={e => setCodigo(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  required
                  className="w-full text-center tracking-[0.5em] text-2xl font-black py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#08557f]/30 focus:border-[#08557f] text-slate-900 placeholder:text-slate-300 placeholder:tracking-normal"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                  Nueva contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type={verContrasena ? 'text' : 'password'}
                    value={nuevaContrasena}
                    onChange={e => setNuevaContrasena(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                    minLength={6}
                    className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#08557f]/30 focus:border-[#08557f] text-slate-900 placeholder:text-slate-400 text-sm font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setVerContrasena(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {verContrasena ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-rose-600 text-xs font-bold bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={cargando}
                className="w-full py-3 rounded-xl bg-[#08557f] hover:bg-[#064d73] text-white font-bold text-sm transition-all shadow-lg shadow-[#08557f]/20 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {cargando ? <><Loader2 className="h-4 w-4 animate-spin" /> Verificando...</> : 'Cambiar contraseña'}
              </button>

              <button
                type="button"
                onClick={() => { setPaso('correo'); setError('') }}
                className="w-full py-2 text-slate-500 hover:text-slate-700 text-xs font-medium transition-colors"
              >
                Solicitar nuevo código
              </button>
            </form>
          )}

          {/* ── PASO 3: LISTO ── */}
          {paso === 'listo' && (
            <div className="text-center space-y-5">
              <div className="inline-flex p-4 rounded-full bg-emerald-50">
                <CheckCircle className="h-10 w-10 text-emerald-500" />
              </div>
              <p className="text-slate-600 text-sm">
                Tu contraseña fue actualizada correctamente. Ahora puedes ingresar al sistema.
              </p>
              <button
                onClick={() => router.push('/login')}
                className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition-all shadow-lg"
              >
                Ir al inicio de sesión
              </button>
            </div>
          )}

          {/* Volver al login */}
          {paso !== 'listo' && (
            <button
              onClick={() => router.push('/login')}
              className="w-full flex items-center justify-center gap-2 text-slate-400 hover:text-slate-600 text-xs font-medium transition-colors pt-2"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Volver al inicio de sesión
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
