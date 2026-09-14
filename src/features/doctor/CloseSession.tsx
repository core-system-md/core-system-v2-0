import { useState } from 'react';
import { useAuthStore } from '@/shared/store/authStore';
import { supabase } from '@/infrastructure/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Lock, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PermissionGuard } from '@/core/permissions/PermissionGuard';

interface CloseSessionProps {
  sessionId: string;
  onClose?: () => void;
}

export function CloseSession({ sessionId, onClose }: CloseSessionProps) {
  const { t } = useTranslation('doctor');
  const [isClosing, setIsClosing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const navigate = useNavigate();

  const tenantId = useAuthStore((state) => state.tenant_id);
  const user = useAuthStore((state) => state.user);

  if (!tenantId) {
    return (
      <div className="p-6 text-center text-red-500">
        {t('tenantNotInitialized')}
      </div>
    );
  }

  const handleClose = async () => {
    if (!user?.role || !['doctor', 'clinic_admin', 'super_admin'].includes(user.role)) {
      toast.error(t('closePermissionDenied'));
      return;
    }

    setIsClosing(true);
    try {
      let updateQuery = supabase
        .from('clinic_visit_sessions')
        .update({
          session_status: 'completed',
          session_ended_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null);

      if (user.role === 'doctor') {
        updateQuery = updateQuery.eq('doctor_id', user.id);
      }

      const { error } = await updateQuery;

      if (error) {
        toast.error(t('closeError', { message: error.message }));
        return;
      }

      toast.success(t('closedSuccessfully'));
      setShowConfirm(false);
      onClose?.();
      navigate('/doctor');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('unexpectedError'));
    } finally {
      setIsClosing(false);
    }
  };

  return (
    <PermissionGuard required="edit_sessions">
      {showConfirm ? (
        <div className="max-w-md mx-auto p-6 bg-white rounded-xl shadow-lg border-2 border-red-200">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
            <h3 className="text-lg font-bold text-red-600">{t('confirmCloseTitle')}</h3>
          </div>
          <p className="text-gray-600 mb-6">
            {t('confirmCloseMessage')}
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              disabled={isClosing}
              className="flex-1 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 font-semibold flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              {isClosing ? t('closeInProgress') : t('confirmClose')}
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              disabled={isClosing}
              className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      ) : (
        <div className="max-w-md mx-auto">
          <button
            onClick={() => setShowConfirm(true)}
            className="w-full py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4" />
            {t('closeSession')}
          </button>
        </div>
      )}
    </PermissionGuard>
  );
}