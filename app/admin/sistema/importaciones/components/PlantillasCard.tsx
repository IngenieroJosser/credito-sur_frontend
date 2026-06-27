import { useState } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { importacionesService } from '@/services/importaciones-service';
import { toast } from 'sonner';

export const PlantillasCard = () => {
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [loadingInventario, setLoadingInventario] = useState(false);

  const handleDescargarClientes = async () => {
    setLoadingClientes(true);
    try {
      await importacionesService.descargarPlantillaClientesCreditos();
      toast.success('Plantilla de clientes descargada');
    } catch (error) {
      toast.error('Error al descargar la plantilla de clientes');
    } finally {
      setLoadingClientes(false);
    }
  };

  const handleDescargarInventario = async () => {
    setLoadingInventario(true);
    try {
      await importacionesService.descargarPlantillaInventario();
      toast.success('Plantilla de inventario descargada');
    } catch (error) {
      toast.error('Error al descargar la plantilla de inventario');
    } finally {
      setLoadingInventario(false);
    }
  };

  return (
    <section className="group bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
          <FileSpreadsheet className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Plantillas Oficiales</h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">Descarga los formatos Excel requeridos</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-xl border border-slate-100">
          <div>
            <div className="text-sm font-bold text-slate-900">Clientes y Créditos</div>
            <div className="text-xs text-slate-500 mt-0.5 font-medium">Plantilla con reglas de negocio</div>
          </div>
          <button 
            onClick={handleDescargarClientes}
            disabled={loadingClientes}
            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 hover:text-blue-600 rounded-lg text-sm font-bold text-slate-600 shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {loadingClientes ? (
               <div className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-blue-600 animate-spin"></div>
            ) : (
               <Download className="h-4 w-4" />
            )}
            Descargar
          </button>
        </div>

        <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-xl border border-slate-100">
          <div>
            <div className="text-sm font-bold text-slate-900">Inventario y Precios</div>
            <div className="text-xs text-slate-500 mt-0.5 font-medium">Plantilla de catálogo de productos</div>
          </div>
          <button 
            onClick={handleDescargarInventario}
            disabled={loadingInventario}
            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 hover:text-blue-600 rounded-lg text-sm font-bold text-slate-600 shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {loadingInventario ? (
               <div className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-blue-600 animate-spin"></div>
            ) : (
               <Download className="h-4 w-4" />
            )}
            Descargar
          </button>
        </div>
        
        <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
          <p className="text-xs text-blue-800 font-medium leading-relaxed">
            Utiliza únicamente estas plantillas para evitar errores de formato durante la validación.
          </p>
        </div>
      </div>
    </section>
  );
};
