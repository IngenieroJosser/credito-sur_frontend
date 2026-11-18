import { useState } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { importacionesService } from '@/services/importaciones-service';
import { toast } from 'sonner';
import { mensajeDeError } from '@/lib/mensaje-de-error'

export const PlantillasCard = () => {
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [loadingInventario, setLoadingInventario] = useState(false);

  const handleDescargarClientes = async () => {
    setLoadingClientes(true);
    try {
      await importacionesService.descargarPlantillaClientesCreditos();
      toast.success('Plantilla de clientes descargada');
    } catch (error) {
      toast.error(mensajeDeError(error, 'Error al descargar la plantilla de clientes'));
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
      toast.error(mensajeDeError(error, 'Error al descargar la plantilla de inventario'));
    } finally {
      setLoadingInventario(false);
    }
  };

  return (
    <section className="group bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
      <div className="flex items-center gap-4 mb-6">
        <div className="shrink-0 p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
          <FileSpreadsheet className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Plantillas Oficiales</h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">Descarga los formatos Excel requeridos</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-xl border border-slate-100">
          <div className="min-w-0">
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
          <div className="min-w-0">
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
        
        {/*
          * Aqui habia un aviso generico —«utiliza unicamente estas plantillas
          * para evitar errores de formato»— que no contaba lo unico que de
          * verdad atasca el estreno: el ORDEN.
          *
          * «Ruta codigo» es obligatoria en la hoja de clientes y «Codigo del
          * articulo» en los creditos de articulo, y los dos desplegables solo
          * se ponen si ya hay rutas o inventario. Quien llena el archivo antes
          * de tener esas dos cosas recibe un error por cada fila.
          *
          * Los numeros no son adorno: es una secuencia, y cada paso necesita
          * el anterior.
          */}
        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
          <p className="text-xs font-bold text-blue-900">En este orden</p>
          <ol className="mt-2 space-y-1.5 text-xs text-blue-800 font-medium leading-relaxed">
            <li>
              <span className="font-bold">1.</span> Los <strong>cobradores</strong>, en
              Usuarios.
            </li>
            <li>
              <span className="font-bold">2.</span> Las <strong>rutas</strong>, con su
              cobrador. Sin ruta nadie sale a cobrar, y la columna «Ruta código» de la
              plantilla de clientes es obligatoria.
            </li>
            <li>
              <span className="font-bold">3.</span> El <strong>inventario</strong>, solo
              si va a cargar créditos de artículo.
            </li>
            <li>
              <span className="font-bold">4.</span> Los{' '}
              <strong>clientes y sus créditos</strong>. Descargue la plantilla después de
              los pasos anteriores: trae los códigos de sus rutas y artículos en
              desplegables.
            </li>
          </ol>
        </div>
      </div>
    </section>
  );
};
