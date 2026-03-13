'use client'

import React, { useState, useEffect } from 'react'
import { Portal, StaticVisitaItem, SortableVisita } from '@/components/dashboards/shared/CobradorElements'
import { X, GripVertical, CheckCircle2 } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { VisitaRuta, EstadoVisita } from '@/lib/types/cobranza'
import { formatCurrency } from '@/lib/utils'

interface RutaProvisionalModalProps {
  visitas: VisitaRuta[]
  initialOrder: string[]
  onSave: (newOrder: string[]) => void
  onClose: () => void
  getEstadoClasses: (e: EstadoVisita) => string
}

export default function RutaProvisionalModal({
  visitas,
  initialOrder,
  onSave,
  onClose,
  getEstadoClasses
}: RutaProvisionalModalProps) {
  const [orden, setOrden] = useState<string[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    // Only include IDs that exist in the passed visitas array for today
    const validIds = visitas.map(v => v.id)
    const filteredOrder = initialOrder.filter(id => validIds.includes(id))
    
    // Add any missing IDs that might be in visitas but not in initialOrder yet
    const missingIds = validIds.filter(id => !filteredOrder.includes(id))
    setOrden([...filteredOrder, ...missingIds])
  }, [initialOrder, visitas])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || active.id === over.id) return

    const oldIndex = orden.indexOf(active.id as string)
    const newIndex = orden.indexOf(over.id as string)
    
    setOrden(arrayMove(orden, oldIndex, newIndex))
  }

  const activeVisita = activeId ? visitas.find(v => v.id === activeId) : null

  return (
    <Portal>
      <div className="fixed inset-0 z-[2147483600] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
            <div>
              <h3 className="font-bold text-lg text-slate-900">Ruta Provisional</h3>
              <p className="text-xs text-slate-500 mt-1 flex flex-col">
                <span>Arrastre los clientes para definir el orden sugerido de hoy.</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors shrink-0"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {/* Main List Area */}
          <div className="p-6 overflow-y-auto flex-1 bg-slate-50/30">
            {visitas.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <p className="font-medium">No hay clientes programados para hoy</p>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={orden} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3">
                    {orden.map((id) => {
                      const visita = visitas.find(v => v.id === id)
                      if (!visita) return null
                      return (
                        <SortableVisita
                          key={visita.id}
                          visita={visita}
                          onSelect={() => {}}
                          onVerCliente={() => {}}
                          getEstadoClasses={getEstadoClasses}
                        />
                      )
                    })}
                  </div>
                </SortableContext>

                <DragOverlay>
                  {activeVisita ? (
                    <div className="w-full rounded-2xl border border-slate-900 bg-white shadow-xl px-4 py-3 opacity-90 rotate-2 cursor-grabbing pointer-events-none">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 flex items-center">
                          <GripVertical className="h-5 w-5 text-slate-400" />
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="text-sm font-bold text-slate-900">
                            {activeVisita.cliente}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-6 border-t border-slate-100 bg-white shrink-0 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => onSave(orden)}
              className="flex-1 px-4 py-3 text-sm font-bold text-white bg-[#08557f] hover:bg-[#07476a] rounded-xl transition-colors shadow-md flex justify-center items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Guardar Orden
            </button>
          </div>
        </div>
      </div>
    </Portal>
  )
}
