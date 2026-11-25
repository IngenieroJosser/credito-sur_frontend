"use client";

import { datosParaRegistro, estadoDeError, mensajeDeError } from '@/lib/mensaje-de-error';
import Paginador from '@/components/ui/Paginador'
import { logger } from '@/lib/logger'
import DetalleUsuarioModal from '@/components/usuarios/DetalleUsuarioModal';
import PanelDeError from '@/components/ui/PanelDeError';

import React, { useState, useEffect } from "react";
import { useRealtimeData } from '@/hooks/useRealtimeData';
import { createPortal } from "react-dom";

import { useNotification } from '@/components/providers/NotificationProvider'
import { permisosPorRol, type ModuloPermiso } from '@/lib/permissions'
import { refreshSesion } from '@/services/autenticacion-service'
import { usuariosService } from "@/services/usuarios-service";
import { RolUsuario, EstadoUsuario } from "@/types/enums";
import { formatShortDateTime, formatShortDate } from "@/lib/utils/format";
import BotonAccion from '@/components/ui/BotonAccion'
import { SkeletonTabla } from '@/components/ui/Skeleton';
import { Selector } from '@/components/ui/Selector'
import Tooltip from '@/components/ui/Tooltip'

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
  Archive,
  RotateCcw,
  Save,
  CheckCircle2,
  ShoppingBag,
  AtSign,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { usePermission } from "@/hooks/usePermission";
import BaseFieldLabel from "@/components/ui/FieldLabel";
 

// Tipos importados de enums
// type RolUsuario = ... (Removed)
// type EstadoUsuario = ... (Removed)

interface User {
  id: string;
  nombres: string;
  apellidos: string;
  correo: string;
  nombreUsuario?: string;
  telefono: string;
  rol: RolUsuario;
  estado: EstadoUsuario;
  fechaCreacion: string;
  ultimoAcceso: string;
  permisos: string[];
}

interface Role {
  id: string;
  nombre: string;
  label: string;
  descripcion: string;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
}

/**
 * La etiqueta de esta pantalla: la compartida con su tamaño propio.
 *
 * `htmlFor` pasa de largo porque es lo que une la etiqueta con su campo; sin
 * el, un lector de pantalla anuncia el campo sin nombre y pulsar la etiqueta
 * no lleva el cursor a ningun sitio.
 */
function FieldLabel({
  children,
  required = false,
  htmlFor,
}: {
  children: React.ReactNode;
  required?: boolean;
  htmlFor?: string;
}) {
  return (
    <BaseFieldLabel
      htmlFor={htmlFor}
      required={required}
      className="text-xs text-slate-500 uppercase tracking-wider"
    >
      {children}
    </BaseFieldLabel>
  );
}

/** Una fila de la tabla de permisos: el modulo con su grupo y sus etiquetas. */
type PermisoAplanado = {
  id: string
  label: string
  description: string
  category: string
  roles: ModuloPermiso['roles']
}

const GLOBAL_MODULE_CATALOG = (() => {
  const EXCLUDED_ACTION_IDS = new Set([
    'prestamos-dinero',
    'creditos-articulos',
    'notificaciones',
    'solicitudes',
    'revisiones',
    'seguimiento-pdv',
  ])

  const preferredOrder = [
    'SUPER_ADMINISTRADOR',
    'ADMIN',
    'COORDINADOR',
    'SUPERVISOR',
    'CONTADOR',
    'COBRADOR',
    'PUNTO_DE_VENTA',
  ]

  const existingRoles = Object.keys(permisosPorRol || {})
  const roleOrder = [
    ...preferredOrder.filter((r) => existingRoles.includes(r)),
    ...existingRoles.filter((r) => !preferredOrder.includes(r)),
  ]

  // NO es `ModuloPermiso`: este aplanado agrega `label`, `description` y `category` que
  // la tabla de permisos pinta. El tipo se declara por eso, y no se reutiliza el del
  // catalogo, que no los tiene.
  const flattenedModules: PermisoAplanado[] = []
  const seen = new Set<string>()

  roleOrder.forEach((rol) => {
    const modules = (permisosPorRol)?.[rol] || []
    modules.forEach((module) => {
      if (module.submodulos && module.submodulos.length > 0) {
        module.submodulos.forEach((sub) => {
          if (!sub?.id || seen.has(sub.id) || EXCLUDED_ACTION_IDS.has(sub.id)) return
          seen.add(sub.id)
          flattenedModules.push({
            id: sub.id,
            label: sub.nombre,
            description: sub.nombre,
            category: module.nombre,
            roles: sub.roles,
          })
        })
      } else {
        if (!module?.id || seen.has(module.id) || EXCLUDED_ACTION_IDS.has(module.id)) return
        seen.add(module.id)
        flattenedModules.push({
          id: module.id,
          label: module.nombre,
          description: module.nombre,
          category: 'General',
          roles: module.roles,
        })
      }
    })
  })

  return flattenedModules
})()

/**
 * Partir «8 de sept, 07:47 PM» en sus dos mitades.
 *
 * No se cambia `formatShortDateTime`: lo usan otras pantallas y ahi el texto
 * de una linea esta bien. Lo que cambia es como lo pinta ESTA tabla, que es la
 * que no tiene ancho. Si no hay coma -«Nunca»- devuelve una sola parte.
 */
function partirFechaYHora(valor: string): string[] {
  const corte = valor.indexOf(', ')
  if (corte < 0) return [valor]
  return [valor.slice(0, corte), valor.slice(corte + 2)]
}

