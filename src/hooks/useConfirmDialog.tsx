// src/hooks/useConfirmDialog.tsx
import { useState, useCallback, useMemo } from 'react';
import AccessibleModal from '../components/common/AccessibleModal';

interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'info' | 'warning' | 'error' | 'success';
}

interface UseConfirmDialogReturn {
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
  ConfirmDialog: React.FC;
}

/**
 * Hook for accessible confirmation dialogs
 *
 * Replaces native confirm() with WCAG 2.1 compliant modals.
 *
 * Usage:
 * ```tsx
 * const { confirm, ConfirmDialog } = useConfirmDialog();
 *
 * const handleDelete = async () => {
 *   const confirmed = await confirm({
 *     title: '¿Eliminar producto?',
 *     message: 'Esta acción no se puede deshacer.',
 *     type: 'warning'
 *   });
 *   if (confirmed) {
 *     // proceed with deletion
 *   }
 * };
 *
 * return (
 *   <>
 *     <button onClick={handleDelete}>Eliminar</button>
 *     <ConfirmDialog />
 *   </>
 * );
 * ```
 */
export function useConfirmDialog(): UseConfirmDialogReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmDialogOptions>({
    title: '',
    message: '',
  });
  const [resolveRef, setResolveRef] = useState<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmDialogOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setOptions(opts);
      setResolveRef(() => resolve);
      setIsOpen(true);
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setIsOpen(false);
    if (resolveRef) {
      resolveRef(true);
      setResolveRef(null);
    }
  }, [resolveRef]);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    if (resolveRef) {
      resolveRef(false);
      setResolveRef(null);
    }
  }, [resolveRef]);

  const ConfirmDialog = useMemo(() => {
    const Dialog: React.FC = () => (
      <AccessibleModal
        isOpen={isOpen}
        onClose={handleCancel}
        title={options.title}
        type={options.type || 'warning'}
        confirmText={options.confirmText || 'Confirmar'}
        cancelText={options.cancelText || 'Cancelar'}
        onConfirm={handleConfirm}
      >
        <p>{options.message}</p>
      </AccessibleModal>
    );
    return Dialog;
  }, [isOpen, options, handleConfirm, handleCancel]);

  return { confirm, ConfirmDialog };
}

export default useConfirmDialog;
