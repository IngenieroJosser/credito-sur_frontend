'use client'

import { useState } from 'react'
import { Download, Share, SquarePlus } from 'lucide-react'
import AvisoFlotante, { BOTON_AVISO_PRINCIPAL, BOTON_AVISO_SECUNDARIO } from '@/components/pwa/AvisoFlotante'
import { lanzarInstalacion } from '@/lib/pwa/instalacion'
import { descartarAviso } from '@/lib/pwa/avisos'

/** Días sin volver a ofrecer la instalación si la persona dice que no. */
const DIAS_DESCARTE = 7

interface InstalarAppAvisoProps {
  abierto: boolean
  /** `nativo`: Chrome/Edge instalan con un toque. `ios`: solo se puede indicar cómo. */
  modo: 'nativo' | 'ios'
  onCerrar: () => void
}

export default function InstalarAppAviso({ abierto, modo, onCerrar }: InstalarAppAvisoProps) {
  const [instalando, setInstalando] = useState(false)

  if (!abierto) return null

  const cerrar = () => {
    descartarAviso('instalar', DIAS_DESCARTE)
    onCerrar()
  }

  const instalar = async () => {
    setInstalando(true)
    try {
      // El diálogo de instalación se abre en este mismo toque, sin pasos
      // intermedios: el navegador solo lo permite como respuesta directa a un
      // gesto. Chrome muestra igual su confirmación final; esa no se puede omitir.
      const resultado = await lanzarInstalacion()
      if (resultado !== 'accepted') descartarAviso('instalar', DIAS_DESCARTE)
      onCerrar()
    } finally {
      setInstalando(false)
    }
  }

  const icono = (
    <img src="/icon-192.png" alt="" width={40} height={40} className="h-10 w-10 rounded-xl border border-slate-200 bg-white" />
  )

  if (modo === 'ios') {
    return (
      <AvisoFlotante icono={icono} titulo="Instala Credisur" onCerrar={cerrar}>
        Toca <Share className="inline h-3.5 w-3.5 align-[-2px] text-primary" aria-hidden="true" /> <strong>Compartir</strong> y
        luego <SquarePlus className="inline h-3.5 w-3.5 align-[-2px] text-primary" aria-hidden="true" />{' '}
        <strong>Agregar a inicio</strong>.
      </AvisoFlotante>
    )
  }

  return (
    <AvisoFlotante
      icono={icono}
      titulo="Instala Credisur"
      onCerrar={cerrar}
      acciones={
        <>
          <button type="button" onClick={instalar} disabled={instalando} className={BOTON_AVISO_PRINCIPAL}>
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            {instalando ? 'Instalando…' : 'Instalar'}
          </button>
          <button type="button" onClick={cerrar} disabled={instalando} className={BOTON_AVISO_SECUNDARIO}>
            Ahora no
          </button>
        </>
      }
    >
      Ábrela desde tu pantalla de inicio, también sin conexión.
    </AvisoFlotante>
  )
}
