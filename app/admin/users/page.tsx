'use client'

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

import { useNotification } from '@/components/providers/NotificationProvider';
import { usuariosService } from '@/services/usuarios-service';
import { RolUsuario, EstadoUsuario } from '@/types/enums';
import { apiRequest } from '@/lib/api/api';

import {
  Search,
  UserPlus,
  Edit2,
  Key,
  Eye,
  EyeOff,
  Check,
  ChevronDown,
  Shield,
  Users,
  Mail,
  Briefcase,
  Sparkles,
  LayoutGrid,
  List,
  Trash2,
  Save,
  ChevronLeft,
  XCircle,
  ChevronRight,
  TrendingUp,
  MapPin,
  Calendar,
  DollarSign,
  Clock,
  AlertCircle,
  CheckCircle2,
  Wallet,
  ShoppingBag,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { usePermission } from '@/hooks/usePermission';
import { permisosPorRol } from '@/lib/permissions';

// Tipos importados de enums
// type RolUsuario = ... (Removed)
// type EstadoUsuario = ... (Removed)

interface User {
  id: string;
  nombres: string;
  apellidos: string;
  correo: string;
  telefono: string;
  rol: RolUsuario;
  estado: EstadoUsuario;
  fechaCreacion: string;
  ultimoAcceso: string;
  permisos: string[];
}

interface Role {
  id: RolUsuario;
  nombre: string;
  label: string;
  descripcion: string;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
}

const UserManagementPage = () => {
  const { showNotification } = useNotification();
  
  // Integración con autenticación real
  const { user: currentUser, loading: authLoading } = useAuth();
  const currentUserRole: RolUsuario = currentUser?.rol as RolUsuario;

  const { can, canForPath } = usePermission();
  const permitido = can('USUARIOS_VIEW') || canForPath('/users');
  const puedeCrear = can('USUARIOS_CREATE') || canForPath('/users');
  const puedeEditar = can('USUARIOS_EDIT') || canForPath('/users');
  const puedeEliminar = can('USUARIOS_DELETE') || canForPath('/users');
  const puedeGestionarPermisos = can('USUARIOS_MANAGE') || canForPath('/users');

  // --- ESTADO DE USUARIOS ---
  const [users, setUsers] = useState<User[]>([]);

  /* Removed early return */
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await usuariosService.obtenerTodos();
      const mappedUsers: User[] = data.map(u => ({
        id: u.id,
        nombres: u.nombres,
        apellidos: u.apellidos,
        correo: u.correo,
        telefono: u.telefono || '',
        rol: u.rol as RolUsuario,
        estado: u.estado as EstadoUsuario,
        fechaCreacion: new Date(u.creadoEn).toLocaleDateString('es-CO'),
        ultimoAcceso: u.ultimoIngreso ? new Date(u.ultimoIngreso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) : 'Nunca',
        permisos: u.permisos || [] 
      }));
      setUsers(mappedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      showNotification('error', 'No se pudieron cargar los usuarios', 'Error de Conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && currentUser) {
      fetchUsers();
    }
  }, [authLoading, currentUser]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus] = useState('all');
  // Alternar entre vista de tabla (list) o tarjetas (grid)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [detalle, setDetalle] = useState<{
    dineroCaja: number;
    recaudoDia: number;
    metaDiaria: number;
    porcentajeMeta: number;
    rutaNombre: string;
    zona: string;
    progreso: number;
    enMora: number;
    gastosHoy: number;
    actividadReciente: Array<{ time: string; action: string; detail: string; amount?: string; type: 'in' | 'out' | 'neutral' }>;
    ingresosDia: number;
    egresosDia: number;
    balanceDia: number;
    gastosCategorias: Array<{ categoria: string; monto: number }>;
    rutasActivas: number;
    rutasTotal: number;
    rutasInactivas: number;
  }>({
    dineroCaja: 0,
    recaudoDia: 0,
    metaDiaria: 0,
    porcentajeMeta: 0,
    rutaNombre: '',
    zona: '',
    progreso: 0,
    enMora: 0,
    gastosHoy: 0,
    actividadReciente: [],
    ingresosDia: 0,
    egresosDia: 0,
    balanceDia: 0,
    gastosCategorias: [],
    rutasActivas: 0,
    rutasTotal: 0,
    rutasInactivas: 0,
  });

  const [timelineCount, setTimelineCount] = useState(20);
  const [timelinePage, setTimelinePage] = useState(1);
  const [timelineLimit] = useState(20);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [filtroFechaInicio, setFiltroFechaInicio] = useState<string>('');
  const [filtroFechaFin, setFiltroFechaFin] = useState<string>('');

  const roleTheme = React.useMemo(() => {
    const base = {
      accentIcon: 'text-blue-600',
      kpiBorderHover: 'hover:border-blue-300',
    };
    if (!selectedUser?.rol) return base;
    switch (selectedUser.rol) {
      case RolUsuario.COBRADOR:
        return { accentIcon: 'text-blue-600', kpiBorderHover: 'hover:border-blue-300' };
      case RolUsuario.CONTADOR:
        return { accentIcon: 'text-amber-600', kpiBorderHover: 'hover:border-amber-300' };
      case RolUsuario.PUNTO_DE_VENTA:
        return { accentIcon: 'text-teal-600', kpiBorderHover: 'hover:border-teal-300' };
      case RolUsuario.COORDINADOR:
        return { accentIcon: 'text-indigo-600', kpiBorderHover: 'hover:border-indigo-300' };
      case RolUsuario.SUPERVISOR:
        return { accentIcon: 'text-violet-600', kpiBorderHover: 'hover:border-violet-300' };
      case RolUsuario.ADMIN:
      case RolUsuario.SUPER_ADMINISTRADOR:
        return { accentIcon: 'text-sky-600', kpiBorderHover: 'hover:border-sky-300' };
      default:
        return base;
    }
  }, [selectedUser]);


  // Define available modules based on the selected user's role using useMemo to avoid bad setState calls
  const availableModules = React.useMemo(() => {
    if (!selectedUser) return [];
    
    // Usamos los módulos del SUPER_ADMINISTRADOR como base para la lista de permisos disponibles
    const superAdminModules = permisosPorRol['SUPER_ADMINISTRADOR'];
    const flattenedModules: any[] = [];

    superAdminModules.forEach(module => {
      if (module.submodulos && module.submodulos.length > 0) {
        module.submodulos.forEach(sub => {
          flattenedModules.push({
            id: sub.id,
            label: sub.nombre,
            description: sub.nombre,
            category: module.nombre,
            roles: sub.roles
          });
        });
      } else {
        flattenedModules.push({
          id: module.id,
          label: module.nombre,
          description: module.nombre,
          category: 'General',
          roles: module.roles
        });
      }
    });
    
    return flattenedModules;
  }, [selectedUser]);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Bloquear scroll del body cuando hay un modal abierto
  useEffect(() => {
    if (isCreateModalOpen || isEditModalOpen || isPermissionsModalOpen || isDeleteModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isCreateModalOpen, isEditModalOpen, isPermissionsModalOpen, isDeleteModalOpen]);

  interface UserFormData {
    nombres: string;
    apellidos: string;
    correo: string;
    telefono: string;
    password: string;
    rol: RolUsuario;
    estado: EstadoUsuario;
  }

  const [formData, setFormData] = useState<UserFormData>({
    nombres: '',
    apellidos: '',
    correo: '',
    telefono: '',
    password: '',
    rol: RolUsuario.COBRADOR,
    estado: EstadoUsuario.ACTIVO
  });

  const roles: Role[] = [
    { id: RolUsuario.SUPER_ADMINISTRADOR, nombre: 'Administrador', label: 'Administrador', descripcion: 'Acceso total al sistema', color: 'text-violet-600', bgColor: 'bg-violet-50', icon: <Shield className="h-3.5 w-3.5" /> },
    { id: RolUsuario.ADMIN, nombre: 'Admin General', label: 'Admin General', descripcion: 'Gestión operativa y financiera', color: 'text-blue-600', bgColor: 'bg-blue-50', icon: <Briefcase className="h-3.5 w-3.5" /> },
    { id: RolUsuario.COORDINADOR, nombre: 'Coordinador', label: 'Coordinador', descripcion: 'Gestión operativa', color: 'text-sky-600', bgColor: 'bg-sky-50', icon: <Users className="h-3.5 w-3.5" /> },
    { id: RolUsuario.SUPERVISOR, nombre: 'Supervisor', label: 'Supervisor', descripcion: 'Supervisión y control', color: 'text-violet-600', bgColor: 'bg-violet-50', icon: <Eye className="h-3.5 w-3.5" /> },
    { id: RolUsuario.COBRADOR, nombre: 'Cobrador', label: 'Cobrador', descripcion: 'Gestión de cobranza', color: 'text-emerald-600', bgColor: 'bg-emerald-50', icon: <Briefcase className="h-3.5 w-3.5" /> },
    { id: RolUsuario.CONTADOR, nombre: 'Contable', label: 'Contable', descripcion: 'Operaciones financieras', color: 'text-amber-600', bgColor: 'bg-amber-50', icon: <Sparkles className="h-3.5 w-3.5" /> },
    { id: RolUsuario.PUNTO_DE_VENTA, nombre: 'Punto de Venta', label: 'Punto de Venta', descripcion: 'Ventas de artículos', color: 'text-teal-600', bgColor: 'bg-teal-50', icon: <ShoppingBag className="h-3.5 w-3.5" /> }
  ];

  const roleFilters = [
    { id: 'all', label: 'Todos', nombre: 'Todos', color: 'text-slate-600', bgColor: 'bg-slate-100' },
    ...roles
  ];

  const filteredUsers = users.filter(user => {
    const fullName = `${user.nombres} ${user.apellidos}`.toLowerCase();
    const matchesSearch =
      fullName.includes(searchTerm.toLowerCase()) ||
      user.correo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.rol === filterRole;
    const matchesStatus = filterStatus === 'all' || user.estado === filterStatus;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const stats = {
    total: users.length,
    active: users.filter(u => u.estado === EstadoUsuario.ACTIVO).length,
    admins: users.filter(u => u.rol === RolUsuario.SUPER_ADMINISTRADOR).length,
    inactive: users.filter(u => u.estado !== EstadoUsuario.ACTIVO).length
  };

  // PAGINACIÓN
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  // Reset de página movido a los manejadores de eventos directos


  const handleOpenCreateModal = () => {
    setFormData({
      nombres: '',
      apellidos: '',
      correo: '',
      telefono: '',
      password: '',
      rol: RolUsuario.COBRADOR,
      estado: EstadoUsuario.ACTIVO
    });
    setSelectedPermissions([]);
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (user: User) => {
    if (user.rol === RolUsuario.SUPER_ADMINISTRADOR && currentUserRole !== RolUsuario.SUPER_ADMINISTRADOR) {
      return;
    }

    setSelectedUser(user);
    setFormData({
      nombres: user.nombres,
      apellidos: user.apellidos,
      correo: user.correo,
      telefono: user.telefono,
      password: '', // No password on edit
      rol: user.rol,
      estado: user.estado
    });
    setSelectedPermissions(user.permisos);
    setIsEditModalOpen(true);
  };

  const handleOpenDetailModal = (user: User) => {
    setSelectedUser(user);
    setIsDetailModalOpen(true);
    if (user.rol === RolUsuario.COBRADOR) {
      (async () => {
        try {
          const routesResp = await apiRequest<any[]>('GET', `/routes?cobradorId=${user.id}&activa=true`);
          const ruta = routesResp?.[0];
          if (!ruta) return;
          const routeId = ruta.id;
          const detalleRuta = await apiRequest<any>('GET', `/reports/operational/route-detail/${routeId}?period=today`);
          const resumenRuta = await apiRequest<any>('GET', `/reports/operational/coordinator?period=today&routeId=${routeId}`);
          const gastosResp = await apiRequest<any>('GET', `/accounting/gastos?rutaId=${routeId}&estado=APROBADO&page=1&limit=50`);
          
          const recaudo = Number(detalleRuta?.estadisticas?.totalRecaudado || 0);
          const meta = Number(resumenRuta?.rendimientoRutas?.[0]?.meta || 0);
          const porcentaje = meta > 0 ? Math.round((recaudo / meta) * 100) : 0;
          const pagos = (detalleRuta?.pagosRecientes || []).map((p: any) => ({
            time: new Date(p.fecha).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }),
            action: 'Pago registrado',
            detail: `Cliente: ${p.cliente}`,
            amount: `+$${Number(p.monto).toLocaleString('es-CO')}`,
            type: 'in' as const,
          }));
          const gastosHoy = Array.isArray(gastosResp?.items)
            ? gastosResp.items
                .filter((g: any) => new Date(g.fecha).toDateString() === new Date().toDateString())
                .reduce((s: number, g: any) => s + Number(g.monto || 0), 0)
            : 0;

          setDetalle({
            dineroCaja: recaudo,
            recaudoDia: recaudo,
            metaDiaria: meta,
            porcentajeMeta: porcentaje,
            rutaNombre: detalleRuta?.ruta?.nombre || '',
            zona: detalleRuta?.ruta?.zona || '',
            progreso: porcentaje,
            enMora: 0,
            gastosHoy,
            actividadReciente: pagos,
            ingresosDia: 0,
            egresosDia: 0,
            balanceDia: 0,
            gastosCategorias: [],
            rutasActivas: 1,
            rutasTotal: 1,
            rutasInactivas: 0,
          });
        } catch (e) {
          console.error('Error cargando detalle de cobrador:', e);
        }
      })();
    }
    // Historial del usuario (auditoría)
    (async () => {
      try {
        setTimelineLoading(true);
        const params = new URLSearchParams();
        params.set('page', '1');
        params.set('limit', `${timelineLimit}`);
        if (filtroFechaInicio) params.set('startDate', new Date(filtroFechaInicio).toISOString());
        if (filtroFechaFin) params.set('endDate', new Date(filtroFechaFin).toISOString());
        const audit = await apiRequest<any[]>('GET', `/audit/user/${user.id}?${params.toString()}`);
        const roleFilters: Record<RolUsuario, string[]> = {
          [RolUsuario.SUPER_ADMINISTRADOR]: [],
          [RolUsuario.ADMIN]: [],
          [RolUsuario.COORDINADOR]: ['ruta', 'reporte', 'prestamo', 'cliente'],
          [RolUsuario.SUPERVISOR]: ['ruta', 'cliente', 'visita'],
          [RolUsuario.COBRADOR]: ['pago', 'visita', 'gasto', 'ruta'],
          [RolUsuario.CONTADOR]: ['transaccion', 'arqueo', 'cierre', 'gasto', 'caja'],
          [RolUsuario.PUNTO_DE_VENTA]: ['articulo', 'prestamo', 'cliente'],
        } as any;
        const permissionEntityMap: Record<string, string[]> = {
          'usuarios': ['usuario'],
          'auditoria': ['audit', 'registro', 'log'],
          'clientes': ['cliente'],
          'rutas': ['ruta', 'visita', 'pago'],
          'reportes-operativos': ['reporte'],
          'prestamos-dinero': ['prestamo', 'solicitud', 'pago'],
          'contable': ['transaccion', 'arqueo', 'cierre', 'gasto', 'caja'],
          'tesoreria': ['caja', 'transaccion'],
          'articulos': ['inventario', 'articulo'],
          'notificaciones': ['notificacion'],
        };
        const allowedModules = (selectedPermissions && selectedPermissions.length > 0)
          ? selectedPermissions
          : (availableModules || []).filter((m: any) => (m.roles || []).includes(user.rol)).map((m: any) => m.id);
        const permissionFilters = allowedModules.flatMap((id: string) => permissionEntityMap[id] || []);
        const filtros = (permissionFilters.length > 0 ? permissionFilters : roleFilters[user.rol] || []).map((s) => s.toLowerCase());
        const filtrados = filtros.length
          ? (audit || []).filter((a: any) => filtros.some((f) => (a.entidad || '').toLowerCase().includes(f)))
          : audit || [];
        const timeline = filtrados.slice(0, timelineLimit).map((a: any) => ({
          time: new Date(a.creadoEn).toLocaleString('es-CO', {
            dateStyle: 'short',
            timeStyle: 'short',
          }),
          action: a.accion,
          detail: `${a.entidad} ${a.entidadId || ''}`.trim(),
          type: 'neutral' as const,
        }));
        setDetalle((d) => ({ ...d, actividadReciente: timeline }));
        setTimelinePage(1);
      } catch (e) {
        console.error('Error cargando auditoría del usuario:', e);
      } finally {
        setTimelineLoading(false);
      }
    })();
    // Resumen general para otros roles
    if (user.rol !== RolUsuario.COBRADOR) {
      (async () => {
        try {
          const resumenGeneral = await apiRequest<any>('GET', `/reports/operational/coordinator?period=today`);
          const hoy = new Date();
          const startDate = hoy.toISOString();
          const endDate = hoy.toISOString();
          const financiero = await apiRequest<any>('GET', `/reports/financial/summary?startDate=${startDate}&endDate=${endDate}`);
          const cajas = await apiRequest<any[]>('GET', `/accounting/cajas`);
          const moraStats = await apiRequest<any>('GET', `/reports/estadisticas-mora`);
          const querySupervisor = user.rol === RolUsuario.SUPERVISOR ? `&supervisorId=${user.id}` : '';
          const rutasActivasResp = await apiRequest<any[]>('GET', `/routes?activa=true${querySupervisor}`);
          const rutasInactivasResp = await apiRequest<any[]>('GET', `/routes?activa=false${querySupervisor}`);
          const rutasTotalResp = await apiRequest<any[]>('GET', `/routes?${querySupervisor}`);
          const ingresosDia = Number(financiero?.ingresos?.total || 0);
          const egresosDia = Number(financiero?.egresos?.total || 0);
          const balanceDia = ingresosDia - egresosDia;
          const recaudo = ingresosDia || Number(resumenGeneral?.totalRecaudo || 0);
          const meta = Number(resumenGeneral?.totalMeta || 0);
          const dineroCaja = Array.isArray(cajas)
            ? cajas.reduce((s: number, c: any) => s + Number(c.saldoActual || 0), 0)
            : 0;
          const porcentaje = meta > 0 ? Math.round((recaudo / meta) * 100) : 0;
          let gastosCategorias: Array<{ categoria: string; monto: number }> = [];
          if (user.rol === RolUsuario.CONTADOR) {
            const distribucion = await apiRequest<any>('GET', `/reports/financial/expenses?startDate=${startDate}&endDate=${endDate}`);
            const categorias = Array.isArray(distribucion?.categorias) ? distribucion.categorias : [];
            gastosCategorias = categorias
              .map((c: any) => ({ categoria: c.nombre || c.categoria || 'Otro', monto: Number(c.total || c.monto || 0) }))
              .sort((a: any, b: any) => b.monto - a.monto)
              .slice(0, 5);
          }
          setDetalle((d) => ({
            ...d,
            dineroCaja,
            recaudoDia: recaudo,
            metaDiaria: meta,
            porcentajeMeta: porcentaje,
            rutaNombre: 'General',
            zona: '',
            progreso: porcentaje,
            enMora: Number(moraStats?.totalPrestamosMora || 0),
            ingresosDia,
            egresosDia,
            balanceDia,
            gastosCategorias,
            rutasActivas: Array.isArray(rutasActivasResp) ? rutasActivasResp.length : 0,
            rutasTotal: Array.isArray(rutasTotalResp) ? rutasTotalResp.length : 0,
            rutasInactivas: Array.isArray(rutasInactivasResp) ? rutasInactivasResp.length : 0,
          }));
        } catch (e) {
          console.error('Error cargando resumen general:', e);
        }
      })();
    }
  };

  const handleOpenPermissionsModal = (user: User) => {
    if (user.rol === RolUsuario.SUPER_ADMINISTRADOR && currentUserRole !== RolUsuario.SUPER_ADMINISTRADOR) {
      return;
    }

    setSelectedUser(user);
    
    // Obtener los módulos correspondientes al rol del usuario desde la configuración central
    // Si el usuario ya tiene permisos personalizados, usarlos. Si no, cargar los defaults del rol.
    // Para este caso, asumiremos que si permisos array está vacío, cargamos todos los default modules ids.
    
    // NOTA: En una implementación real más robusta, deberíamos mergear los permisos guardados.
    // Aquí simplificaremos mostrando los módulos disponibles para ese rol.
    
    // Por ahora, simulamos que 'permisos' en el objeto user son los IDs de los módulos activos.
    setSelectedPermissions(user.permisos);
    setIsPermissionsModalOpen(true);
  };

  const handleOpenDeleteModal = (user: User) => {
    if (user.rol === RolUsuario.SUPER_ADMINISTRADOR) {
      return;
    }

    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  const handleCreateUser = async () => {
    try {
      const { password, ...userData } = formData;
      // Validar campos mínimos
      if (!formData.nombres || !formData.apellidos || !formData.correo || !formData.password) {
        showNotification('error', 'Por favor complete todos los campos obligatorios', 'Campos Faltantes');
        return;
      }

      await usuariosService.crear(formData);
      
      showNotification('success', 'El usuario ha sido creado exitosamente', 'Usuario Creado');
      setIsCreateModalOpen(false);
      fetchUsers(); // Recargar lista
    } catch (error) {
      console.error('Error creating user:', error);
      showNotification('error', 'No se pudo crear el usuario', 'Error');
    }
  };

  const handleToggleUserStatus = async () => {
    if (!selectedUser) return;

    if (selectedUser.rol === RolUsuario.SUPER_ADMINISTRADOR) {
      return;
    }

    try {
      const nuevoEstado: EstadoUsuario = selectedUser.estado === EstadoUsuario.ACTIVO ? EstadoUsuario.INACTIVO : EstadoUsuario.ACTIVO;
      await usuariosService.toggleEstado(selectedUser.id, nuevoEstado);
      
      const action = selectedUser.estado === EstadoUsuario.ACTIVO ? 'desactivado' : 'activado';
      showNotification('success', `El usuario ha sido ${action} exitosamente`, 'Estado Actualizado');
      setIsDeleteModalOpen(false); // Modal se usa para confirmar toggle
      fetchUsers();
    } catch (error) {
      console.error('Error toggling status:', error);
      showNotification('error', 'No se pudo cambiar el estado del usuario', 'Error');
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    
    try {
      const { password, ...userData } = formData;
      
      await usuariosService.actualizar(selectedUser.id, {
        nombres: formData.nombres,
        apellidos: formData.apellidos,
        correo: formData.correo,
        telefono: formData.telefono,
        rol: formData.rol,
        // No enviamos estado aquí si no se modificó en form, pero el form lo tiene.
        // Lo ideal es enviar solo lo cambiado. Enviamos todo el form por ahora.
      });

      showNotification('success', 'Los datos del usuario han sido actualizados', 'Usuario Actualizado');
      setIsEditModalOpen(false);
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      showNotification('error', 'No se pudo actualizar el usuario', 'Error');
    }
  };

  const handleUpdatePermissions = async () => {
    if (!selectedUser) return;

    try {
      await usuariosService.asignarPermisos(selectedUser.id, selectedPermissions);
      
      const updatedUsers = users.map(user => {
        if (user.id === selectedUser.id) {
          return {
            ...user,
            permisos: selectedPermissions
          };
        }
        return user;
      });

      setUsers(updatedUsers);
      setIsPermissionsModalOpen(false);
      showNotification('success', 'Los permisos del usuario han sido actualizados', 'Permisos Actualizados');
    } catch (error) {
      console.error('Error updating permissions:', error);
      showNotification('error', 'No se pudieron actualizar los permisos', 'Error');
    }
  };

  // Obtener la estructura de módulos basada en el rol del usuario seleccionado
  // We removed the useEffect that was causing the infinite loop.
  // availableModules is now calculated via useMemo above.
  /* 
  const [availableModules, setAvailableModules] = useState... // Removed to prevent re-renders
  */

  const handleTogglePermission = (permissionId: string) => {
    if (selectedPermissions.includes(permissionId)) {
      setSelectedPermissions(selectedPermissions.filter(p => p !== permissionId));
    } else {
      setSelectedPermissions([...selectedPermissions, permissionId]);
    }
  };

  const getStatusColor = (estado: User['estado']) => {
    switch (estado) {
      case EstadoUsuario.ACTIVO: return 'text-emerald-700 bg-emerald-50 border-emerald-100';
      case EstadoUsuario.INACTIVO: return 'text-slate-600 bg-slate-100 border-slate-200';
      case EstadoUsuario.SUSPENDIDO: return 'text-rose-700 bg-rose-50 border-rose-100';
      default: return 'text-slate-600 bg-slate-100 border-slate-200';
    }
  };

  const getStatusText = (estado: User['estado']) => {
    switch (estado) {
      case EstadoUsuario.ACTIVO: return 'Activo';
      case EstadoUsuario.INACTIVO: return 'Inactivo';
      case EstadoUsuario.SUSPENDIDO: return 'Suspendido';
      default: return 'Desconocido';
    }
  };

  if (!permitido) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-xs text-slate-600 font-bold border border-slate-200">
            <Users className="h-3.5 w-3.5" />
            <span>Acceso no autorizado</span>
          </div>
          <p className="mt-4 text-slate-500 font-medium">No tienes permisos para ver Usuarios.</p>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="min-h-screen bg-slate-50 relative">
      {/* Fondo arquitectónico standard */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 w-full px-6 md:px-8 py-8 space-y-8">
        {/* Header Standard */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="space-y-1">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-900 tracking-wide mb-2 border border-slate-200">
                <Users className="h-3.5 w-3.5" />
                <span>Gestión de Usuarios</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                <span className="text-blue-600">Usuarios del </span><span className="text-orange-500">Sistema</span>
              </h1>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                Administra el acceso, roles y permisos de los usuarios de CrediSur.
              </p>
            </div>

            <div className="flex items-center gap-4">
              {puedeCrear && (
                <button
                  onClick={handleOpenCreateModal}
                  className="inline-flex items-center gap-2 rounded-2xl bg-white border border-slate-200 px-6 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900 transition-all duration-300 whitespace-nowrap"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Nuevo Usuario</span>
                </button>
              )}
            </div>
          </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Usuarios Totales', value: stats.total, color: 'text-sky-700', bgColor: 'bg-sky-50', icon: <Users className="h-5 w-5" /> },
            { label: 'Activos', value: stats.active, color: 'text-emerald-700', bgColor: 'bg-emerald-50', icon: <Check className="h-5 w-5" /> },
            { label: 'Administradores', value: stats.admins, color: 'text-violet-700', bgColor: 'bg-violet-50', icon: <Shield className="h-5 w-5" /> },
            { label: 'Inactivos', value: stats.inactive, color: 'text-slate-600', bgColor: 'bg-slate-100', icon: <EyeOff className="h-5 w-5" /> }
          ].map((stat, index) => (
            <div
              key={index}
              className="group relative overflow-hidden bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{stat.label}</p>
                  <h3 className="text-3xl font-bold text-slate-900 mt-2 tracking-tight">{stat.value}</h3>
                </div>
                <div className={cn("p-3 rounded-2xl group-hover:scale-110 transition-transform duration-300", stat.bgColor, stat.color)}>
                  {stat.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filtros y Vistas */}
        <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
          <div className="relative w-full md:w-64 lg:w-80">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar usuarios..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-11 pr-4 py-2.5 w-full bg-slate-50/50 focus:bg-white border-slate-200 rounded-2xl text-sm text-slate-900 focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all shadow-sm placeholder:text-slate-400 font-medium"
            />
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end overflow-x-auto pb-2 md:pb-0">
            <div className="flex flex-wrap items-center gap-1 bg-slate-50/50 p-1 rounded-2xl border border-slate-200">
              {roleFilters.map((role) => (
                <button
                  key={role.id}
                  onClick={() => {
                    setFilterRole(role.id);
                    setCurrentPage(1);
                  }}
                  className={cn(
                    "px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap",
                    filterRole === role.id
                      ? 'bg-slate-900 text-white shadow-md'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
                  )}
                >
                  {role.label}
                </button>
              ))}
            </div>

            <div className="flex bg-slate-50/50 p-1 rounded-2xl border border-slate-200 shrink-0">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  "p-2 rounded-lg transition-all",
                  viewMode === 'grid'
                    ? 'bg-white text-slate-900 shadow-sm ring-1 ring-black/5'
                    : 'text-slate-400 hover:text-slate-600'
                )}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  "p-2 rounded-lg transition-all",
                  viewMode === 'list'
                    ? 'bg-white text-slate-900 shadow-sm ring-1 ring-black/5'
                    : 'text-slate-400 hover:text-slate-600'
                )}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>


        {/* Vista Lista (Tabla) */}
        {viewMode === 'list' ? (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200">
                <tr>
                  <th className="px-8 py-5 font-bold tracking-wider">Usuario</th>
                  <th className="px-6 py-5 font-bold tracking-wider">Rol</th>
                  <th className="px-6 py-5 font-bold tracking-wider">Estado</th>
                  <th className="px-6 py-5 font-bold tracking-wider">Último Acceso</th>
                  <th className="px-8 py-5 font-bold tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentUsers.map((user) => {
                  const role = roles.find(r => r.id === user.rol);
                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-slate-50/50 transition-colors group"
                    >
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center border border-slate-200 text-slate-600 font-bold text-xs shadow-sm">
                            {user.nombres.charAt(0)}{user.apellidos.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{user.nombres} {user.apellidos}</div>
                            <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 font-medium">
                              <Mail className="h-3 w-3" />
                              {user.correo}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className={cn("p-2 rounded-lg", role?.bgColor, role?.color)}>
                            {role?.icon}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{role?.nombre}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold tracking-wide uppercase border",
                          getStatusColor(user.estado)
                        )}>
                          {getStatusText(user.estado)}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-slate-500 font-medium">
                        {user.ultimoAcceso}
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <button
                            onClick={() => handleOpenDetailModal(user)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Ver detalle"
                            disabled={user.rol === 'SUPER_ADMINISTRADOR' && currentUserRole !== 'SUPER_ADMINISTRADOR'}
                            style={user.rol === 'SUPER_ADMINISTRADOR' && currentUserRole !== 'SUPER_ADMINISTRADOR' ? { pointerEvents: 'none', opacity: 0.5 } : {}}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {puedeEditar && (
                            <button
                              onClick={() => handleOpenEditModal(user)}
                              className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Editar"
                              disabled={user.rol === 'SUPER_ADMINISTRADOR' && currentUserRole !== 'SUPER_ADMINISTRADOR'}
                              style={user.rol === 'SUPER_ADMINISTRADOR' && currentUserRole !== 'SUPER_ADMINISTRADOR' ? { pointerEvents: 'none', opacity: 0.5 } : {}}
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                          )}
                          {puedeGestionarPermisos && (
                            <button
                              onClick={() => handleOpenPermissionsModal(user)}
                              className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                              title="Permisos"
                              disabled={user.rol === 'SUPER_ADMINISTRADOR' && currentUserRole !== 'SUPER_ADMINISTRADOR'}
                            >
                              <Key className="h-4 w-4" />
                            </button>
                          )}
                          {puedeEliminar && (
                            <button
                              onClick={() => handleOpenDeleteModal(user)}
                              className={cn(
                                "p-2 rounded-lg transition-colors",
                                user.estado === 'ACTIVO' ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                              )}
                              title={user.estado === 'ACTIVO' ? 'Desactivar' : 'Activar'}
                              disabled={user.rol === 'SUPER_ADMINISTRADOR'}
                            >
                              {user.estado === 'ACTIVO' ? (
                                <Trash2 className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        ) : (
          /* Vista Grid (Tarjetas) */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {currentUsers.map((user) => {
              const role = roles.find(r => r.id === user.rol);
              return (
                <div key={user.id} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 p-6 flex flex-col gap-4 group">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center border border-slate-200 text-slate-600 font-bold text-sm shadow-sm group-hover:bg-slate-200 group-hover:text-slate-900 transition-colors">
                        {user.nombres.charAt(0)}{user.apellidos.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 line-clamp-1">{user.nombres} {user.apellidos}</h3>
                        <p className="text-xs text-slate-500 font-medium">{user.correo}</p>
                      </div>
                    </div>
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase border",
                      getStatusColor(user.estado)
                    )}>
                      {getStatusText(user.estado)}
                    </span>
                  </div>
                  
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50/50 border border-slate-100">
                      <div className={cn("p-2 rounded-lg", role?.bgColor, role?.color)}>
                        {role?.icon}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rol asignado</div>
                        <div className="font-bold text-slate-900 text-sm">{role?.nombre}</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                        <span className="text-slate-400 font-medium block mb-0.5">Fecha Registro</span>
                        <span className="font-bold text-slate-700">{user.fechaCreacion}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                        <span className="text-slate-400 font-medium block mb-0.5">Último acceso</span>
                        <span className="font-bold text-slate-700">{user.ultimoAcceso}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 mt-auto">
                    <button
                      onClick={() => handleOpenDetailModal(user)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Ver detalle"
                      disabled={user.rol === 'SUPER_ADMINISTRADOR' && currentUserRole !== 'SUPER_ADMINISTRADOR'}
                      style={user.rol === 'SUPER_ADMINISTRADOR' && currentUserRole !== 'SUPER_ADMINISTRADOR' ? { pointerEvents: 'none', opacity: 0.5 } : {}}
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(user)}
                      className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                      title="Editar"
                      disabled={user.rol === 'SUPER_ADMINISTRADOR' && currentUserRole !== 'SUPER_ADMINISTRADOR'}
                      style={user.rol === 'SUPER_ADMINISTRADOR' && currentUserRole !== 'SUPER_ADMINISTRADOR' ? { pointerEvents: 'none', opacity: 0.5 } : {}}
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleOpenPermissionsModal(user)}
                      className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                      title="Permisos"
                      disabled={user.rol === 'SUPER_ADMINISTRADOR' && currentUserRole !== 'SUPER_ADMINISTRADOR'}
                    >
                      <Key className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleOpenDeleteModal(user)}
                      className={cn(
                        "p-2 rounded-lg transition-colors",
                        user.estado === 'ACTIVO' ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                      )}
                      title={user.estado === 'ACTIVO' ? 'Desactivar' : 'Activar'}
                      disabled={user.rol === 'SUPER_ADMINISTRADOR'}
                    >
                      {user.estado === 'ACTIVO' ? (
                        <Trash2 className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Paginación */}
        <div className="p-4 border-t border-slate-100 bg-white/50 flex justify-between items-center text-xs text-slate-500 font-medium rounded-2xl mt-4">
           <span>
              Mostrando {currentUsers.length} de {filteredUsers.length} usuarios
           </span>
           <div className="flex gap-2">
             <button 
               onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
               disabled={currentPage === 1}
               className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-bold flex items-center gap-1 transition-colors text-slate-700"
             >
               <ChevronLeft className="h-3 w-3" /> Anterior
             </button>
             <button 
               onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
               disabled={currentPage === totalPages || totalPages === 0}
               className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-bold flex items-center gap-1 transition-colors text-slate-700"
             >
               Siguiente <ChevronRight className="h-3 w-3" />
             </button>
           </div>
        </div>

      </div>
    </div>

      {/* Modals */}
      {mounted && typeof document !== 'undefined' && createPortal(
        <>
          {isCreateModalOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
          onClick={() => setIsCreateModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl w-full max-w-3xl border border-slate-200 shadow-2xl p-10 transform scale-100 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-blue-50 text-orange-500 rounded-lg">
                <UserPlus className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">
                  <span className="text-blue-600">Nuevo </span>
                  <span className="text-orange-500">Usuario</span>
                </h2>
                <p className="text-xs text-slate-500 font-medium">Complete la información para registrar un nuevo usuario</p>
              </div>
            </div>
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nombres</label>
                  <input
                    type="text"
                    value={formData.nombres}
                    onChange={(e) => setFormData({...formData, nombres: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm font-medium text-slate-900 placeholder:text-slate-400"
                    placeholder="Ej. Juan"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Apellidos</label>
                  <input
                    type="text"
                    value={formData.apellidos}
                    onChange={(e) => setFormData({...formData, apellidos: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm font-medium text-slate-900 placeholder:text-slate-400"
                    placeholder="Ej. Pérez"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Correo Electrónico</label>
                <input
                  type="email"
                  value={formData.correo}
                  onChange={(e) => setFormData({...formData, correo: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm font-medium text-slate-900 placeholder:text-slate-400"
                  placeholder="Ej. juan@credisur.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Teléfono</label>
                  <input
                    type="tel"
                    value={formData.telefono}
                    onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm font-medium text-slate-900 placeholder:text-slate-400"
                    placeholder="Ej. 300 123 4567"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Contraseña</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm font-medium text-slate-900 placeholder:text-slate-400"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Rol</label>
                <div className="relative">
                  <select
                    value={formData.rol}
                    onChange={(e) => setFormData({...formData, rol: e.target.value as RolUsuario})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 appearance-none text-sm font-medium text-slate-900"
                  >
                    {roles.map(role => (
                      <option key={role.id} value={role.id}>{role.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-100">
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-2xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateUser}
                  className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-2xl shadow-lg shadow-blue-600/20 transition-all transform active:scale-95 flex items-center gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Crear Usuario</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
          onClick={() => setIsEditModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl w-full max-w-3xl border border-slate-200 shadow-2xl p-10 transform scale-100 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-amber-50 text-amber-500 rounded-lg">
                <Edit2 className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">
                  <span className="text-blue-600">Editar </span>
                  <span className="text-orange-500">Usuario</span>
                </h2>
                <p className="text-xs text-slate-500 font-medium">Modifique la información del usuario</p>
              </div>
            </div>
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nombres</label>
                  <input
                    type="text"
                    value={formData.nombres}
                    onChange={(e) => setFormData({...formData, nombres: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm font-medium text-slate-900 placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Apellidos</label>
                  <input
                    type="text"
                    value={formData.apellidos}
                    onChange={(e) => setFormData({...formData, apellidos: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm font-medium text-slate-900 placeholder:text-slate-400"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Correo Electrónico</label>
                <input
                  type="email"
                  value={formData.correo}
                  onChange={(e) => setFormData({...formData, correo: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm font-medium text-slate-900 placeholder:text-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Teléfono</label>
                  <input
                    type="tel"
                    value={formData.telefono}
                    onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm font-medium text-slate-900 placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Contraseña</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm font-medium text-slate-900 placeholder:text-slate-400"
                    placeholder="Dejar vacío para no cambiar"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Rol</label>
                <div className="relative">
                  <select
                    value={formData.rol}
                    onChange={(e) => setFormData({...formData, rol: e.target.value as RolUsuario})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 appearance-none text-sm font-medium text-slate-900"
                  >
                    {roles.map(role => (
                      <option key={role.id} value={role.id}>{role.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-100">
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-2xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUpdateUser}
                  className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-2xl shadow-lg shadow-blue-600/20 transition-all transform active:scale-95 flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Permissions Modal */}
      {isPermissionsModalOpen && selectedUser && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
          onClick={() => setIsPermissionsModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl w-full max-w-5xl border border-slate-200 shadow-2xl p-10 transform scale-100 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-6 shrink-0">
              <div className="p-2 bg-blue-50 text-orange-600 rounded-lg">
                <Key className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                  Gestión de Permisos
                </h2>
                <p className="text-sm text-slate-500 font-medium">
                  Configura los accesos para <span className="text-slate-900 font-bold">{selectedUser.nombres} {selectedUser.apellidos}</span>
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 -mr-2 min-h-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {availableModules.map((module) => (
                  <label 
                    key={module.id}
                    className={cn(
                      "flex items-start gap-3 p-4 rounded-2xl border transition-all cursor-pointer select-none",
                      selectedPermissions.includes(module.id)
                        ? "bg-blue-50 border-blue-200 shadow-sm"
                        : "bg-white border-slate-200 hover:border-blue-200 hover:bg-slate-50"
                    )}
                  >
                    <div className="pt-0.5">
                      <div className={cn(
                        "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                        selectedPermissions.includes(module.id)
                          ? "bg-blue-600 border-blue-600"
                          : "bg-white border-slate-300"
                      )}>
                        {selectedPermissions.includes(module.id) && (
                          <Check className="h-3.5 w-3.5 text-white stroke-[3]" />
                        )}
                      </div>
                      <input 
                        type="checkbox"
                        className="hidden"
                        checked={selectedPermissions.includes(module.id)}
                        onChange={() => handleTogglePermission(module.id)}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                              {module.category}
                          </span>
                      </div>
                      <span className={cn(
                        "block text-sm font-bold mb-0.5",
                        selectedPermissions.includes(module.id) ? "text-blue-900" : "text-slate-700"
                      )}>
                        {module.label}
                      </span>
                      <span className="block text-xs text-slate-500 leading-snug">
                        {module.description}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-100 shrink-0">
              <button
                onClick={() => setIsPermissionsModalOpen(false)}
                className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-2xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdatePermissions}
                className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-2xl shadow-lg shadow-blue-600/20 transition-all transform active:scale-95 flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                <span>Guardar Cambios</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200" onClick={() => setIsDeleteModalOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md border border-slate-200 shadow-2xl p-10 transform scale-100 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center">
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center mb-4",
                selectedUser.estado === 'ACTIVO' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
              )}>
                {selectedUser.estado === 'ACTIVO' ? <Trash2 className="h-6 w-6" /> : <Check className="h-6 w-6" />}
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                {selectedUser.estado === 'ACTIVO' ? '¿Desactivar usuario?' : '¿Activar usuario?'}
              </h3>
              <p className="text-sm text-slate-500 mb-6 font-medium">
                {selectedUser.estado === 'ACTIVO' 
                  ? `Estás a punto de desactivar el acceso de ${selectedUser.nombres}.` 
                  : `Se restablecerá el acceso para ${selectedUser.nombres}.`
                }
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-2xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleToggleUserStatus}
                  className={cn(
                    "flex-1 px-4 py-2.5 text-sm font-bold text-white rounded-2xl shadow-lg transition-all transform active:scale-95",
                    selectedUser.estado === 'ACTIVO' ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                  )}
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Detail Modal */}
      {isDetailModalOpen && selectedUser && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
          onClick={() => setIsDetailModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl w-full max-w-4xl border border-slate-200 shadow-2xl p-0 transform scale-100 animate-in zoom-in-95 duration-200 relative overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
             {/* LEFT SIDE - PROFILE SUMMARY */}
             <div className="md:w-1/3 bg-slate-50 border-r border-slate-200 flex flex-col items-center p-10 relative overflow-y-auto">
                 <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-slate-200 to-slate-100 z-0 pointer-events-none mb-12"></div>
                 
                 <div className="relative z-10 mb-4 items-center flex flex-col mt-4">
                     <div className="w-28 h-28 bg-white rounded-full p-1.5 shadow-xl mb-4 group ring-4 ring-slate-50">
                         <div className="w-full h-full bg-slate-100 rounded-full flex items-center justify-center text-3xl font-bold text-slate-400 border border-slate-200 group-hover:bg-slate-200 transition-colors">
                             {selectedUser.nombres.charAt(0)}{selectedUser.apellidos.charAt(0)}
                         </div>
                         <div className="absolute bottom-4 right-2 w-5 h-5 bg-emerald-500 rounded-full border-[3px] border-white" title="Usuario Activo"></div>
                     </div>
                     <h2 className="text-xl font-bold text-slate-900 text-center leading-tight">
                        {selectedUser.nombres}<br/>
                        <span className="text-slate-600 font-normal">{selectedUser.apellidos}</span>
                     </h2>
                 </div>

                 <div className="mt-2 text-center w-full space-y-4 relative z-10">
                    <span className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border mb-4",
                        roles.find(r => r.id === selectedUser.rol)?.bgColor,
                        roles.find(r => r.id === selectedUser.rol)?.color,
                        "border-transparent"
                    )}>
                        {roles.find(r => r.id === selectedUser.rol)?.icon}
                        {roles.find(r => r.id === selectedUser.rol)?.nombre}
                    </span>

                    <div className="w-full h-px bg-slate-200/80 my-4"></div>

                    <div className="space-y-3 w-full text-left px-2">
                        <div className="flex items-center gap-3 group">
                             <div className="p-2 bg-white rounded-lg border border-slate-200 text-slate-400 group-hover:border-blue-200 group-hover:text-blue-500 transition-colors shadow-sm">
                                <Mail className="w-4 h-4" />
                             </div>
                             <div className="overflow-hidden">
                                 <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Correo Electrónico</div>
                                 <div className="text-sm font-bold text-slate-700 truncate" title={selectedUser.correo}>{selectedUser.correo}</div>
                             </div>
                         </div>
                         <div className="flex items-center gap-3 group">
                             <div className="p-2 bg-white rounded-lg border border-slate-200 text-slate-400 group-hover:border-blue-200 group-hover:text-blue-500 transition-colors shadow-sm">
                                <Users className="w-4 h-4" />
                             </div>
                             <div>
                                 <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Teléfono</div>
                                 <div className="text-sm font-bold text-slate-700">{selectedUser.telefono || 'No registrado'}</div>
                             </div>
                         </div>
                         <div className="flex items-center gap-3 group">
                             <div className="p-2 bg-white rounded-lg border border-slate-200 text-slate-400 group-hover:border-blue-200 group-hover:text-blue-500 transition-colors shadow-sm">
                                <Clock className="w-4 h-4" />
                             </div>
                             <div>
                                 <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Último Acceso</div>
                                 <div className="text-sm font-bold text-slate-700">{selectedUser.ultimoAcceso}</div>
                             </div>
                         </div>
                    </div>
                 </div>
             </div>

             {/* RIGHT SIDE - DETAILED CONTENT */}
             <div className="md:w-2/3 p-10 overflow-y-auto bg-white relative">
                 <button 
                    onClick={() => setIsDetailModalOpen(false)}
                    className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-all z-20"
                 >
                     <XCircle className="w-6 h-6" />
                 </button>

                 <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <LayoutGrid className="w-5 h-5 text-slate-400" />
                            Detalles Operativos
                        </h3>
                        {selectedUser.estado === 'ACTIVO' ? (
                            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                ACTIVO
                            </span>
                        ) : (
                            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full">
                                INACTIVO
                            </span>
                        )}
                    </div>

                    {selectedUser.rol === 'COBRADOR' ? (
                     <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        
                        {/* 1. RESUMEN FINANCIERO (TARJETAS GRANDES) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-blue-300 transition-colors">
                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
                                    <Wallet className="w-24 h-24 text-blue-600" />
                                </div>
                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
                                        <Wallet className="w-3.5 h-3.5 text-blue-600" />
                                        Dinero en Caja
                                    </div>
                                    <div className="text-3xl font-black tracking-tight text-slate-900 mb-1">$ {detalle.dineroCaja.toLocaleString('es-CO')}
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-blue-700 bg-blue-50 w-fit px-2 py-0.5 rounded-lg border border-blue-100">
                                        <TrendingUp className="w-3 h-3" />
                                        <span className="font-semibold">{detalle.porcentajeMeta}% vs meta</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group hover:border-blue-300 transition-colors">
                                <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-500 text-emerald-600">
                                    <Sparkles className="w-24 h-24" />
                                </div>
                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        Recaudo del Día
                                    </div>
                                    <div className="text-3xl font-black tracking-tight text-slate-900 mb-1">$ {detalle.recaudoDia.toLocaleString('es-CO')}</div>
                                    <div className="text-xs text-slate-500">
                                        Meta diaria: <span className="font-bold text-slate-700">$ {detalle.metaDiaria.toLocaleString('es-CO')}</span> ({detalle.porcentajeMeta}%)
                                    </div>
                                    <div className="w-full h-1.5 bg-slate-100 rounded-full mt-3 overflow-hidden">
                                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${detalle.porcentajeMeta}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. ESTADISTICAS DETALLADAS (GRID 3) */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl hover:bg-slate-100 transition-colors">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <div className="p-1.5 bg-white rounded-md shadow-sm text-violet-600 border border-slate-100">
                                        <MapPin className="w-3.5 h-3.5" />
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Ruta Activa</span>
                                </div>
                                <div className="font-bold text-slate-900 text-sm">{detalle.zona || '—'}</div>
                                <div className="text-[10px] text-slate-500 font-medium mt-0.5">{detalle.progreso}% completado hoy</div>
                            </div>
                            
                            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl hover:bg-slate-100 transition-colors">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <div className="p-1.5 bg-white rounded-md shadow-sm text-rose-600 border border-slate-100">
                                        <AlertCircle className="w-3.5 h-3.5" />
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">En Mora</span>
                                </div>
                                <div className="font-bold text-slate-900 text-sm">{detalle.enMora} Clientes</div>
                                <div className="text-[10px] text-rose-600 font-bold mt-0.5">Atención requerida</div>
                            </div>

                            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl hover:bg-slate-100 transition-colors">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <div className="p-1.5 bg-white rounded-md shadow-sm text-amber-600 border border-slate-100">
                                        <DollarSign className="w-3.5 h-3.5" />
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Gastos</span>
                                </div>
                                <div className="font-bold text-slate-900 text-sm">$ {detalle.gastosHoy.toLocaleString('es-CO')}</div>
                                <div className="text-[10px] text-slate-500 font-medium mt-0.5">Hoy</div>
                            </div>
                        </div>

                        {/* 3. ACTIVIDAD RECIENTE (TIMELINE) */}
                        <div className="border border-slate-200 rounded-2xl overflow-hidden">
                            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                                    <Calendar className="w-3.5 h-3.5" />
                                    Actividad Reciente
                                </h4>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="date"
                                    className="text-[10px] px-2 py-1 border border-slate-200 rounded-md"
                                    value={filtroFechaInicio}
                                    onChange={(e) => setFiltroFechaInicio(e.target.value)}
                                  />
                                  <input
                                    type="date"
                                    className="text-[10px] px-2 py-1 border border-slate-200 rounded-md"
                                    value={filtroFechaFin}
                                    onChange={(e) => setFiltroFechaFin(e.target.value)}
                                  />
                                  <button
                                    className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-md border border-blue-200 hover:bg-blue-100"
                                    onClick={async () => {
                                      if (!selectedUser) return;
                                      setTimelineLoading(true);
                                      try {
                                        const params = new URLSearchParams();
                                        params.set('page', '1');
                                        params.set('limit', `${timelineLimit}`);
                                        if (filtroFechaInicio) params.set('startDate', new Date(filtroFechaInicio).toISOString());
                                        if (filtroFechaFin) params.set('endDate', new Date(filtroFechaFin).toISOString());
                                        const audit = await apiRequest<any[]>('GET', `/audit/user/${selectedUser.id}?${params.toString()}`);
                                        const filtrados = (audit || []).filter(
                                          (a: any) => a.entidad && a.accion
                                        );
                                        const timeline = filtrados.slice(0, timelineLimit).map((a: any) => ({
                                          time: new Date(a.creadoEn).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }),
                                          action: a.accion,
                                          detail: `${a.entidad} ${a.entidadId || ''}`.trim(),
                                          type: 'neutral' as const,
                                        }));
                                        setDetalle((d) => ({ ...d, actividadReciente: timeline }));
                                        setTimelinePage(1);
                                        setTimelineCount(timelineLimit);
                                      } finally {
                                        setTimelineLoading(false);
                                      }
                                    }}
                                  >
                                    Aplicar
                                  </button>
                                </div>
                            </div>
                            <div className="bg-white p-0">
                                {detalle.actividadReciente.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-4 p-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                                        <div className="w-20 text-[10px] font-bold text-slate-500 text-right leading-tight">{item.time}</div>
                                        <div className={cn(
                                            "w-2 h-2 rounded-full ring-4 ring-white",
                                            item.type === 'in' ? 'bg-emerald-500' : item.type === 'out' ? 'bg-rose-500' : 'bg-slate-300'
                                        )}></div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-bold text-slate-900">{item.action}</div>
                                            <div className="text-[10px] text-slate-500 truncate">{item.detail}</div>
                                        </div>
                                        {item.amount && (
                                            <div className="text-xs font-bold text-black px-2 py-0.5 rounded-md bg-slate-100">
                                                {item.amount}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                     </div>
                    ) : (
                      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className={cn("bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group transition-colors", roleTheme.kpiBorderHover)}>
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
                              <Wallet className={cn("w-24 h-24", roleTheme.accentIcon)} />
                            </div>
                            <div className="relative z-10">
                              <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
                                <Wallet className={cn("w-3.5 h-3.5", roleTheme.accentIcon)} />
                                Dinero en Caja
                              </div>
                              <div className="text-3xl font-black tracking-tight text-slate-900 mb-1">$ {detalle.dineroCaja.toLocaleString('es-CO')}</div>
                              <div className="flex items-center gap-1 text-xs text-blue-700 bg-blue-50 w-fit px-2 py-0.5 rounded-lg border border-blue-100">
                                <TrendingUp className="w-3 h-3" />
                                <span className="font-semibold">{detalle.porcentajeMeta}% vs meta</span>
                              </div>
                            </div>
                          </div>
                          <div className={cn("bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group transition-colors", roleTheme.kpiBorderHover)}>
                            <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-500 text-emerald-600">
                              <Sparkles className="w-24 h-24" />
                            </div>
                            <div className="relative z-10">
                              <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Recaudo del Día
                              </div>
                              <div className="text-3xl font-black tracking-tight text-slate-900 mb-1">$ {detalle.recaudoDia.toLocaleString('es-CO')}</div>
                              <div className="text-xs text-slate-500">
                                Meta diaria: <span className="font-bold text-slate-700">$ {detalle.metaDiaria.toLocaleString('es-CO')}</span> ({detalle.porcentajeMeta}%)
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 rounded-full mt-3 overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${detalle.porcentajeMeta}%` }}></div>
                              </div>
                            </div>
                          </div>
                        </div>
                        {selectedUser?.rol === RolUsuario.CONTADOR && (
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                                <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Ingresos Hoy</div>
                                <div className="text-2xl font-black">$ {detalle.ingresosDia.toLocaleString('es-CO')}</div>
                              </div>
                              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                                <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Egresos Hoy</div>
                                <div className="text-2xl font-black">$ {detalle.egresosDia.toLocaleString('es-CO')}</div>
                              </div>
                              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                                <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Balance Hoy</div>
                                <div className="text-2xl font-black">$ {detalle.balanceDia.toLocaleString('es-CO')}</div>
                              </div>
                            </div>
                            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                              <div className="text-[10px] font-bold text-slate-400 uppercase mb-3">Top Gastos por Categoría</div>
                              <div className="space-y-2">
                                {detalle.gastosCategorias.length === 0 && (
                                  <div className="text-xs text-slate-500">Sin gastos registrados hoy</div>
                                )}
                                {detalle.gastosCategorias.map((g, i) => (
                                  <div key={i} className="flex items-center justify-between text-sm">
                                    <span className="font-medium text-slate-700">{g.categoria}</span>
                                    <span className="font-bold">$ {g.monto.toLocaleString('es-CO')}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                        {selectedUser?.rol === RolUsuario.COORDINADOR && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                              <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Rutas Activas</div>
                              <div className="text-2xl font-black">{detalle.rutasActivas}</div>
                              <div className="text-[10px] text-slate-500 font-medium mt-0.5">de {detalle.rutasTotal}</div>
                            </div>
                            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                              <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Rutas Inactivas</div>
                              <div className="text-2xl font-black">{detalle.rutasInactivas}</div>
                            </div>
                            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                              <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Eficiencia Promedio</div>
                              <div className="text-2xl font-black">{detalle.porcentajeMeta}%</div>
                            </div>
                            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                              <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Recaudo Total Hoy</div>
                              <div className="text-2xl font-black">$ {detalle.recaudoDia.toLocaleString('es-CO')}</div>
                            </div>
                          </div>
                        )}
                        {selectedUser?.rol === RolUsuario.SUPERVISOR && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                              <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Rutas Activas</div>
                              <div className="text-2xl font-black">{detalle.rutasActivas}</div>
                              <div className="text-[10px] text-slate-500 font-medium mt-0.5">de {detalle.rutasTotal}</div>
                            </div>
                            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                              <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Rutas Inactivas</div>
                              <div className="text-2xl font-black">{detalle.rutasInactivas}</div>
                            </div>
                            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                              <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">En Mora</div>
                              <div className="text-2xl font-black">{detalle.enMora}</div>
                            </div>
                            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                              <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Gastos Hoy</div>
                              <div className="text-2xl font-black">$ {detalle.gastosHoy.toLocaleString('es-CO')}</div>
                            </div>
                          </div>
                        )}
                        {(selectedUser?.rol === RolUsuario.ADMIN || selectedUser?.rol === RolUsuario.SUPER_ADMINISTRADOR) && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                              <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Recaudo Hoy</div>
                              <div className="text-2xl font-black">$ {detalle.recaudoDia.toLocaleString('es-CO')}</div>
                            </div>
                            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                              <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Meta Hoy</div>
                              <div className="text-2xl font-black">$ {detalle.metaDiaria.toLocaleString('es-CO')}</div>
                            </div>
                            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                              <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">% Cumplimiento</div>
                              <div className="text-2xl font-black">{detalle.porcentajeMeta}%</div>
                            </div>
                          </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl hover:bg-slate-100 transition-colors">
                            <div className="flex items-center gap-2 mb-1.5">
                              <div className="p-1.5 bg-white rounded-md shadow-sm text-violet-600 border border-slate-100">
                                <MapPin className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase">Resumen</span>
                            </div>
                            <div className="font-bold text-slate-900 text-sm">{detalle.rutaNombre}</div>
                            <div className="text-[10px] text-slate-500 font-medium mt-0.5">{detalle.progreso}% avance</div>
                          </div>
                          <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl hover:bg-slate-100 transition-colors">
                            <div className="flex items-center gap-2 mb-1.5">
                              <div className="p-1.5 bg-white rounded-md shadow-sm text-rose-600 border border-slate-100">
                                <AlertCircle className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase">En Mora</span>
                            </div>
                            <div className="font-bold text-slate-900 text-sm">{detalle.enMora} Clientes</div>
                            <div className="text-[10px] text-rose-600 font-bold mt-0.5">Atención requerida</div>
                          </div>
                          <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl hover:bg-slate-100 transition-colors">
                            <div className="flex items-center gap-2 mb-1.5">
                              <div className="p-1.5 bg-white rounded-md shadow-sm text-amber-600 border border-slate-100">
                                <DollarSign className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase">Gastos</span>
                            </div>
                            <div className="font-bold text-slate-900 text-sm">$ {detalle.gastosHoy.toLocaleString('es-CO')}</div>
                            <div className="text-[10px] text-slate-500 font-medium mt-0.5">Hoy</div>
                          </div>
                        </div>
                        <div className="border border-slate-200 rounded-2xl overflow-hidden">
                          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5" />
                              Actividad Reciente
                            </h4>
                          </div>
                          <div className="bg-white p-0">
                            {detalle.actividadReciente.slice(0, timelineCount).map((item, idx) => (
                              <div key={idx} className="flex items-center gap-4 p-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                                <div className="w-20 text-[10px] font-bold text-slate-500 text-right leading-tight">{item.time}</div>
                                <div className={cn(
                                  "w-2 h-2 rounded-full ring-4 ring-white",
                                  item.type === 'in' ? 'bg-emerald-500' : item.type === 'out' ? 'bg-rose-500' : 'bg-slate-300'
                                )}></div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <div className="text-xs font-bold text-slate-900">{item.action}</div>
                                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded-md border",
                                        item.action.toLowerCase().includes('pago') ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                                        item.action.toLowerCase().includes('gasto') ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                        item.action.toLowerCase().includes('visita') ? 'bg-indigo-100 text-indigo-700 border-indigo-200' :
                                        item.action.toLowerCase().includes('transaccion') || item.action.toLowerCase().includes('caja') ? 'bg-sky-100 text-sky-700 border-sky-200' :
                                        item.action.toLowerCase().includes('arqueo') || item.action.toLowerCase().includes('cierre') ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                        'bg-slate-100 text-slate-700 border-slate-200'
                                      )}>
                                        {item.action.toLowerCase().includes('pago') ? 'Pago' :
                                        item.action.toLowerCase().includes('gasto') ? 'Gasto' :
                                        item.action.toLowerCase().includes('visita') ? 'Visita' :
                                        item.action.toLowerCase().includes('transaccion') ? 'Transacción' :
                                        item.action.toLowerCase().includes('arqueo') ? 'Arqueo' :
                                        item.action.toLowerCase().includes('cierre') ? 'Cierre' :
                                        item.action.toLowerCase().includes('caja') ? 'Caja' :
                                        'Evento'}
                                      </span>
                                    </div>
                                  <div className="text-[10px] text-slate-500 truncate">{item.detail}</div>
                                </div>
                                {item.amount && (
                                  <div className="text-xs font-bold text-black px-2 py-0.5 rounded-md bg-slate-100">
                                    {item.amount}
                                  </div>
                                )}
                              </div>
                            ))}
                            {detalle.actividadReciente.length > timelineCount && (
                              <div className="flex justify-center p-3 border-t border-slate-100">
                                <button
                                  className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-md border border-blue-200 hover:bg-blue-100"
                                  onClick={async () => {
                                    if (timelineLoading) return;
                                    setTimelineLoading(true);
                                    try {
                                      const nextPage = timelinePage + 1;
                                      const params = new URLSearchParams();
                                      params.set('page', `${nextPage}`);
                                      params.set('limit', `${timelineLimit}`);
                                      if (filtroFechaInicio) params.set('startDate', new Date(filtroFechaInicio).toISOString());
                                      if (filtroFechaFin) params.set('endDate', new Date(filtroFechaFin).toISOString());
                                      const audit = await apiRequest<any[]>('GET', `/audit/user/${selectedUser?.id}?${params.toString()}`);
                                      const more = (audit || []).map((a: any) => ({
                                        time: new Date(a.creadoEn).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }),
                                        action: a.accion,
                                        detail: `${a.entidad} ${a.entidadId || ''}`.trim(),
                                        type: 'neutral' as const,
                                      }));
                                      setDetalle((d) => ({ ...d, actividadReciente: [...d.actividadReciente, ...more] }));
                                      setTimelinePage(nextPage);
                                      setTimelineCount(timelineCount + timelineLimit);
                                    } finally {
                                      setTimelineLoading(false);
                                    }
                                  }}
                                >
                                  Ver más
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                 </div>
             </div>
          </div>
        </div>
      )}

        </>,
        document.body
      )}
    </>
  );
};

export default UserManagementPage;