const UserManagementPage = () => {
  const { showNotification } = useNotification();

  // Integración con autenticación real
  const { user: currentUser, loading: authLoading } = useAuth();
  const currentUserRole: RolUsuario = currentUser?.rol as RolUsuario;


  const { can, canForPath } = usePermission();
  const permitido = can("USUARIOS_VIEW") || canForPath("/users");
  const puedeCrear = can("USUARIOS_CREATE") || canForPath("/users");
  const puedeEditar = can("USUARIOS_EDIT") || canForPath("/users");
  const puedeEliminar = can("USUARIOS_DELETE") || canForPath("/users");
  const puedeGestionarPermisos = currentUserRole === RolUsuario.SUPER_ADMINISTRADOR;

  // --- ESTADO DE USUARIOS ---
  const [users, setUsers] = useState<User[]>([]);

  const [loading, setLoading] = useState(true);
  const [errorListado, setErrorListado] = useState<string | null>(null);

  const fetchUsers = async () => {
    if (currentUserRole !== RolUsuario.SUPER_ADMINISTRADOR) return;
    try {
      const data = await usuariosService.obtenerTodos({ includeArchived: true });
      const mappedUsers: User[] = data.map((u) => ({
        id: u.id,
        nombres: u.nombres,
        apellidos: u.apellidos,
        correo: u.correo,
        nombreUsuario: u.nombreUsuario || "",
        telefono: u.telefono || "",
        rol: u.rol as RolUsuario,
        estado: u.estado as EstadoUsuario,
        fechaCreacion: formatShortDate(u.creadoEn),
        ultimoAcceso: formatShortDateTime(u.ultimoIngreso),
        // `Usuario.permisos` es `string[]`: el backend manda las acciones ya
        // deduplicadas (`uniquePermisos` = `p.accion`), no objetos. El `.map` que leia
        // `p.codigo || p.id` era de una forma que no llega; el `|| p` de su final es lo
        // unico que valia.
        permisos: Array.isArray(u.permisos)
          ? u.permisos.filter((p) => typeof p === 'string' && p.trim() !== '')
          : [],
      }));
      setUsers(mappedUsers);
      setErrorListado(null);
    } catch (error) {
      setErrorListado(mensajeDeError(error, "No se pudo consultar el listado."));
      console.error("Error fetching users:", error);
      showNotification(
        "error",
        "No se pudieron cargar los usuarios",
        "Error de Conexión",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && currentUser) {
      fetchUsers();
    }
  }, [authLoading, currentUser]);

  // Acceso solo para SUPER_ADMINISTRADOR — flag evaluado después de todos los hooks
  const accesoRestringido = !authLoading && currentUser && currentUserRole !== RolUsuario.SUPER_ADMINISTRADOR;

  useRealtimeData(['usuarios_actualizados'], fetchUsers)
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("operativos");

  // Alternar entre vista de tabla (list) o tarjetas (grid)
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userAction, setUserAction] = useState<"toggle" | "archive" | "restore" | "hide">("toggle");
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isSavingUser, setIsSavingUser] = useState(false);
  // Sin esto el boton de crear no se bloqueaba ni mostraba nada mientras
  // guardaba: se podia hacer clic varias veces y crear el usuario repetido.
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [mounted, setMounted] = useState(false);
  const availableModules = GLOBAL_MODULE_CATALOG

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Bloquear scroll del body cuando hay un modal abierto
  useEffect(() => {
    if (
      isCreateModalOpen ||
      isEditModalOpen ||
      isPermissionsModalOpen ||
      isDeleteModalOpen
    ) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [
    isCreateModalOpen,
    isEditModalOpen,
    isPermissionsModalOpen,
    isDeleteModalOpen,
  ]);

  interface UserFormData {
    nombres: string;
    apellidos: string;
    correo: string;
    nombreUsuario: string;
    telefono: string;
    password: string;
    rol: RolUsuario;
    estado: EstadoUsuario;
  }

  const [formData, setFormData] = useState<UserFormData>({
    nombres: "",
    apellidos: "",
    correo: "",
    nombreUsuario: "",
    telefono: "",
    password: "",
    rol: RolUsuario.COBRADOR,
    estado: EstadoUsuario.ACTIVO,
  });

  /*
   * El sufijo del `name` de los campos de contraseña, calculado UNA vez.
   *
   * Eran `Date.now()` y `Math.random()` llamados en pleno render -el truco
   * para que Chrome no autocomplete agresivamente-. Ademas de que el linter
   * lo marca como funcion impura en render, cambiaba el `name` del campo en
   * CADA pintado: React veia un campo distinto cada vez.
   *
   * Con `useState` de inicializacion perezosa se calcula al montar y se queda
   * quieto, que es lo que el truco necesita.
   */
  const [sufijoAntiAutocompletado] = useState(
    () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  );
  const [showPassword, setShowPassword] = useState(false);

  const roles: Role[] = [
    {
      id: RolUsuario.SUPER_ADMINISTRADOR,
      nombre: "SuperAdministrador",
      label: "SuperAdministrador",
      descripcion: "Acceso total al sistema",
      color: "text-violet-600",
      bgColor: "bg-violet-50",
      icon: <Shield className="h-3.5 w-3.5" />,
    },
    {
      id: RolUsuario.ADMIN,
      nombre: "Administrador",
      label: "Administrador",
      descripcion: "Gestión operativa y financiera",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      icon: <Briefcase className="h-3.5 w-3.5" />,
    },
    {
      id: RolUsuario.COORDINADOR,
      nombre: "Coordinador",
      label: "Coordinador",
      descripcion: "Gestión operativa",
      color: "text-sky-600",
      bgColor: "bg-sky-50",
      icon: <Users className="h-3.5 w-3.5" />,
    },
    {
      id: RolUsuario.SUPERVISOR,
      nombre: "Supervisor",
      label: "Supervisor",
      descripcion: "Supervisión y control",
      color: "text-violet-600",
      bgColor: "bg-violet-50",
      icon: <Eye className="h-3.5 w-3.5" />,
    },
    {
      id: RolUsuario.COBRADOR,
      nombre: "Cobrador",
      label: "Cobrador",
      descripcion: "Gestión de cobranza",
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      icon: <Briefcase className="h-3.5 w-3.5" />,
    },
    {
      id: RolUsuario.CONTADOR,
      nombre: "Contable",
      label: "Contable",
      descripcion: "Operaciones financieras",
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      icon: <Sparkles className="h-3.5 w-3.5" />,
    },
    {
      id: RolUsuario.PUNTO_DE_VENTA,
      nombre: "Punto de Venta",
      label: "Punto de Venta",
      descripcion: "Ventas de artículos",
      color: "text-teal-600",
      bgColor: "bg-teal-50",
      icon: <ShoppingBag className="h-3.5 w-3.5" />,
    },
  ];

  const roleFilters = [
    {
      id: "all",
      label: "Todos",
      nombre: "Todos",
      color: "text-slate-600",
      bgColor: "bg-slate-100",
    },
    ...roles,
  ];

  const statusFilters = [
    { id: "operativos", label: "Operativos" },
    { id: EstadoUsuario.ACTIVO, label: "Activos" },
    { id: EstadoUsuario.INACTIVO, label: "Inactivos" },
    { id: EstadoUsuario.SUSPENDIDO, label: "Suspendidos" },
    { id: EstadoUsuario.ARCHIVADO, label: "Archivados" },
  ];

  const filteredUsers = users.filter((user) => {
    const fullName = `${user.nombres} ${user.apellidos}`.toLowerCase();
    const matchesSearch =
      fullName.includes(searchTerm.toLowerCase()) ||
      (user.nombreUsuario || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.correo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === "all" || user.rol === filterRole;
    const matchesStatus =
      filterStatus === "operativos"
        ? user.estado !== EstadoUsuario.ARCHIVADO
        : user.estado === filterStatus;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const stats = {
    total: users.filter((u) => u.estado !== EstadoUsuario.ARCHIVADO).length,
    active: users.filter((u) => u.estado === EstadoUsuario.ACTIVO).length,
    admins: users.filter((u) => u.rol === RolUsuario.SUPER_ADMINISTRADOR)
      .length,
    inactive: users.filter((u) => u.estado === EstadoUsuario.INACTIVO || u.estado === EstadoUsuario.SUSPENDIDO).length,
    archived: users.filter((u) => u.estado === EstadoUsuario.ARCHIVADO).length,
  };

  // PAGINACIÓN
  const [currentPage, setCurrentPage] = useState(1);
  /*
   * Diez por pagina, no seis.
   *
   * Medido en la pantalla: la empresa tiene OCHO usuarios, asi que con seis
   * por pagina habia una segunda pagina con dos filas y habia que paginar para
   * ver al cobrador. Diez los muestra todos y el paginador sigue ahi para
   * cuando crezcan.
   */
  const itemsPerPage = 10;

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  // El reinicio de página se movió a los manejadores de eventos directos

  const handleOpenCreateModal = () => {
    setFormData({
      nombres: "",
      apellidos: "",
      correo: "",
      nombreUsuario: "",
      telefono: "",
      password: "",
      rol: RolUsuario.COBRADOR,
      estado: EstadoUsuario.ACTIVO,
    });
    setSelectedPermissions([]);
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (user: User) => {
    logger.log("[EDIT_MODAL] Abriendo modal para usuario:", user.id);
    logger.log("[EDIT_MODAL] SearchTerm actual:", searchTerm);

    if (
      user.rol === RolUsuario.SUPER_ADMINISTRADOR &&
      currentUserRole !== RolUsuario.SUPER_ADMINISTRADOR
    ) {
      return;
    }

    setSelectedUser(user);
    setFormData({
      nombres: user.nombres,
      apellidos: user.apellidos,
      correo: user.correo,
      nombreUsuario: user.nombreUsuario || "",
      telefono: user.telefono,
      password: "", // No password on edit
      rol: user.rol,
      estado: user.estado,
    });
    setSelectedPermissions(user.permisos);
    setIsEditModalOpen(true);

    logger.log("[EDIT_MODAL] Modal abierto, SearchTerm después:", searchTerm);
  };

  const handleOpenDetailModal = (user: User) => {
    setSelectedUser(user);
    setIsDetailModalOpen(true);
  };
  const handleOpenPermissionsModal = (user: User) => {
    if (
      user.rol === RolUsuario.SUPER_ADMINISTRADOR &&
      currentUserRole !== RolUsuario.SUPER_ADMINISTRADOR
    ) {
      return;
    }

    const flattenPermissionIds = (modules: ModuloPermiso[]): string[] => {
      const ids: string[] = [];
      modules.forEach((m) => {
        if (m?.submodulos?.length) {
          m.submodulos.forEach((s: ModuloPermiso) => {
            if (s?.id) ids.push(s.id);
          });
        } else if (m?.id) {
          ids.push(m.id);
        }
      });
      return ids;
    };

    const permisosGuardados = Array.isArray((user).permisos)
      ? (user).permisos
      : [];
    const permisosDefaultRol = flattenPermissionIds(
      permisosPorRol[user.rol] || [],
    );

    const expandGroupIds = (ids: string[]): string[] => {
      const allModules = Object.values(permisosPorRol || {}).flat()
      const expanded = new Set<string>()

      ids.forEach((id) => {
        const group = allModules.find((m) => m?.id === id && Array.isArray(m?.submodulos) && m.submodulos.length > 0)
        if (group) {
          group.submodulos?.forEach((s) => {
            if (s?.id) expanded.add(s.id)
          })
          return
        }
        expanded.add(id)
      })

      return Array.from(expanded)
    }

    let permisosIniciales: string[]
    if (user.rol === RolUsuario.SUPER_ADMINISTRADOR) {
      // El superadmin tiene todo: se muestran todos los módulos marcados.
      permisosIniciales = permisosDefaultRol
    } else {
      // El estado marcado refleja EXACTAMENTE lo que el usuario tiene según el
      // backend (rol + personalizados ya fusionados en `user.permisos`). Antes
      // se forzaban los defaults del frontend, que podían marcar módulos que el
      // usuario no tenía realmente y otorgárselos al guardar.
      permisosIniciales = expandGroupIds(permisosGuardados)
    }

    setSelectedUser(user);
    setSelectedPermissions(permisosIniciales);
    setTimeout(() => {
      setIsPermissionsModalOpen(true);
    }, 0);
  };

  const handleOpenDeleteModal = (user: User) => {
    if (user.rol === RolUsuario.SUPER_ADMINISTRADOR) {
      return;
    }

    setSelectedUser(user);
    setUserAction("toggle");
    setIsDeleteModalOpen(true);
  };

  const handleOpenArchiveModal = (user: User) => {
    if (user.rol === RolUsuario.SUPER_ADMINISTRADOR) {
      return;
    }

    setSelectedUser(user);
    setUserAction("archive");
    setIsDeleteModalOpen(true);
  };

  const handleOpenRestoreModal = (user: User) => {
    setSelectedUser(user);
    setUserAction("restore");
    setIsDeleteModalOpen(true);
  };

  const handleOpenHideModal = (user: User) => {
    if (user.rol === RolUsuario.SUPER_ADMINISTRADOR) {
      return;
    }

    setSelectedUser(user);
    setUserAction("hide");
    setIsDeleteModalOpen(true);
  };

  const normalizeNombreUsuario = (value: string) => value.trim().toLowerCase();

  const getNombreUsuarioError = (value: string) => {
    const normalized = normalizeNombreUsuario(value);

    if (!normalized) return "El nombre de usuario es obligatorio";
    if (normalized.length < 3 || normalized.length > 50) {
      return "El nombre de usuario debe tener entre 3 y 50 caracteres";
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(normalized)) {
      return "El nombre de usuario solo puede contener letras, números, punto, guion y guion bajo.";
    }

    return "";
  };

  const handleCreateUser = async () => {
    if (isCreatingUser) return;
    try {
      // Validar campos mínimos
      if (
        !formData.nombres ||
        !formData.apellidos ||
        !formData.correo ||
        !formData.nombreUsuario ||
        !formData.password
      ) {
        showNotification(
          "error",
          "Por favor complete todos los campos obligatorios",
          "Campos Faltantes",
        );
        return;
      }

      if (formData.password.trim().length < 6) {
        showNotification(
          "error",
          "La contraseña debe tener al menos 6 caracteres",
          "Contraseña inválida",
        );
        return;
      }

      const nombreUsuarioError = getNombreUsuarioError(formData.nombreUsuario);
      if (nombreUsuarioError) {
        showNotification("error", nombreUsuarioError, "Nombre de usuario");
        return;
      }

      setIsCreatingUser(true);
      await usuariosService.crear({
        ...formData,
        correo: formData.correo.trim().toLowerCase(),
        nombreUsuario: normalizeNombreUsuario(formData.nombreUsuario),
      });

      showNotification(
        "success",
        "El usuario ha sido creado exitosamente",
        "Usuario Creado",
      );
      setIsCreateModalOpen(false);
      fetchUsers(); // Recargar lista
    } catch (error) {
      console.error("Error creating user:", error);
      const backendMsg = mensajeDeError(error, "No se pudo crear el usuario");
      showNotification("error", backendMsg, "Error al crear usuario");
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleConfirmUserAction = async () => {
    if (!selectedUser) return;

    if (selectedUser.rol === RolUsuario.SUPER_ADMINISTRADOR && userAction !== "restore") {
      showNotification('error', 'No se puede cambiar el estado de un Superadministrador por seguridad', 'Acción Denegada');
      setIsDeleteModalOpen(false);
      return;
    }

    try {
      if (userAction === "archive") {
        await usuariosService.archivar(selectedUser.id);
        showNotification("success", "El usuario fue archivado y ya no aparecerá en la operación normal", "Usuario Archivado");
        setIsDeleteModalOpen(false);
        fetchUsers();
        return;
      }

      if (userAction === "restore") {
        await usuariosService.restaurar(selectedUser.id);
        showNotification("success", "El usuario fue restaurado como activo", "Usuario Restaurado");
        setIsDeleteModalOpen(false);
        fetchUsers();
        return;
      }

      if (userAction === "hide") {
        await usuariosService.eliminar(selectedUser.id);
        showNotification("success", "El usuario archivado fue ocultado del panel", "Usuario Ocultado");
        setIsDeleteModalOpen(false);
        fetchUsers();
        return;
      }

      const nuevoEstado: EstadoUsuario =
        selectedUser.estado === EstadoUsuario.ACTIVO
          ? EstadoUsuario.INACTIVO
          : EstadoUsuario.ACTIVO;
      await usuariosService.toggleEstado(selectedUser.id, nuevoEstado);

      const action =
        selectedUser.estado === EstadoUsuario.ACTIVO
          ? "desactivado"
          : "activado";
      showNotification(
        "success",
        `El usuario ha sido ${action} exitosamente`,
        "Estado Actualizado",
      );
      setIsDeleteModalOpen(false); // Modal se usa para confirmar toggle
      fetchUsers();
    } catch (error) {
      console.error("Error gestionando usuario:", error);
      showNotification(
        "error",
        "No se pudo completar la acción sobre el usuario",
        "Error",
      );
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser || isSavingUser) return;
    setIsSavingUser(true);
    try {
      // Cambiar contrasena primero si se proporcionó
      if (formData.password && formData.password.trim() !== '') {
        const passwordToSet = formData.password.trim();
        if (passwordToSet.length < 6) {
          showNotification('error', 'La contrasena debe tener al menos 6 caracteres', 'Error Validacion');
          return;
        }
        try {
          await usuariosService.cambiarContrasena(selectedUser.id, {
            contrasenaNueva: passwordToSet,
          });
          // No mostramos toast aquí — se mostrará uno solo al final con todo el resultado
        } catch (e) {
          showNotification('error', mensajeDeError(e, 'Fallo el cambio de contrasena'), 'Error Critico');
          throw e;
        }
      }

      if (formData.nombreUsuario.trim()) {
        const nombreUsuarioError = getNombreUsuarioError(formData.nombreUsuario);
        if (nombreUsuarioError) {
          showNotification("error", nombreUsuarioError, "Nombre de usuario");
          return;
        }
      }

      // Actualizar datos personales
      await usuariosService.actualizar(selectedUser.id, {
        nombres: formData.nombres,
        apellidos: formData.apellidos,
        correo: formData.correo,
        ...(formData.nombreUsuario.trim() && {
          nombreUsuario: normalizeNombreUsuario(formData.nombreUsuario),
        }),
        telefono: formData.telefono,
        rol: formData.rol,
        estado: formData.estado,
      });

      // Sincronizar localStorage si el usuario editado es el mismo que tiene la sesion
      if (currentUser && selectedUser.id === currentUser.id) {
        const userData = localStorage.getItem('user');
        if (userData) {
          try {
            const parsedLocal = JSON.parse(userData);
            const newUserData = {
              ...parsedLocal,
              nombres: formData.nombres,
              apellidos: formData.apellidos,
              correo: formData.correo,
              nombreUsuario: formData.nombreUsuario.trim()
                ? normalizeNombreUsuario(formData.nombreUsuario)
                : parsedLocal.nombreUsuario,
              telefono: formData.telefono,
              rol: formData.rol,
              estado: formData.estado
            };
            localStorage.setItem('user', JSON.stringify(newUserData));
            window.dispatchEvent(new Event('userUpdated'));
          } catch (e) {
            console.error('Error al actualizar localStorage:', e);
          }
        }
      }

      // Toast final unificado (incluye si se cambió la contraseña)
      const msg = formData.password && formData.password.trim() !== ''
        ? 'Datos y contraseña actualizados correctamente'
        : 'Información de usuario actualizada';
      showNotification('success', msg, 'Éxito');
      setIsEditModalOpen(false);
      setSelectedUser(null);
      await fetchUsers();
    } catch (error) {
      const errorMsg = mensajeDeError(error, 'Error desconocido');
      if (formData.password && formData.password.trim() !== '') {
        showNotification('warning', `Contraseña cambiada, pero falló la actualización de datos: ${errorMsg}`, 'Actualización Parcial');
      } else {
        showNotification('error', `No se pudo actualizar el usuario: ${errorMsg}`, 'Error');
      }
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleUpdatePermissions = async () => {
    if (!selectedUser) return;

    try {
      const validIds = new Set(availableModules.map((m) => m.id));
      const permissionsToSave = selectedPermissions.filter((p) => validIds.has(p));

      await usuariosService.asignarPermisos(selectedUser.id, permissionsToSave);

      // Si el usuario editado es el mismo que tiene la sesión, refrescar token/permisos/sidebar
      // para evitar que el menú quede desactualizado hasta el próximo login.
      if (currentUser && selectedUser.id === currentUser.id) {
        try {
          const refreshed = await refreshSesion();
          if (refreshed?.access_token) {
            localStorage.setItem('token', refreshed.access_token);
          }

          if (refreshed?.usuario) {
            const existingRaw = localStorage.getItem('user');
            // Lo que se guarda en localStorage bajo 'user': se leen y reescriben sus
            // campos, asi que se declara como un mapa, no `any`.
            let existing: Record<string, unknown> | null = null;
            try {
              existing = existingRaw ? JSON.parse(existingRaw) : null;
            } catch {
              existing = null;
            }

            const mergedUser = {
              ...(existing || {}),
              ...refreshed.usuario,
            };
            localStorage.setItem('user', JSON.stringify(mergedUser));
          }

          window.dispatchEvent(new Event('userUpdated'));
        } catch {
          // Si falla el refresh, no bloqueamos la UX: los permisos quedan guardados y se aplicarán al re-login.
        }
      }

      const updatedUsers = users.map((user) => {
        if (user.id === selectedUser.id) {
          return {
            ...user,
            permisos: permissionsToSave,
          };
        }
        return user;
      });

      setUsers(updatedUsers);
      setIsPermissionsModalOpen(false);
      showNotification(
        "success",
        "Los permisos del usuario han sido actualizados",
        "Permisos Actualizados",
      );
    } catch (error) {
      // Se cae el `error?.toString?.()` de la cadena: para un objeto cualquiera
      // devuelve "[object Object]", que no le dice nada a nadie.
      const msg = mensajeDeError(error, 'Error desconocido');

      console.error("Error actualizando los permisos:", msg, {
        status: estadoDeError(error),
        data: datosParaRegistro(error).data,
      });

      showNotification("error", msg, "Error");
    }
  };

  // Obtener la estructura de módulos basada en el rol del usuario seleccionado
  // Se quitó el useEffect que causaba el bucle infinito: availableModules ahora
  // se calcula con el useMemo de arriba.

  const handleTogglePermission = (permissionId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((p) => p !== permissionId)
        : [...prev, permissionId],
    );
  };

  const getStatusColor = (estado: User["estado"]) => {
    switch (estado) {
      case EstadoUsuario.ACTIVO:
        return "text-emerald-700 bg-emerald-50 border-emerald-100";
      case EstadoUsuario.INACTIVO:
        return "text-slate-600 bg-slate-100 border-slate-200";
      case EstadoUsuario.SUSPENDIDO:
        return "text-rose-700 bg-rose-50 border-rose-100";
      case EstadoUsuario.ARCHIVADO:
        return "text-amber-700 bg-amber-50 border-amber-100";
      default:
        return "text-slate-600 bg-slate-100 border-slate-200";
    }
  };

  const getStatusText = (estado: User["estado"]) => {
    switch (estado) {
      case EstadoUsuario.ACTIVO:
        return "Activo";
      case EstadoUsuario.INACTIVO:
        return "Inactivo";
      case EstadoUsuario.SUSPENDIDO:
        return "Suspendido";
      case EstadoUsuario.ARCHIVADO:
        return "Archivado";
      default:
        return "Desconocido";
    }
  };

  const getUserActionConfig = (user: User) => {
    if (userAction === "archive") {
      return {
        title: "¿Archivar usuario?",
        message: `${user.nombres} saldrá de la operación normal, no podrá iniciar sesión y solo aparecerá en el filtro de archivados.`,
        confirm: "Archivar",
        icon: <Archive className="h-6 w-6" />,
        tone: "bg-amber-50 text-amber-600",
        button: "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20",
      };
    }

    if (userAction === "restore") {
      return {
        title: "¿Restaurar usuario?",
        message: `${user.nombres} volverá al listado operativo como usuario activo.`,
        confirm: "Restaurar",
        icon: <RotateCcw className="h-6 w-6" />,
        tone: "bg-emerald-50 text-emerald-600",
        button: "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20",
      };
    }

    if (userAction === "hide") {
      return {
        title: "¿Ocultar usuario archivado?",
        message: `${user.nombres} dejará de aparecer incluso en Archivados. Su historial financiero y operativo se conservará.`,
        confirm: "Ocultar",
        icon: <Trash2 className="h-6 w-6" />,
        tone: "bg-rose-50 text-rose-600",
        button: "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20",
      };
    }

    const isActive = user.estado === EstadoUsuario.ACTIVO;
    return {
      title: isActive ? "¿Desactivar usuario?" : "¿Activar usuario?",
      message: isActive
        ? `Se bloqueará temporalmente el acceso de ${user.nombres}. Podrás reactivarlo cuando lo necesites.`
        : `Se restablecerá el acceso para ${user.nombres}.`,
      confirm: isActive ? "Desactivar" : "Activar",
      icon: isActive ? <EyeOff className="h-6 w-6" /> : <CheckCircle2 className="h-6 w-6" />,
      tone: isActive ? "bg-slate-100 text-slate-700" : "bg-emerald-50 text-emerald-600",
      button: isActive
        ? "bg-slate-800 hover:bg-slate-900 shadow-slate-800/20"
        : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20",
    };
  };

  if (!permitido) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-xs text-slate-600 font-bold border border-slate-200">
            <Users className="h-3.5 w-3.5" />
            <span>Acceso no autorizado</span>
          </div>
          <p className="mt-4 text-slate-500 font-medium">
            No tienes permisos para ver Usuarios.
          </p>
        </div>
      </div>
    );
  }

  // Despues del guard de permisos, nunca antes: quien no puede ver esta pantalla
  // tampoco debe ver su esqueleto, que ya adelanta que hay una tabla de usuarios.
  if (!accesoRestringido && errorListado && users.length === 0) {
    return <PanelDeError titulo="No se pudieron cargar los usuarios" mensaje={errorListado}
      reintentando={loading} onReintentar={() => { setLoading(true); void fetchUsers(); }} />;
  }

  if (loading && !accesoRestringido) {
    return (
      <div className="p-4 sm:p-6">
        <SkeletonTabla filas={8} />
      </div>
    );
  }

  return (
    <>
      {accesoRestringido ? (
        <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4 text-center px-6">
          <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center">
            <Shield className="w-8 h-8 text-rose-500" />
          </div>
          <h2 className="text-xl font-black text-slate-900">Acceso Restringido</h2>
          <p className="text-sm text-slate-500 max-w-sm font-medium">
            La gestión de usuarios y permisos está reservada exclusivamente para el{' '}
            <span className="font-bold text-slate-700">Super Administrador</span>.
            Contacta al administrador del sistema si necesitas realizar cambios.
          </p>
        </div>
      ) : (
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
                <span className="text-blue-600">Usuarios del </span>
                <span className="text-orange-500">Sistema</span>
              </h1>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                Administra el acceso, roles y permisos de los usuarios de
                CrediSur.
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {[
              {
                label: "Usuarios Totales",
                value: stats.total,
                color: "text-sky-700",
                bgColor: "bg-sky-50",
                icon: <Users className="h-5 w-5" />,
              },
              {
                label: "Activos",
                value: stats.active,
                color: "text-emerald-700",
                bgColor: "bg-emerald-50",
                icon: <Check className="h-5 w-5" />,
              },
              {
                label: "Administradores",
                value: stats.admins,
                color: "text-violet-700",
                bgColor: "bg-violet-50",
                icon: <Shield className="h-5 w-5" />,
              },
              {
                label: "Inactivos",
                value: stats.inactive,
                color: "text-slate-600",
                bgColor: "bg-slate-100",
                icon: <EyeOff className="h-5 w-5" />,
              },
              {
                label: "Archivados",
                value: stats.archived,
                color: "text-amber-700",
                bgColor: "bg-amber-50",
                icon: <Archive className="h-5 w-5" />,
              },
            ].map((stat, index) => (
              <div
                key={index}
                className="group relative overflow-hidden bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300"
              >
                {/*
                  `gap-3` y `shrink-0`: medido en el navegador, a 1366 y a 1280
                  de ancho el borde derecho de «ADMINISTRADORES» quedaba
                  exactamente en el borde izquierdo del icono -hueco de 0 px-,
                  que es lo que en una captura se lee como que se solapan.
                */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {stat.label}
                    </p>
                    <h3 className="text-3xl font-bold text-slate-900 mt-2 tracking-tight">
                      {stat.value}
                    </h3>
                  </div>
                  <div
                    className={cn(
                      "p-3 rounded-2xl shrink-0 group-hover:scale-110 transition-transform duration-300",
                      stat.bgColor,
                      stat.color,
                    )}
                  >
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
                  const value = e.target.value;
                  logger.log("[SEARCH] Input onChange - valor:", value);
                  logger.log(
                    "[SEARCH] Input onChange - evento:",
                    e.nativeEvent,
                  );
                  logger.log(
                    "[SEARCH] Input onChange - inputType:",
                    (e.nativeEvent as InputEvent)?.inputType,
                  );

                  // Prevenir escritura automática de "superadmin"
                  if (
                    value.toLowerCase() === "superadmin" &&
                    (e.nativeEvent as InputEvent)?.inputType === undefined
                  ) {
                    logger.log(
                      '[SEARCH] ⚠️ Escritura automática detectada - bloqueando "superadmin"',
                    );
                    setSearchTerm("");
                    setCurrentPage(1);
                    return;
                  }

                  setSearchTerm(value);
                  setCurrentPage(1);
                }}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
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
                        ? "bg-slate-900 text-white shadow-md"
                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/50",
                    )}
                  >
                    {role.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-1 bg-slate-50/50 p-1 rounded-2xl border border-slate-200">
                {statusFilters.map((status) => (
                  <button
                    key={status.id}
                    onClick={() => {
                      setFilterStatus(status.id);
                      setCurrentPage(1);
                    }}
                    className={cn(
                      "px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap",
                      filterStatus === status.id
                        ? "bg-blue-600 text-white shadow-md"
                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/50",
                    )}
                  >
                    {status.label}
                  </button>
                ))}
              </div>

              <div className="hidden md:flex bg-slate-50/50 p-1 rounded-2xl border border-slate-200 shrink-0">
                <button aria-label="Ver como cuadrícula"
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "p-2 rounded-lg transition-all",
                    viewMode === "grid"
                      ? "bg-white text-slate-900 shadow-sm ring-1 ring-black/5"
                      : "text-slate-400 hover:text-slate-600",
                  )}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button aria-label="Ver como lista"
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "p-2 rounded-lg transition-all",
                    viewMode === "list"
                      ? "bg-white text-slate-900 shadow-sm ring-1 ring-black/5"
                      : "text-slate-400 hover:text-slate-600",
                  )}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Vista Lista (Tabla) - Solo Desktop */}
          {viewMode === "list" ? (
            <div className="hidden md:block bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/*
                Los margenes de esta tabla son mas estrechos que los del resto
                de la pagina a proposito. Medido a 1280 de ancho -un portatil
                normal-: la tabla pedia 1037 px y tenia 958, asi que la columna
                de ACCIONES se quedaba 79 px fuera. Scrollaba, pero nada en la
                pantalla decia que hubiera algo mas a la derecha, asi que los
                botones de cada usuario simplemente no estaban. Bajando el
                relleno horizontal entran las cinco columnas.
              */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-5 font-bold tracking-wider">
                        Usuario
                      </th>
                      <th className="px-4 py-5 font-bold tracking-wider">
                        Rol
                      </th>
                      <th className="px-4 py-5 font-bold tracking-wider">
                        Estado
                      </th>
                      <th className="px-4 py-5 font-bold tracking-wider">
                        Último Acceso
                      </th>
                      <th className="px-5 py-5 font-bold tracking-wider text-right">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentUsers.map((user) => {
                      const role = roles.find((r) => r.id === user.rol);
                      return (
                        <tr
                          key={user.id}
                          className="hover:bg-slate-50/50 transition-colors group"
                        >
                          <td className="px-5 py-5">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center border border-slate-200 text-slate-600 font-bold text-xs shadow-sm">
                                {user.nombres.charAt(0)}
                                {user.apellidos.charAt(0)}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900">
                                  {user.nombres} {user.apellidos}
                                </div>
                                <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 font-medium min-w-0">
                                  <Mail className="h-3 w-3 shrink-0" />
                                  <span className="truncate" title={user.correo || undefined}>{user.correo}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-5">
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  "p-2 rounded-lg",
                                  role?.bgColor,
                                  role?.color,
                                )}
                              >
                                {role?.icon}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900">
                                  {role?.nombre}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-5">
                            <span
                              className={cn(
                                "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold tracking-wide uppercase border",
                                getStatusColor(user.estado),
                              )}
                            >
                              {getStatusText(user.estado)}
                            </span>
                          </td>
                          <td className="px-4 py-5 font-medium">
                            {/*
                              La fecha y la hora, en dos lineas a proposito.
                              Medido a 1280 de ancho: esta celda mide 103 px y
                              el texto completo -«8 de sept, 07:47 PM»- pide
                              unos 130, asi que el navegador lo partia donde le
                              tocara. Forzar una linea devolveria el corte de
                              la columna de Acciones, asi que se parte donde
                              toca y la hora queda como dato secundario, que es
                              lo que es en un ultimo acceso de hace dias.
                            */}
                            {partirFechaYHora(user.ultimoAcceso).map(
                              (parte, i) => (
                                <div
                                  key={parte}
                                  className={
                                    i === 0
                                      ? 'text-slate-600'
                                      : 'text-xs text-slate-400'
                                  }
                                >
                                  {parte}
                                </div>
                              ),
                            )}
                          </td>
                          <td className="px-5 py-5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Tooltip texto="Ver detalle">
                                <button aria-label="Ver detalle"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenDetailModal(user);
                                  }}
                                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  disabled={
                                    user.rol === "SUPER_ADMINISTRADOR" &&
                                    currentUserRole !== "SUPER_ADMINISTRADOR"
                                  }
                                  style={
                                    user.rol === "SUPER_ADMINISTRADOR" &&
                                    currentUserRole !== "SUPER_ADMINISTRADOR"
                                      ? { pointerEvents: "none", opacity: 0.5 }
                                      : {}
                                  }
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                              </Tooltip>
                              {puedeEditar && (
                                <Tooltip texto="Editar">
                                  <button aria-label="Editar"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenEditModal(user);
                                    }}
                                    className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                    disabled={
                                      user.rol === "SUPER_ADMINISTRADOR" &&
                                      currentUserRole !== "SUPER_ADMINISTRADOR"
                                    }
                                    style={
                                      user.rol === "SUPER_ADMINISTRADOR" &&
                                      currentUserRole !== "SUPER_ADMINISTRADOR"
                                        ? { pointerEvents: "none", opacity: 0.5 }
                                        : {}
                                    }
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </button>
                                </Tooltip>
                              )}
                              {puedeGestionarPermisos && (
                                <Tooltip texto="Permisos">
                                  <button aria-label="Permisos"
                                    onClick={() =>
                                      handleOpenPermissionsModal(user)
                                    }
                                    className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                                    disabled={
                                      user.rol === "SUPER_ADMINISTRADOR" &&
                                      currentUserRole !== "SUPER_ADMINISTRADOR"
                                    }
                                  >
                                    <Key className="h-4 w-4" />
                                  </button>
                                </Tooltip>
                              )}
                              {puedeEliminar && (
                                <>
                                  {user.estado === EstadoUsuario.ARCHIVADO ? (
                                    <>
                                      <Tooltip texto="Restaurar">
                                        <button aria-label="Restaurar"
                                          onClick={() => handleOpenRestoreModal(user)}
                                          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                        >
                                          <RotateCcw className="h-4 w-4" />
                                        </button>
                                      </Tooltip>
                                      <Tooltip texto="Ocultar definitivamente">
                                        <button aria-label="Ocultar definitivamente"
                                          onClick={() => handleOpenHideModal(user)}
                                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                          disabled={user.rol === "SUPER_ADMINISTRADOR"}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      </Tooltip>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => handleOpenDeleteModal(user)}
                                        className={cn(
                                          "p-2 rounded-lg transition-colors",
                                          user.estado === EstadoUsuario.ACTIVO
                                            ? "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                                            : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50",
                                        )}
                                        title={
                                          user.estado === EstadoUsuario.ACTIVO
                                            ? "Desactivar"
                                            : "Activar"
                                        }
                                        disabled={user.rol === "SUPER_ADMINISTRADOR"}
                                      >
                                        {user.estado === EstadoUsuario.ACTIVO ? (
                                          <EyeOff className="h-4 w-4" />
                                        ) : (
                                          <CheckCircle2 className="h-4 w-4" />
                                        )}
                                      </button>
                                      <Tooltip texto="Archivar">
                                        <button aria-label="Archivar"
                                          onClick={() => handleOpenArchiveModal(user)}
                                          className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                          disabled={user.rol === "SUPER_ADMINISTRADOR"}
                                        >
                                          <Archive className="h-4 w-4" />
                                        </button>
                                      </Tooltip>
                                    </>
                                  )}
                                </>
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
          ) : null}

          {/* Vista Grid (Tarjetas) - Siempre visible en móviles, condicional en desktop */}
            <div
              className={cn(
                "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500",
                viewMode === "list" && "md:hidden",
              )}
            >
              {currentUsers.map((user) => {
                const role = roles.find((r) => r.id === user.rol);
                return (
                  <div
                    key={user.id}
                    className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 p-6 flex flex-col gap-4 group"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center border border-slate-200 text-slate-600 font-bold text-sm shadow-sm group-hover:bg-slate-200 group-hover:text-slate-900 transition-colors">
                          {user.nombres.charAt(0)}
                          {user.apellidos.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 line-clamp-1">
                            {user.nombres} {user.apellidos}
                          </h3>
                          <p className="text-xs text-slate-500 font-medium truncate" title={user.correo || undefined}>
                            {user.correo}
                          </p>
                        </div>
                      </div>
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase border",
                          getStatusColor(user.estado),
                        )}
                      >
                        {getStatusText(user.estado)}
                      </span>
                    </div>

                    <div className="space-y-3 pt-2">
                      <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50/50 border border-slate-100">
                        <div
                          className={cn(
                            "p-2 rounded-lg",
                            role?.bgColor,
                            role?.color,
                          )}
                        >
                          {role?.icon}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Rol asignado
                          </div>
                          <div className="font-bold text-slate-900 text-sm">
                            {role?.nombre}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                          <span className="text-slate-400 font-medium block mb-0.5">
                            Fecha Registro
                          </span>
                          <span className="font-bold text-slate-700">
                            {user.fechaCreacion}
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                          <span className="text-slate-400 font-medium block mb-0.5">
                            Último acceso
                          </span>
                          <span className="font-bold text-slate-700">
                            {user.ultimoAcceso}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 mt-auto">
                      <Tooltip texto="Ver detalle">
                        <button aria-label="Ver detalle"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetailModal(user);
                          }}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          disabled={
                            user.rol === "SUPER_ADMINISTRADOR" &&
                            currentUserRole !== "SUPER_ADMINISTRADOR"
                          }
                          style={
                            user.rol === "SUPER_ADMINISTRADOR" &&
                            currentUserRole !== "SUPER_ADMINISTRADOR"
                              ? { pointerEvents: "none", opacity: 0.5 }
                              : {}
                          }
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </Tooltip>
                      <Tooltip texto="Editar">
                        <button aria-label="Editar"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditModal(user);
                          }}
                          className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          disabled={
                            user.rol === "SUPER_ADMINISTRADOR" &&
                            currentUserRole !== "SUPER_ADMINISTRADOR"
                          }
                          style={
                            user.rol === "SUPER_ADMINISTRADOR" &&
                            currentUserRole !== "SUPER_ADMINISTRADOR"
                              ? { pointerEvents: "none", opacity: 0.5 }
                              : {}
                          }
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      </Tooltip>
                      <Tooltip texto="Permisos">
                        <button aria-label="Permisos"
                          onClick={() => handleOpenPermissionsModal(user)}
                          className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                          disabled={
                            user.rol === "SUPER_ADMINISTRADOR" &&
                            currentUserRole !== "SUPER_ADMINISTRADOR"
                          }
                        >
                          <Key className="h-4 w-4" />
                        </button>
                      </Tooltip>
                      {user.estado === EstadoUsuario.ARCHIVADO ? (
                        <>
                          <Tooltip texto="Restaurar">
                            <button aria-label="Restaurar"
                              onClick={() => handleOpenRestoreModal(user)}
                              className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </button>
                          </Tooltip>
                          <Tooltip texto="Ocultar definitivamente">
                            <button aria-label="Ocultar definitivamente"
                              onClick={() => handleOpenHideModal(user)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              disabled={user.rol === "SUPER_ADMINISTRADOR"}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </Tooltip>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleOpenDeleteModal(user)}
                            className={cn(
                              "p-2 rounded-lg transition-colors",
                              user.estado === EstadoUsuario.ACTIVO
                                ? "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                                : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50",
                            )}
                            title={
                              user.estado === EstadoUsuario.ACTIVO ? "Desactivar" : "Activar"
                            }
                            disabled={user.rol === "SUPER_ADMINISTRADOR"}
                          >
                            {user.estado === EstadoUsuario.ACTIVO ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4" />
                            )}
                          </button>
                          <Tooltip texto="Archivar">
                            <button aria-label="Archivar"
                              onClick={() => handleOpenArchiveModal(user)}
                              className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              disabled={user.rol === "SUPER_ADMINISTRADOR"}
                            >
                              <Archive className="h-4 w-4" />
                            </button>
                          </Tooltip>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

          <div className="p-4 border-t border-slate-100 bg-white/50 rounded-2xl mt-4">
            <Paginador
              pagina={currentPage}
              totalPaginas={totalPages}
              onCambiar={setCurrentPage}
              resumen={`Mostrando ${currentUsers.length} de ${filteredUsers.length} usuarios`}
              className="mt-0"
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      {mounted &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            {isCreateModalOpen && (
              <div
                className="fixed inset-0 capa-modal bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
                onClick={() => setIsCreateModalOpen(false)}
              >
                <div
                  className="bg-white rounded-2xl w-full max-w-3xl border border-slate-200 shadow-2xl p-10 transform scale-100 animate-in zoom-in-95 duration-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-3 mb-8">
                    <div className="shrink-0 p-2 bg-blue-50 text-orange-500 rounded-lg">
                      <UserPlus className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight">
                        <span className="text-blue-600">Nuevo </span>
                        <span className="text-orange-500">Usuario</span>
                      </h2>
                      <p className="text-xs text-slate-500 font-medium">
                        Complete la información para registrar un nuevo usuario
                      </p>
                    </div>
                  </div>
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <FieldLabel htmlFor="page-nombres" required>
                          Nombres
                        </FieldLabel>
                        <input
                          id="page-nombres"
                          type="text"
                          value={formData.nombres}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              nombres: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm font-medium text-slate-900 placeholder:text-slate-400"
                          placeholder="Ej. Juan"
                        />
                      </div>
                      <div>
                        <FieldLabel htmlFor="page-apellidos" required>
                          Apellidos
                        </FieldLabel>
                        <input
                          id="page-apellidos"
                          type="text"
                          value={formData.apellidos}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              apellidos: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm font-medium text-slate-900 placeholder:text-slate-400"
                          placeholder="Ej. Pérez"
                        />
                      </div>
                    </div>

                    <div>
                      <FieldLabel htmlFor="page-correo-electronico" required>
                        Correo Electrónico
                      </FieldLabel>
                      <input
                        id="page-correo-electronico"
                        type="email"
                        autoComplete="off"
                        value={formData.correo}
                        onChange={(e) =>
                          setFormData({ ...formData, correo: e.target.value })
                        }
                        className="w-full px-4 py-3 border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm font-medium text-slate-900 placeholder:text-slate-400"
                        placeholder="Ej. juan@credisur.com"
                      />
                    </div>

                    <div>
                      <FieldLabel htmlFor="page-nombre-de-usuario" required>
                        Nombre de usuario
                      </FieldLabel>
                      <div className="relative">
                        <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          id="page-nombre-de-usuario"
                          type="text"
                          autoComplete="username"
                          value={formData.nombreUsuario}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              nombreUsuario: e.target.value.toLowerCase(),
                            })
                          }
                          className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm font-medium text-slate-900 placeholder:text-slate-400"
                          placeholder="Ej. juan.perez"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <FieldLabel htmlFor="page-telefono">
                          Teléfono
                        </FieldLabel>
                        <input
                          id="page-telefono"
                          type="tel"
                          inputMode="numeric"
                          value={formData.telefono}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              telefono: e.target.value.replace(/\D/g, ""),
                            })
                          }
                          className="w-full px-4 py-3 border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm font-medium text-slate-900 placeholder:text-slate-400"
                          placeholder="Ej. 300 123 4567"
                        />
                      </div>
                      <div>
                        <FieldLabel htmlFor="page-contrasena" required>
                          Contraseña
                        </FieldLabel>
                        <div className="relative">
                          <input
                            id="page-contrasena"
                            type={showPassword ? "text" : "password"}
                            autoComplete="new-password"
                            name={`new_pw_${sufijoAntiAutocompletado}`}
                            value={formData.password}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                password: e.target.value,
                              })
                            }
                            className="w-full px-4 py-3 pr-12 border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm font-medium text-slate-900 placeholder:text-slate-400"
                            placeholder="••••••••"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <FieldLabel htmlFor="page-rol" required>
                        Rol
                      </FieldLabel>
                      <div className="relative">
                        <Selector
                          id="page-rol"
                          value={formData.rol}
                          onChange={(v) =>
                            setFormData({
                              ...formData,
                              rol: v as RolUsuario,
                            })
                          }
                          etiqueta="Rol del usuario"
                          className="rounded-2xl bg-slate-50 text-sm font-medium text-slate-900"
                          opciones={roles.map((role) => ({
                            value: role.id,
                            label: role.label,
                          }))}
                        />
                        <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-100">
                      <button
                        onClick={() => setIsCreateModalOpen(false)}
                        disabled={isCreatingUser}
                        className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-2xl transition-colors disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleCreateUser}
                        disabled={isCreatingUser}
                        className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-2xl shadow-lg shadow-blue-600/20 transition-all transform active:scale-95 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-blue-600 disabled:scale-100"
                      >
                        {isCreatingUser ? (
                          <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> Creando...</>
                        ) : (
                          <><UserPlus className="h-4 w-4" /><span>Crear Usuario</span></>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Edit Modal */}
            {isEditModalOpen && (
              <div
                className="fixed inset-0 capa-modal bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
                onClick={() => setIsEditModalOpen(false)}
              >
                <div
                  className="bg-white rounded-2xl w-full max-w-3xl border border-slate-200 shadow-2xl p-10 transform scale-100 animate-in zoom-in-95 duration-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-3 mb-8">
                    <div className="shrink-0 p-2 bg-amber-50 text-amber-500 rounded-lg">
                      <Edit2 className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight">
                        <span className="text-blue-600">Editar </span>
                        <span className="text-orange-500">Usuario</span>
                      </h2>
                      <p className="text-xs text-slate-500 font-medium">
                        Modifique la información del usuario
                      </p>
                    </div>
                  </div>
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <FieldLabel htmlFor="page-nombres-2" required>
                          Nombres
                        </FieldLabel>
                        <input
                          id="page-nombres-2"
                          type="text"
                          value={formData.nombres}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              nombres: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm font-medium text-slate-900 placeholder:text-slate-400"
                        />
                      </div>
                      <div>
                        <FieldLabel htmlFor="page-apellidos-2" required>
                          Apellidos
                        </FieldLabel>
                        <input
                          id="page-apellidos-2"
                          type="text"
                          value={formData.apellidos}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              apellidos: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm font-medium text-slate-900 placeholder:text-slate-400"
                        />
                      </div>
                    </div>

                    <div>
                      <FieldLabel htmlFor="page-correo-electronico-2" required>
                        Correo Electrónico
                      </FieldLabel>
                      <input
                        id="page-correo-electronico-2"
                        type="email"
                        autoComplete="off"
                        value={formData.correo}
                        onChange={(e) =>
                          setFormData({ ...formData, correo: e.target.value })
                        }
                        className="w-full px-4 py-3 border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm font-medium text-slate-900 placeholder:text-slate-400"
                      />
                    </div>

                    <div>
                      <FieldLabel htmlFor="page-nombre-de-usuario-2">
                        Nombre de usuario
                      </FieldLabel>
                      <div className="relative">
                        <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          id="page-nombre-de-usuario-2"
                          type="text"
                          autoComplete="username"
                          value={formData.nombreUsuario}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              nombreUsuario: e.target.value.toLowerCase(),
                            })
                          }
                          className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm font-medium text-slate-900 placeholder:text-slate-400"
                          placeholder="Ej. juan.perez"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <FieldLabel htmlFor="page-telefono-2">
                          Teléfono
                        </FieldLabel>
                        <input
                          id="page-telefono-2"
                          type="tel"
                          inputMode="numeric"
                          value={formData.telefono}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              telefono: e.target.value.replace(/\D/g, ""),
                            })
                          }
                          className="w-full px-4 py-3 border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm font-medium text-slate-900 placeholder:text-slate-400"
                        />
                      </div>
                      <div>
                        <div>
                          <FieldLabel htmlFor="page-contrasena-2">
                            Contraseña
                          </FieldLabel>
                          <div className="relative">
                            <input
                              id="page-contrasena-2"
                              type={showPassword ? "text" : "password"}
                              autoComplete="new-password"
                              // Sufijo estable: ver `sufijoAntiAutocompletado`.
                              name={`password_field_${sufijoAntiAutocompletado}`}
                              value={formData.password}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  password: e.target.value,
                                })
                              }
                              className="w-full px-4 py-3 pr-12 border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm font-medium text-slate-900 placeholder:text-slate-400"
                              placeholder="•••••••• (Dejar vacío para mantener la actual)"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                              {showPassword ? (
                                <EyeOff className="h-5 w-5" />
                              ) : (
                                <Eye className="h-5 w-5" />
                              )}
                            </button>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1 pl-1">
                            * Por seguridad, la contraseña actual no se muestra.
                            Escriba una nueva solo si desea cambiarla.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <FieldLabel htmlFor="page-rol-2" required>
                        Rol
                      </FieldLabel>
                      <div className="relative">
                        <Selector
                          value={formData.rol}
                          onChange={(v) =>
                            setFormData({
                              ...formData,
                              rol: v as RolUsuario,
                            })
                          }
                          etiqueta="Rol del usuario"
                          className="rounded-2xl bg-slate-50 text-sm font-medium text-slate-900"
                          opciones={roles.map((role) => ({
                            value: role.id,
                            label: role.label,
                          }))}
                        />
                        <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-100">
                      <button
                        onClick={() => setIsEditModalOpen(false)}
                        disabled={isSavingUser}
                        className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-2xl transition-colors disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleUpdateUser}
                        disabled={isSavingUser}
                        className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-2xl shadow-lg shadow-blue-600/20 transition-all transform active:scale-95 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-blue-600 disabled:scale-100"
                      >
                        {isSavingUser ? (
                          <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> Guardando...</>
                        ) : (
                          <><Save className="h-4 w-4" /><span>Guardar Cambios</span></>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Permissions Modal */}
            {isPermissionsModalOpen && selectedUser && (
              <div
                className="fixed inset-0 capa-modal bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
                onClick={() => setIsPermissionsModalOpen(false)}
              >
                <div
                  className="bg-white rounded-2xl w-full max-w-5xl border border-slate-200 shadow-2xl p-10 transform scale-100 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-3 mb-6 shrink-0">
                    <div className="shrink-0 p-2 bg-blue-50 text-orange-600 rounded-lg">
                      <Key className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                        Gestión de Permisos
                      </h2>
                      <p className="text-sm text-slate-500 font-medium">
                        Configura los accesos para{" "}
                        <span className="text-slate-900 font-bold">
                          {selectedUser.nombres} {selectedUser.apellidos}
                        </span>
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
                              : "bg-white border-slate-200 hover:border-blue-200 hover:bg-slate-50",
                          )}
                        >
                          <div className="pt-0.5">
                            <div
                              className={cn(
                                "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                                selectedPermissions.includes(module.id)
                                  ? "bg-blue-600 border-blue-600"
                                  : "bg-white border-slate-300",
                              )}
                            >
                              {selectedPermissions.includes(module.id) && (
                                <Check className="h-3.5 w-3.5 text-white stroke-[3]" />
                              )}
                            </div>
                            {/*
                              Sin `id` fijo: estaba escrito a mano como
                              `page-rol-2` DENTRO del `.map()`, asi que los
                              dieciocho permisos compartian el mismo
                              identificador. Medido en el navegador: 17
                              repetidos. Un id duplicado es HTML invalido y
                              deja a un lector de pantalla sin saber que
                              casilla esta anunciando.

                              No hace falta ninguno: el `input` va DENTRO de
                              su `label`, asi que la asociacion es implicita.
                              Lo que si hace falta es decir que activa.
                            */}
                            <input
                              type="checkbox"
                              className="hidden"
                              aria-label={module.label}
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
                            <span
                              className={cn(
                                "block text-sm font-bold mb-0.5",
                                selectedPermissions.includes(module.id)
                                  ? "text-blue-900"
                                  : "text-slate-700",
                              )}
                            >
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
                    <BotonAccion
                      onClick={handleUpdatePermissions}
                      textoCargando="Guardando…"
                      icono={<Save className="h-4 w-4" />}
                      className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-2xl shadow-lg shadow-blue-600/20 transition-all transform active:scale-95 flex items-center gap-2"
                    >
                      <span>Guardar Cambios</span>
                    </BotonAccion>
                  </div>
                </div>
              </div>
            )}

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && selectedUser && (
              <div
                className="fixed inset-0 capa-modal bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
                onClick={() => setIsDeleteModalOpen(false)}
              >
                <div
                  className="bg-white rounded-2xl w-full max-w-md border border-slate-200 shadow-2xl p-10 transform scale-100 animate-in zoom-in-95 duration-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  {(() => {
                    const config = getUserActionConfig(selectedUser);
                    return (
                  <div className="flex flex-col items-center text-center">
                    <div
                      className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center mb-4",
                        config.tone,
                      )}
                    >
                      {config.icon}
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">
                      {config.title}
                    </h3>
                    <p className="text-sm text-slate-500 mb-6 font-medium">
                      {config.message}
                    </p>
                    <div className="flex gap-3 w-full">
                      <button
                        onClick={() => setIsDeleteModalOpen(false)}
                        className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-2xl transition-colors"
                      >
                        Cancelar
                      </button>
                      <BotonAccion
                        onClick={handleConfirmUserAction}
                        textoCargando="Procesando…"
                        className={cn(
                          "flex-1 px-4 py-2.5 text-sm font-bold text-white rounded-2xl shadow-lg transition-all transform active:scale-95",
                          config.button,
                        )}
                      >
                        {config.confirm}
                      </BotonAccion>
                    </div>
                  </div>
                    )
                  })()}
                </div>
              </div>
            )}

            {/* Detail Modal */}
            {isDetailModalOpen && selectedUser && (
              <DetalleUsuarioModal
                key={selectedUser.id}
                usuario={selectedUser}
                rolNombre={
                  roles.find((r) => r.id === selectedUser.rol)?.nombre ??
                  selectedUser.rol
                }
                rolIcono={roles.find((r) => r.id === selectedUser.rol)?.icon}
                onCerrar={() => setIsDetailModalOpen(false)}
                onEditar={puedeEditar ? () => {
                  setIsDetailModalOpen(false);
                  handleOpenEditModal(selectedUser);
                } : undefined}
                onPermisos={puedeGestionarPermisos ? () => {
                  setIsDetailModalOpen(false);
                  handleOpenPermissionsModal(selectedUser);
                } : undefined}
                onCambiarEstado={puedeEliminar && selectedUser.rol !== RolUsuario.SUPER_ADMINISTRADOR && selectedUser.estado !== EstadoUsuario.ARCHIVADO ? () => {
                  setIsDetailModalOpen(false);
                  handleOpenDeleteModal(selectedUser);
                } : undefined}
              />
            )}
          </>,
          document.body,
        )}
        </>
      )}
    </>
  );
};

export default UserManagementPage;
