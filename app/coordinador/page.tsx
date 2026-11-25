'use client'
import { formatFechaBogota } from '@/lib/format-date'
import { estadoDeError, mensajeDeError } from '@/lib/mensaje-de-error'

import PantallaCarga from '@/components/ui/PantallaCarga'
import PanelDeError from '@/components/ui/PanelDeError'
import AvisoActualizando from '@/components/ui/AvisoActualizando'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { DashboardClient } from '@/app/admin/dashboard-client'
import { TimeFilterPeriod } from '@/components/ui/TimeFilter'
import {
  CreditCard,
  Target,
  AlertCircle,
  Banknote,
  Users,
  Wallet,
  PieChart,
  Route,
} from 'lucide-react'
import { dashboardService } from '@/services/dashboard-coordinador-service'
import { prestamosService } from '@/services/prestamos-service'
import { useRealtimeData } from '@/hooks/useRealtimeData'

import { SkeletonTablero } from '@/components/ui/Skeleton'

interface UserData {
  id: string
  nombres: string
  apellidos: string
  rol: string
  correo?: string
  telefono?: string
}

interface MetricItem {
  title: string
  value: number | string
  subValue?: string
  isCurrency: boolean
  change: number | null
  icon: React.ReactNode
  color: string
}

interface QuickAccessItem {
  title: string
  subtitle: string
  icon: React.ReactNode
  color: string
  badge?: number
  href: string
}

interface FrontendDashboardData {
  mainMetrics: MetricItem[]
  quickAccess: QuickAccessItem[]
  recentLoans: Array<{
    client: string
    amount: number
    term: string
    status: string
    date: string
  }>
  topCollectors: Array<{
    name: string
    collected: number
    efficiency: number
    trend: 'up' | 'down'
  }>
  chartData: Array<{
    label: string
    value: number
    target?: number
    date?: string
    time?: string
  }>
  userFullName: string
  userRole: string
}

const TIME_FILTER_MAP: Record<TimeFilterPeriod, string> = {
  today: 'today',
  week: 'week',
  month: 'month',
  year: 'year',
}

const PERIOD_LABEL: Record<TimeFilterPeriod, string> = {
  today: 'Hoy',
  week: 'Semana',
  month: 'Mes',
  year: 'Año',
}

