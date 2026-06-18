'use client';

import { useState } from 'react';
import { CreditCard, UserPlus, RefreshCw, DollarSign, Wallet, ReceiptText } from 'lucide-react';
import { toast } from 'sonner';

import FloatingActionMenu, { FabAction } from '@/components/dashboards/shared/FloatingActionMenu';
import CrearCreditoModal from '@/components/dashboards/shared/CrearCreditoModal';
import NuevoClienteModal from '@/components/clientes/NuevoClienteModal';
import { RolUsuario } from '@/types/enums';
import { useCrearCreditoOperativo } from '@/hooks/useCrearCreditoOperativo';

type Props = {
  userId?: string;
  userRol?: RolUsuario | string;
  hideWhenLocalFAB?: boolean;
};

export default function SupervisorGlobalFloatingActions({
  userId,
  userRol,
  hideWhenLocalFAB,
}: Props) {
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [showNewClientModal, setShowNewClientModal] = useState(false);

  const { handleCrearCredito } = useCrearCreditoOperativo({
    userId,
    onSuccess: () => setShowCreditModal(false),
  });

  const rolFinal = String(userRol || '').toUpperCase();
  const isSupervisor = rolFinal === 'SUPERVISOR';

  if (!isSupervisor || hideWhenLocalFAB) return null;

  const requireRutaContext = (accion: string) => {
    toast.info(`Selecciona una ruta en el dashboard para ${accion}`);
  };

  const actions: FabAction[] = [
    {
      label: 'Crear Crédito',
      icon: <CreditCard className="h-5 w-5" />,
      onClick: () => setShowCreditModal(true),
    },
    {
      label: 'Nuevo Cliente',
      icon: <UserPlus className="h-5 w-5" />,
      onClick: () => setShowNewClientModal(true),
    },
    {
      label: 'Registrar abono',
      icon: <RefreshCw className="h-5 w-5" />,
      color: 'orange',
      onClick: () => requireRutaContext('registrar abonos'),
    },
    {
      label: 'Registrar pago',
      icon: <DollarSign className="h-5 w-5" />,
      onClick: () => requireRutaContext('registrar pagos'),
    },
    {
      label: 'Pedir Base',
      icon: <Wallet className="h-5 w-5" />,
      color: 'emerald',
      onClick: () => requireRutaContext('solicitar base'),
    },
    {
      label: 'Gastos',
      icon: <ReceiptText className="h-5 w-5" />,
      color: 'rose',
      onClick: () => requireRutaContext('registrar gastos'),
    },
  ];

  return (
    <>
      <FloatingActionMenu actions={actions} />

      <CrearCreditoModal
        isOpen={showCreditModal}
        onClose={() => setShowCreditModal(false)}
        onConfirm={handleCrearCredito}
      />

      {showNewClientModal && (
        <NuevoClienteModal
          onClose={() => setShowNewClientModal(false)}
          onClienteCreado={() => {
            toast.success('Cliente creado correctamente');
            setShowNewClientModal(false);
          }}
        />
      )}
    </>
  );
}
