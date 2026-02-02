'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  Shield, 
  Briefcase, 
  CheckCircle2, 
  AlertCircle,
  Calendar,
  Clock,
  Edit2,
  Key,
  Trash2,
  EyeOff
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function DetalleUsuarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  // Mock Data
  const user = {
    id: id,
    nombres: 'María',
    apellidos: 'Rodríguez',
    correo: 'maria.rodriguez@credisur.com',
    telefono: '300 123 4567',
    rol: 'SUPER_ADMINISTRADOR',
    estado: 'ACTIVO',
    fechaCreacion: '2023-01-15',
    ultimoAcceso: 'Hoy 09:42',
    permisos: ['full_access', 'user_management', 'financial_reports']
  }

  const getRoleBadge = (rol: string) => {
    switch(rol) {
      case 'SUPER_ADMINISTRADOR': return { label: 'Administrador', color: 'bg-violet-100 text-violet-700 border-violet-200', icon: <Shield className="h-4 w-4" /> }
      case 'COORDINADOR': return { label: 'Coordinador', color: 'bg-sky-100 text-sky-700 border-sky-200', icon: <User className="h-4 w-4" /> }
      case 'SUPERVISOR': return { label: 'Supervisor', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: <User className="h-4 w-4" /> }
      case 'COBRADOR': return { label: 'Cobrador', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <Briefcase className="h-4 w-4" /> }
      case 'CONTADOR': return { label: 'Contable', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: <Briefcase className="h-4 w-4" /> }
      default: return { label: rol, color: 'bg-slate-100 text-slate-700 border-slate-200', icon: <User className="h-4 w-4" /> }
    }
  }

  const roleInfo = getRoleBadge(user.rol)

  return (
    <div className="min-h-screen bg-slate-50 relative pb-20">
      {/* Fondo arquitectónico */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-blue-500 opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 w-full p-6 md:p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/admin/users"
              className="p-2 -ml-2 text-slate-400 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="h-6 w-6" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                <span className="text-blue-600">Perfil de</span> <span className="text-orange-500">Usuario</span>
              </h1>
              <p className="text-slate-500 font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                ID: {id}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
             <Link 
                href={`/admin/users/${id}/editar`}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors text-sm shadow-sm flex items-center gap-2"
             >
                <Edit2 className="h-4 w-4" />
                Editar
             </Link>
             <button className="px-4 py-2 bg-rose-50 border border-rose-100 text-rose-600 font-bold rounded-xl hover:bg-rose-100 transition-colors text-sm shadow-sm flex items-center gap-2">
                <EyeOff className="h-4 w-4" />
                Desactivar
             </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tarjeta Principal */}
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center border border-slate-200 text-slate-600 font-bold text-2xl shadow-sm">
                                {user.nombres.charAt(0)}{user.apellidos.charAt(0)}
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900">{user.nombres} {user.apellidos}</h2>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={cn("inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border", roleInfo.color)}>
                                        {roleInfo.icon}
                                        {roleInfo.label}
                                    </span>
                                    <span className={cn(
                                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border",
                                        user.estado === 'ACTIVO' ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-100 text-slate-600 border-slate-200"
                                    )}>
                                        {user.estado === 'ACTIVO' ? 'Activo' : 'Inactivo'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
                        <div className="space-y-1">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Correo Electrónico</span>
                            <div className="flex items-center gap-2 font-medium text-slate-900">
                                <Mail className="h-4 w-4 text-slate-400" />
                                {user.correo}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Teléfono</span>
                            <div className="flex items-center gap-2 font-medium text-slate-900">
                                <Phone className="h-4 w-4 text-slate-400" />
                                {user.telefono}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha de Creación</span>
                            <div className="flex items-center gap-2 font-medium text-slate-900">
                                <Calendar className="h-4 w-4 text-slate-400" />
                                {new Date(user.fechaCreacion).toLocaleDateString()}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Último Acceso</span>
                            <div className="flex items-center gap-2 font-medium text-slate-900">
                                <Clock className="h-4 w-4 text-slate-400" />
                                {user.ultimoAcceso}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actividad Reciente */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                        <h3 className="font-bold text-slate-900">Actividad Reciente</h3>
                    </div>
                    <div className="p-6">
                        <div className="relative border-l-2 border-slate-100 ml-3 space-y-8 py-2">
                            {[
                                { action: 'Inicio de sesión', time: 'Hoy 09:42', icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" /> },
                                { action: 'Aprobación de préstamo #1024', time: 'Ayer 14:30', icon: <CheckCircle2 className="w-4 h-4 text-blue-500" /> },
                                { action: 'Cierre de caja', time: '20 Ene 18:00', icon: <Briefcase className="w-4 h-4 text-orange-500" /> }
                            ].map((item, idx) => (
                                <div key={idx} className="relative pl-8">
                                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center">
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                                    </div>
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                        <span className="font-medium text-slate-900">{item.action}</span>
                                        <span className="text-xs text-slate-500">{item.time}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Sidebar - Permisos */}
            <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-900 flex items-center gap-2">
                            <Key className="h-4 w-4 text-slate-400" />
                            Permisos Asignados
                        </h3>
                        <span className="text-xs font-bold bg-slate-200 text-slate-600 px-2 py-1 rounded-md">{user.permisos.length}</span>
                    </div>
                    <div className="p-4 space-y-2">
                        {user.permisos.map((permiso, idx) => (
                            <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 text-sm">
                                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                <span className="font-medium text-slate-700">{permiso.replace('_', ' ').toUpperCase()}</span>
                            </div>
                        ))}
                    </div>
                    <div className="p-4 border-t border-slate-100 bg-slate-50/30">
                        <button className="w-full py-2 text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors">
                            Gestionar Permisos
                        </button>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  )
}