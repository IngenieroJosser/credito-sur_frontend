'use client';

import { useState } from 'react';
import { CreditCard, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

import FloatingActionMenu, { FabAction } from '@/components/dashboards/shared/FloatingActionMenu';
import CrearCreditoModal from '@/components/dashboards/shared/CrearCreditoModal';
import NuevoClienteModal from '@/components/clientes/NuevoClienteModal';
import { useAuth } from '@/hooks/useAuth';
import { useCrearCreditoOperativo } from '@/hooks/useCrearCreditoOperativo';

export default function CobradorFloatingActions() {
  const { user } = useAuth();

  const [showCreditModal, setShowCreditModal] = useState(false);
  const [showNewClientModal, setShowNewClientModal] = useState(false);

  const { handleCrearCredito } = useCrearCreditoOperativo({
    userId: user?.id,
    cobradorId: user?.id,
    onSuccess: () => setShowCreditModal(false),
  });

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
