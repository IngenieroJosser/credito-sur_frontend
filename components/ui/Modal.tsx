'use client';

import React, { useEffect, useState, useRef } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  backdropClosable?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  backdropClosable = false
}) => {
  const [mounted, setMounted] = useState(false);
  const mouseDownTargetRef = useRef<EventTarget | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      onMouseDown={backdropClosable ? (e) => { mouseDownTargetRef.current = e.target } : undefined}
      onMouseUp={backdropClosable ? (e) => {
        if (e.target === e.currentTarget && mouseDownTargetRef.current === e.currentTarget) {
          onClose()
        }
        mouseDownTargetRef.current = null
      } : undefined}
    >
      {/* Backdrop: entra con un desvanecido suave */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200 motion-reduce:animate-none"
        aria-hidden="true"
      />

      {/* Modal Content: aparece con escala y un leve ascenso, en vez de surgir
          de golpe. Respeta prefers-reduced-motion. */}
      <div
        className={`relative w-full ${sizeClasses[size]} bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-200 ease-out motion-reduce:animate-none`}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera con el azul de la marca: da identidad al dialogo y separa
            con claridad el titulo del contenido, que antes eran dos bloques de
            texto oscuro sobre el mismo blanco. */}
        <div className="flex shrink-0 items-center justify-between gap-4 rounded-t-2xl bg-gradient-to-r from-primary to-primary-dark px-6 py-4">
          <h3 className="min-w-0 truncate text-lg font-bold text-white">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="shrink-0 rounded-full bg-white/10 p-2 text-white/80 transition-colors hover:bg-white/20 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="shrink-0 px-6 py-4 bg-slate-50 border-t border-slate-200 rounded-b-2xl flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
