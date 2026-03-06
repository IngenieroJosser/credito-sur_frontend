"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle, XCircle, Eye, AlertCircle, RefreshCw } from "lucide-react";
import { apiClient as api } from "@/lib/api/apiClient";
import { toast } from "sonner";

interface SyncConflict {
  id: string;
  entidad: string;
  operacion: string;
  estadoResolucion: "PENDIENTE" | "RESUELTO" | "DESCARTADO";
  errorMotivo: string;
  statusCode: number;
  creadoEn: string;
  datos: any;
  creadoPor: { nombres: string; apellidos: string } | null;
}

export default function ListaConflictos() {
  const [conflictos, setConflictos] = useState<SyncConflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConflict, setSelectedConflict] = useState<SyncConflict | null>(null);

  const loadConflictos = async () => {
    try {
      setLoading(true);
      const res = await api.get("/sync-conflicts");
      setConflictos(res.data);
    } catch (error) {
      console.error("Error cargando conflictos", error);
      toast.error("Error vinculando con el servidor de conflictos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConflictos();
  }, []);

  const handleResolver = async (id: string, accion: "RESOLVER" | "DESCARTAR") => {
    try {
      const toastId = toast.loading(accion === "RESOLVER" ? "Reprocesando petición..." : "Descartando registro...");
      await api.patch(`/sync-conflicts/${id}/resolve`, { accion });
      toast.success(`Conflicto ${accion === "RESOLVER" ? "resuelto y reprocesado" : "descartado"} exitosamente`, { id: toastId });
      setSelectedConflict(null);
      loadConflictos();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Hubo un error al aplicar la acción");
    }
  };

  const getMethodColor = (method: string) => {
    switch(method) {
      case "POST": return "bg-green-100 text-green-700 border-green-200";
      case "PUT":
      case "PATCH": return "bg-blue-100 text-blue-700 border-blue-200";
      case "DELETE": return "bg-red-100 text-red-700 border-red-200";
      default: return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
            Centro de Resolución de Conflictos
          </h1>
          <p className="text-slate-500 mt-1 font-medium">
            Gestión de fallos de sincronización de la aplicación offline
          </p>
        </div>
        <button
          onClick={loadConflictos}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 flex flex-col items-center">
            <RefreshCw className="w-8 h-8 animate-spin mb-4 text-brand-500" />
            <p>Cargando conflictos...</p>
          </div>
        ) : conflictos.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">No hay conflictos pendientes</h3>
            <p className="text-slate-500 mt-1">Todos los dispositivos están sincronizados correctamente.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-xs">
                <tr>
                  <th className="px-6 py-4">Fecha / Hora</th>
                  <th className="px-6 py-4">Cobrador</th>
                  <th className="px-6 py-4">Operación</th>
                  <th className="px-6 py-4">Entidad</th>
                  <th className="px-6 py-4">Error / Conflicto</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {conflictos.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-slate-700">
                      {new Date(c.creadoEn).toLocaleString("es-ES")}
                    </td>
                    <td className="px-6 py-4">
                      {c.creadoPor ? `${c.creadoPor.nombres} ${c.creadoPor.apellidos}` : "Desconocido"}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${getMethodColor(c.operacion)}`}>
                        {c.operacion}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-700 capitalize">
                      {c.entidad}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 max-w-xs truncate text-red-600">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span className="truncate" title={c.errorMotivo}>{c.errorMotivo}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {c.estadoResolucion === "PENDIENTE" && (
                        <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
                          Pendiente
                        </span>
                      )}
                      {c.estadoResolucion === "RESUELTO" && (
                        <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                          Resuelto
                        </span>
                      )}
                      {c.estadoResolucion === "DESCARTADO" && (
                        <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          Descartado
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedConflict(c)}
                        className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                        title="Ver detalles y resolver"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Resolución */}
      {selectedConflict && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Detalles del Conflicto
              </h2>
              <button
                onClick={() => setSelectedConflict(null)}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Cobrador</p>
                  <p className="font-bold text-slate-900">
                    {selectedConflict.creadoPor ? `${selectedConflict.creadoPor.nombres} ${selectedConflict.creadoPor.apellidos}` : "Desconocido"}
                  </p>
                </div>
                <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                  <p className="text-xs font-bold text-red-400 uppercase tracking-wider mb-1">Motivo del Fallo</p>
                  <p className="font-bold text-red-700 text-sm">
                    {selectedConflict.errorMotivo}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  Payload (Datos atrapados)
                </h3>
                <div className="bg-slate-900 rounded-xl p-4 overflow-x-auto">
                  <pre className="text-xs font-mono text-emerald-400">
                    {JSON.stringify(selectedConflict.datos, null, 2)}
                  </pre>
                </div>
                <p className="text-xs text-slate-500 mt-2 font-medium bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="font-bold">Info:</span> Cuando presiones "Resolver y Aplicar", el sistema intentará forzar la aplicación de estos datos en el servidor, tal como el cobrador intentó hacerlo en la calle. Esto es seguro y evita que transcribas a mano.
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
               <div className="text-sm font-bold text-slate-500">
                  {selectedConflict.estadoResolucion !== "PENDIENTE" && (
                     <span>Estado actual: <span className={selectedConflict.estadoResolucion === "RESUELTO" ? "text-green-600" : "text-slate-700"}>{selectedConflict.estadoResolucion}</span></span>
                  )}
               </div>
              {selectedConflict.estadoResolucion === "PENDIENTE" && (
                <div className="flex gap-3">
                  <button
                    onClick={() => handleResolver(selectedConflict.id, "DESCARTAR")}
                    className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 hover:text-red-600 transition-colors"
                  >
                    Descartar Registro
                  </button>
                  <button
                    onClick={() => handleResolver(selectedConflict.id, "RESOLVER")}
                    className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold shadow-sm transition-colors flex items-center gap-2"
                  >
                    Resolver y Aplicar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