export default function CoordinadorPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const period = (searchParams.get('period') as TimeFilterPeriod) || 'today'

  const [state, setState] = useState<{
    isLoading: boolean
    userData: UserData | null
    dashboardData: FrontendDashboardData | null
    shouldRedirect: string | null
    /*
     * El motivo por el que no se pudo cargar.
     *
     * Aqui el agujero era doble: el `catch` no apagaba siquiera el `isLoading`
     * -salvo en el 401-, asi que un fallo de red dejaba la pantalla cargando
     * PARA SIEMPRE; y mas abajo `if (!state.dashboardData) return null` la
     * dejaba en blanco. Y el servidor devolvia ceros en vez de fallar.
     */
    errorCarga: string | null
    /*
     * Cambiando de periodo con datos ya en pantalla.
     *
     * Aqui el problema era el contrario que en `/admin`: esta pantalla NO
     * vaciaba nada y tampoco volvia a encender el `isLoading`, asi que al
     * cambiar de mes a año se quedaba mostrando las cifras del periodo
     * anterior **en silencio**, con el selector ya en el nuevo. Una cifra
     * que dice ser de un periodo y es de otro es exactamente lo que este
     * proyecto no permite.
     */
    actualizando: boolean
  }>({
    isLoading: true,
    userData: null,
    dashboardData: null,
    shouldRedirect: null,
    errorCarga: null,
    actualizando: false,
  })

  /** Sube con cada «Reintentar» y vuelve a disparar la carga. */
  const [intentoDeCarga, setIntentoDeCarga] = useState(0)

  const initializeDashboard = useCallback(async () => {
    let isMounted = true
    /*
     * Con datos en pantalla se avisa de que se estan actualizando. Sin
     * esto el cambio de periodo era invisible: las mismas cifras de antes
     * bajo un selector que ya decia otra cosa.
     */
    setState((prev) => ({
      ...prev,
      actualizando: !!prev.dashboardData,
      errorCarga: null,
    }))
    const userStr = localStorage.getItem('user')

    if (!userStr) {
      router.replace('/login')
      return
    }

    try {
      const parsedUser = JSON.parse(userStr) as UserData

      if (parsedUser.rol !== 'COORDINADOR') {
        const ROLE_REDIRECT_MAP: Record<string, string> = {
          SUPER_ADMINISTRADOR: '/admin',
          ADMIN: '/admin',
          SUPERVISOR: '/supervisor',
          COBRADOR: '/cobranzas',
          CONTADOR: '/contador/contable',
          PUNTO_DE_VENTA: '/punto-de-venta',
        }
        if (isMounted) {
          setState({
            isLoading: false,
            userData: parsedUser,
            dashboardData: null,
            shouldRedirect: ROLE_REDIRECT_MAP[parsedUser.rol] || '/login',
            errorCarga: null,
            actualizando: false,
          })
        }
        return
      }

      const [backendData, prestamosData] = await Promise.allSettled([
        dashboardService.getDashboardData(TIME_FILTER_MAP[period]),
        prestamosService.obtenerPrestamos({ limit: 5 }),
      ])

      const dashboard = backendData.status === 'fulfilled' ? backendData.value : null
      const prestamos = prestamosData.status === 'fulfilled' ? prestamosData.value : null
      const stats = prestamos?.estadisticas

      const moraPercent =
        stats && stats.montoTotal > 0
          ? ((stats.moraTotal / stats.montoTotal) * 100).toFixed(1)
          : '0'

      const mainMetrics: MetricItem[] = [
        {
          title: `Capital Prestado (${PERIOD_LABEL[period]})`,
          value: Number(dashboard?.metrics?.capitalPrestado ?? 0),
          isCurrency: true,
          change: null,
          icon: <CreditCard className="h-4 w-4" />,
          color: '#3b82f6',
        },
        {
          title: 'Eficiencia de Cobro',
          value: dashboard ? `${dashboard.metrics.efficiency}%` : '0%',
          subValue: `${stats?.pagados || 0} pagados de ${stats?.total || 0}`,
          isCurrency: false,
          change: null,
          icon: <Target className="h-4 w-4" />,
          color: '#8b5cf6',
        },
        {
          title: 'Cartera en Mora',
          value: stats?.moraTotal || 0,
          subValue: `${moraPercent}% del total · ${stats?.atrasados || 0} cuentas`,
          isCurrency: true,
          change: null,
          icon: <AlertCircle className="h-4 w-4" />,
          color: '#f43f5e',
        },
        {
          title: 'Saldo Pendiente',
          value: stats?.montoPendiente || 0,
          subValue: `${stats?.activos || 0} créditos vigentes`,
          isCurrency: true,
          change: null,
          icon: <Banknote className="h-4 w-4" />,
          color: '#f59e0b',
        },
      ]

      const quickAccess: QuickAccessItem[] = [
        {
          title: 'Nuevo Crédito',
          subtitle: 'Definir tasas y cuotas',
          icon: <CreditCard className="h-5 w-5" />,
          color: '#0f172a',
          badge: dashboard?.metrics.pendingApprovals || undefined,
          href: '#',
        },
        {
          title: 'Cobranza',
          subtitle: 'Gestionar pagos',
          icon: <Wallet className="h-5 w-5" />,
          color: '#10b981',
          badge: dashboard?.metrics.delinquentAccounts || undefined,
          href: '/coordinador/pagos/registro',
        },
        {
          title: 'Rutas',
          subtitle: 'Asignación y supervisión',
          icon: <Route className="h-5 w-5" />,
          color: '#6366f1',
          href: '/coordinador/rutas',
        },
        {
          title: 'Clientes',
          subtitle: 'Base de datos',
          icon: <Users className="h-5 w-5" />,
          color: '#08557f',
          href: '/coordinador/clientes',
        },
        {
          title: 'Cuentas Vencidas',
          subtitle: 'Plazos expirados',
          icon: <AlertCircle className="h-5 w-5" />,
          color: '#e11d48',
          href: '/coordinador/cuentas-vencidas',
        },
        {
          title: 'Reportes',
          subtitle: 'Flujo de caja y rendimiento',
          icon: <PieChart className="h-5 w-5" />,
          color: '#f59e0b',
          href: '/coordinador/reportes',
        },
      ]

      const recentLoans = (prestamos?.prestamos || []).slice(0, 5).map((p) => {
        // En el LISTADO `cliente` es el nombre ya compuesto, no el objeto: leer
        // `cliente.nombres` daba undefined y la tarjeta salia con "Cliente".
        const clientName = p.cliente || 'Cliente'
        const dateStr = p.creadoEn
          ? formatFechaBogota(p.creadoEn, { day: '2-digit', month: 'short' })
          : ''
        return {
          client: clientName,
          amount: p.montoTotal || p.montoPrestado || 0,
          term: p.frecuenciaPago || 'Mensual',
          status: p.estado || 'PENDIENTE',
          date: dateStr,
        }
      })

      // El target lo manda el backend POR PUNTO del grafico ("meta nominal
      // diaria"), que es lo que hace falta: `Sem` y `Mes` agrupan por dia, asi
      // que cada barra tiene su propia meta. Aqui se pisaba con una sola cifra
      // global del periodo, y la eficiencia de cada dia salia dividida entre
      // el numero de barras. Se decidio asi en 247aec2 ("usar target
      // especifico por punto del backend en lugar de meta global"), pero ese
      // arreglo se aplico a VistaCoordinador, que no lo renderiza nadie.
      const chartData = (dashboard?.trend || []).map((t) => ({
        label: t.label,
        value: t.value,
        target: Number(t.target || 0),
      }))

      const topCollectors = (dashboard?.topCollectors || []).slice(0, 5).map((c) => ({
        name: c.name,
        collected: c.collected || 0,
        efficiency: c.efficiency || 0,
        trend: (c.trend || 'up') as 'up' | 'down',
      }))

      if (isMounted) {
        setState({
          isLoading: false,
          userData: parsedUser,
          dashboardData: {
            mainMetrics,
            quickAccess,
            recentLoans,
            topCollectors,
            chartData,
            userFullName: `${parsedUser.nombres} ${parsedUser.apellidos}`,
            userRole: 'COORDINADOR',
          },
          shouldRedirect: null,
          errorCarga: null,
          actualizando: false,
        })
      }
    } catch (error) {
      console.error('Error cargando dashboard coordinador:', error)
      // Solo hacer logout en error de autenticación (401), no en errores de red
      if (estadoDeError(error) === 401 || estadoDeError(error) === 401) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        router.replace('/login')
      } else {
        /*
         * Apagar el `isLoading` y DECIR el motivo.
         *
         * Sin el `else`, cualquier fallo que no fuera un 401 dejaba el
         * esqueleto girando indefinidamente: no habia nada que lo apagara.
         */
        setState((prev) => ({
          ...prev,
          isLoading: false,
          actualizando: false,
          errorCarga: mensajeDeError(error, 'No se pudo cargar el panel'),
        }))
      }
    }
    isMounted = false
  }, [router, period])

  useEffect(() => {
    initializeDashboard()
  }, [initializeDashboard])

  // Tiempo real: refrescar dashboard cuando pagos o préstamos cambien
  useRealtimeData(
    ['pagos_actualizados', 'prestamos_actualizados', 'rutas_actualizadas'],
    initializeDashboard,
  )

  useEffect(() => {
    if (state.shouldRedirect) {
      router.replace(state.shouldRedirect)
    }
  }, [state.shouldRedirect, router])

  if (state.isLoading) {
    // Esqueleto con la forma del tablero y no un spinner: el spinner no dice qué va a
    // aparecer y, al llegar los datos, la pantalla salta de golpe. Esto ocupa el mismo
    // sitio que el tablero real, así que no se mueve nada.
    //
    // La redirección de abajo sí sigue con `PantallaCarga`: ahí no se está cargando esta
    // pantalla, se está yendo a otra, y un esqueleto del tablero prometería algo que no
    // va a llegar.
    return (
      <div className="p-4 sm:p-6">
        <SkeletonTablero />
      </div>
    )
  }

  if (state.shouldRedirect) {
    return <PantallaCarga texto="Te estamos redirigiendo..." />
  }

  // Va ANTES del `return null`: si hubo error no hay datos, y sin esto la
  // pantalla se quedaba vacia.
  // El panel completo solo cuando no hay nada que mostrar; con datos en
  // pantalla el fallo va en una franja y no se pierde lo que ya se leia.
  if (state.errorCarga && !state.dashboardData) {
    return (
      <PanelDeError
        titulo="No se pudo cargar el panel"
        mensaje={state.errorCarga}
        onReintentar={() => setIntentoDeCarga((n) => n + 1)}
      />
    )
  }

  if (!state.dashboardData) {
    return null
  }

  return (
    <div className="relative">
      {state.actualizando ? <AvisoActualizando periodo={period} /> : null}
      {state.errorCarga ? (
        <AvisoActualizando
          periodo={period}
          fallo={state.errorCarga}
          onReintentar={() => setIntentoDeCarga((n) => n + 1)}
        />
      ) : null}
      <div
        className={
          state.actualizando
            ? 'pointer-events-none opacity-60 transition-opacity'
            : 'transition-opacity'
        }
        aria-busy={state.actualizando}
      >
        <DashboardClient data={state.dashboardData} />
      </div>
    </div>
  )
}
