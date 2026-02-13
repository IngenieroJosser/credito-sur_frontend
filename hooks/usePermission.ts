import { useEffect, useState } from "react";
import { tieneAcceso } from "@/lib/permissions";
import { useAuth } from "./useAuth";

export function usePermission() {
  const { user } = useAuth();
  const [permisos, setPermisos] = useState<string[]>([]);
  const rol: string | null = user?.rol ?? null;

  useEffect(() => {
    const list = Array.isArray(user?.permisos) ? user?.permisos : [];
    setPermisos(list);
  }, [user]);

  const can = (code: string) => {
    if (!user) return false;
    if (rol === "SUPER_ADMINISTRADOR") return true;
    return permisos.includes(code);
  };

  const canForPath = (path: string) => {
    if (!rol) return false;
    return tieneAcceso(rol, path, permisos);
  };

  return { can, canForPath, rol, permisos };
}
