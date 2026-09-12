'use client'

import { useState } from 'react'
import { Bell, Download, Share, SquarePlus, WifiOff, Zap, type LucideIcon } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { lanzarInstalacion } from '@/lib/pwa/instalacion'
import { descartarAviso } from '@/lib/pwa/avisos'

/** Días sin volver a ofrecer la instalación si la persona dice que no. */
const DIAS_DESCARTE = 7

interface InstalarAppModalProps {
  abierto: boolean
  /** `nativo`: Chrome/Edge lanzan su diálogo. `ios`: se muestran instrucciones. */
  modo: 'nativo' | 'ios'
  onCerrar: () => void
}

function Beneficio({ icono: Icono, texto }: { icono: LucideIcon; texto: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 shrink-0 rounded-lg bg-primary/10 p-1.5 text-primary">
        <Icono className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="text-sm leading-relaxed text-slate-700">{texto}</span>
    </li>
  )
}

export default function InstalarAppModal({ abierto, modo, onCerrar }: InstalarAppModalProps) {
  const [instalando, setInstalando] = useState(false)

  const cerrar = () => {
    descartarAviso('instalar', DIAS_DESCARTE)
    onCerrar()
  }

  const instalar = async () => {
    setInstalando(true)
    try {
      const resultado = await lanzarInstalacion()
      // Decir que no en el diálogo del sistema cuenta igual que "Ahora no".
      if (resultado !== 'accepted') descartarAviso('instalar', DIAS_DESCARTE)
      onCerrar()
    } finally {
      setInstalando(false)
    }
  }

  const footer =
    modo === 'nativo' ? (
      <>
        <button
          type="button"
          onClick={cerrar}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          Ahora no
        </button>
        <button
          type="button"
          onClick={instalar}
          disabled={instalando}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primary-dark disabled:opacity-60"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          {instalando ? 'Instalando…' : 'Instalar'}
        </button>
      </>
    ) : (
      <button
        type="button"
        onClick={cerrar}
        className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primary-dark"
      >
        Entendido
      </button>
    )

  return (
    <Modal isOpen={abierto} onClose={cerrar} title="Instala Credisur" size="sm" footer={footer}>
      <div className="flex items-center gap-4">
        <img
          src="/icon-192.png"
          alt=""
          width={64}
          height={64}
          className="h-16 w-16 shrink-0 rounded-2xl border border-slate-200 bg-white"
        />
        <p className="text-sm leading-relaxed text-slate-600">
          Tenla en la pantalla de inicio y ábrela como una aplicación, sin buscarla en el navegador.
        </p>
      </div>

      <ul className="mt-5 space-y-3">
        <Beneficio icono={Zap} texto="Abre directo y a pantalla completa." />
        <Beneficio icono={WifiOff} texto="Sigue registrando cobros sin conexión y los sincroniza cuando vuelve la señal." />
        <Beneficio icono={Bell} texto="Recibe avisos de pagos, mora y aprobaciones." />
      </ul>

      {modo === 'ios' && (
        <ol className="mt-5 space-y-2.5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <li className="flex flex-wrap items-center gap-1.5">
            <span className="font-bold text-slate-900">1.</span> En Safari, toca
            <Share className="h-4 w-4 text-primary" aria-hidden="true" />
            <strong>Compartir</strong>.
          </li>
          <li className="flex flex-wrap items-center gap-1.5">
            <span className="font-bold text-slate-900">2.</span> Elige
            <SquarePlus className="h-4 w-4 text-primary" aria-hidden="true" />
            <strong>Agregar a inicio</strong>.
          </li>
          <li className="flex flex-wrap items-center gap-1.5">
            <span className="font-bold text-slate-900">3.</span> Abre Credisur desde el ícono nuevo para recibir notificaciones.
          </li>
        </ol>
      )}
    </Modal>
  )
}
