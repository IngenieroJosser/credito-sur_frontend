'use client'

import { normalizarCodigoRuta } from '@/lib/rutas/codigo-ruta'

/**
 * El campo del código de ruta, con la vista previa de cómo va a quedar.
 *
 * El código no se guarda tal cual se escribe: el servidor lo normaliza (quita
 * acentos, pasa a mayúsculas y antepone `RT-`), así que "Centro" termina como
 * "RT-CENTRO". Sin ver eso antes de guardar, la persona cree que se equivocó.
 *
 * Existe como componente porque hay dos pantallas para crear rutas, la del
 * administrador y la del coordinador, y son casi la misma. Ya habían derivado:
 * la vista previa estaba solo en la del administrador, así que el coordinador
 * escribía el código a ciegas. Teniéndolo aquí, lo que se cambie del código de
 * ruta se cambia una vez.
 */

interface CampoCodigoRutaProps {
  value: string
  onChange: (evento: React.ChangeEvent<HTMLInputElement>) => void
  /** El `name` del input; las dos pantallas lo leen de su formulario. */
  name?: string
  required?: boolean
}

export default function CampoCodigoRuta({
  value,
  onChange,
  name = 'codigo',
  required = true,
}: CampoCodigoRutaProps) {
  const normalizado = value.trim() ? normalizarCodigoRuta(value) : ''

  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-slate-700" htmlFor={name}>
        Código Identificador
        <span className="ml-1 text-red-500" aria-label="obligatorio">
          *
        </span>
      </label>
      <input
        id={name}
        type="text"
        name={name}
        value={value}
        onChange={onChange}
        placeholder="Ej: RT-CEN-01"
        className="w-full px-4 py-2.5 rounded-xl border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium text-slate-900"
        required={required}
      />
      {normalizado ? (
        <p className="text-xs font-medium text-slate-500">
          Se guardará como{' '}
          <span className="font-bold text-slate-700">{normalizado}</span>
        </p>
      ) : null}
    </div>
  )
}
