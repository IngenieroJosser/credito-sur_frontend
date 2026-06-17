import { PointerSensor } from '@dnd-kit/core'

/**
 * Sensor personalizado para DnD que ignora elementos interactivos.
 * Evita que el drag se active al hacer click en botones, links, inputs, etc.
 */
export class SafePointerSensor extends PointerSensor {
  static activators = [
    {
      eventName: 'onPointerDown' as const,
      handler: ({ nativeEvent: event }: any) => {
        const target = event.target as HTMLElement | null
        if (!target) return true

        const isInteractive = target.closest(
          'button, a, input, textarea, select, [role="button"], [data-card-action="true"]',
        )

        return !isInteractive
      },
    },
  ]
}
