'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Guarda lo escrito en un formulario para que una recarga no se lo lleve.
 *
 * Por qué hace falta: en el formulario de clientes, medido, recargar a mitad de
 * llenarlo lo dejaba en blanco. Son cinco secciones —datos personales,
 * contacto, fotos, riesgo, asignación— y la recarga no es un accidente raro: el
 * móvil gira, el navegador descarta la pestaña por memoria, la app se
 * actualiza, o alguien le da a recargar «porque se quedó pegado». Volver a
 * escribir la cédula y la dirección de alguien que está esperando de pie es
 * justo el tipo de desgaste que hace que la gente deje de usar el sistema.
 *
 * ── Decisiones, y por qué ───────────────────────────────────────────────────
 *
 * **Se guarda en el navegador de quien escribe, no en el servidor.** Es un
 * borrador a medio escribir, no un dato del negocio: mandarlo al servidor
 * crearía registros a medias que alguien tendría que limpiar. Vive en
 * `localStorage`, que sobrevive a la recarga y al cierre de la pestaña.
 *
 * **Solo se restaura si hay algo escrito de verdad.** Si el borrador guardado
 * es igual al formulario vacío no se toca nada: así, abrir el formulario
 * después de haberlo abandonado vacío no muestra un aviso de «recuperado» sin
 * motivo.
 *
 * **Se borra al guardar con éxito.** Eso lo hace la pantalla llamando a
 * `limpiar()`. Sin eso, el siguiente cliente aparecería con los datos del
 * anterior ya puestos, que es peor que perder el borrador: se registra a una
 * persona con la dirección de otra.
 *
 * **Cada lectura y escritura va en try/catch.** En modo privado, con las
 * cookies bloqueadas o con el almacenamiento lleno, `localStorage` lanza. Un
 * formulario no puede dejar de funcionar porque no se pueda guardar un
 * borrador: si falla, se comporta como antes y nadie se entera.
 *
 * **No se guardan archivos.** Las fotos y los documentos son `File`, que no
 * cabe en `localStorage`. Se dice aquí porque la pantalla tiene que saber que
 * esos sí se pierden; intentar guardarlos en base64 llenaría la cuota del
 * navegador con una sola foto.
 */

/** Cuánto vive un borrador antes de considerarse basura: un día. */
const VIDA_DEL_BORRADOR_MS = 24 * 60 * 60 * 1000

type BorradorGuardado<T> = { datos: T; guardadoEn: number }

export interface Borrador<T> {
  /** Lo que se recuperó, o `null` si no había nada que recuperar. */
  recuperado: T | null
  /** Borra el borrador. Se llama al guardar con éxito, o al descartarlo. */
  limpiar: () => void
}

/**
 * @param clave  Identifica el formulario. Distinta por pantalla, o el borrador
 *               de clientes aparecería al crear un crédito.
 * @param datos  El estado actual del formulario; se guarda cuando cambia.
 * @param vacio  Cómo es el formulario sin tocar, para no restaurar la nada.
 */
export function useBorradorDeFormulario<T extends object>(
  clave: string,
  datos: T,
  vacio: T,
): Borrador<T> {
  const nombre = `borrador:${clave}`
  const [recuperado, setRecuperado] = useState<T | null>(null)
  // Para no volver a leer en cada render, y para no guardar antes de haber
  // leído: si se guardara primero, el estado inicial vacío pisaría el borrador
  // justo antes de poder recuperarlo.
  const yaLeido = useRef(false)

  useEffect(() => {
    if (yaLeido.current) return
    yaLeido.current = true

    try {
      const crudo = localStorage.getItem(nombre)
      if (!crudo) return

      const guardado = JSON.parse(crudo) as BorradorGuardado<T>
      if (!guardado?.datos) return

      if (Date.now() - (guardado.guardadoEn ?? 0) > VIDA_DEL_BORRADOR_MS) {
        localStorage.removeItem(nombre)
        return
      }

      // Nada escrito: no hay nada que recuperar ni que anunciar.
      if (JSON.stringify(guardado.datos) === JSON.stringify(vacio)) {
        localStorage.removeItem(nombre)
        return
      }

      setRecuperado(guardado.datos)
    } catch {
      // Almacenamiento bloqueado, o un borrador de una versión vieja del
      // formulario que ya no se puede leer. En los dos casos: como si no
      // hubiera borrador.
    }
    // Sin dependencias a propósito: esto lee el borrador UNA vez, al abrir la
    // pantalla. Con `datos` entre las dependencias volvería a leer en cada
    // tecla y pisaría lo que se está escribiendo con lo guardado.
  }, [nombre, vacio])

  useEffect(() => {
    if (!yaLeido.current) return

    try {
      // El formulario vacío no se guarda: dejaría un borrador inútil que luego
      // hay que descartar, y pisaría uno bueno si la pantalla se reinicia.
      if (JSON.stringify(datos) === JSON.stringify(vacio)) {
        localStorage.removeItem(nombre)
        return
      }
      const guardado: BorradorGuardado<T> = {
        datos,
        guardadoEn: Date.now(),
      }
      localStorage.setItem(nombre, JSON.stringify(guardado))
    } catch {
      // Cuota llena o almacenamiento bloqueado: el formulario sigue
      // funcionando, solo sin red de seguridad.
    }
  }, [datos, nombre, vacio])

  const limpiar = () => {
    try {
      localStorage.removeItem(nombre)
    } catch {
      /* da igual: lo que importa es no dejar el borrador al siguiente */
    }
    setRecuperado(null)
  }

  return { recuperado, limpiar }
}
