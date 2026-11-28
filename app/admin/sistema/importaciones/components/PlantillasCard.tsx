import { useState } from 'react';
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import { importacionesService } from '@/services/importaciones-service';
import { toast } from 'sonner';
import { mensajeDeError } from '@/lib/mensaje-de-error'

export const PlantillasCard = () => {
  const [descargando, setDescargando] = useState(false);

  const descargar = async () => {
    setDescargando(true);
    try {
      await importacionesService.descargarPlantillaIntegral();
      toast.success('Plantilla descargada');
    } catch (error) {
      toast.error(mensajeDeError(error, 'No se pudo descargar la plantilla'));
    } finally {
      setDescargando(false);
    }
  };

  return (
    <section className="group bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
      <div className="flex items-center gap-4 mb-6">
        <div className="shrink-0 p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
          <FileSpreadsheet className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Plantilla oficial</h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">Un solo Excel con artículos, clientes y créditos</p>
        </div>
      </div>

      <div className="space-y-4">
        {/*
          * Antes había una tarjeta por módulo (integral, clientes y créditos,
          * inventario). Se quitaron: el trabajo real se hace con el libro
          * integral, y ofrecer tres formatos solo servía para que alguien
          * llenara el que no era.
          */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-4">
          <div className="min-w-0">
            <div className="text-sm font-bold text-slate-900">Plantilla integral</div>
            <div className="mt-0.5 text-xs font-medium text-slate-500">Artículos, clientes y créditos en un solo Excel</div>
          </div>
          <button
            type="button"
            aria-label="Descargar plantilla integral"
            onClick={descargar}
            disabled={descargando}
            className="flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-blue-600 disabled:opacity-50"
          >
            {descargando
              ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              : <Download className="h-4 w-4" aria-hidden="true" />}
            {descargando ? 'Descargando…' : 'Descargar'}
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
