import { useState } from 'react';
import { useAuthStore } from '@/shared/store/authStore';
import { supabase } from '@/infrastructure/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Lock, AlertTriangle } from 'lucide-react';

interface CloseSessionProps {
  sessionId: string;
  onClose?: () => void;
}

export function CloseSession({ sessionId, onClose }: CloseSessionProps) {
  const tenantId = useAuthStore((state) => state.tenant_id);
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  if (!tenantId) {
    return (
      <div className="p-6 text-center text-red-500" dir="rtl">
        Tenant not initialized
      </div>
    );
  }

  const [isClosing, setIsClosing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleClose = async () => {
    setIsClosing(true);
    try {
      const { error } = await supabase
        .from('clinic_visit_sessions')
        .update({
          session_status: 'completed',
          session_ended_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId)
        .eq('tenant_id', tenantId)
        .eq('doctor_id', user?.id || '');

      if (error) {
        toast.error(`خطأ في الإغلاق: ${error.message}`);
        return;
      }

      toast.success('تم إغلاق الجلسة بنجاح');
      setShowConfirm(false);
      onClose?.();
      navigate('/doctor');
    } catch (err: any) {
      toast.error(err?.message || 'حدث خطأ');
    } finally {
      setIsClosing(false);
    }
  };

  if (showConfirm) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-xl shadow-lg border-2 border-red-200" dir="rtl">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-8 h-8 text-red-500" />
          <h3 className="text-lg font-bold text-red-600">تأكيد إغلاق الجلسة</h3>
        </div>
        <p className="text-gray-600 mb-6">
          هل أنت متأكد من إغلاق هذه الجلسة؟ لا يمكن التراجع عن هذا الإجراء بعد الإغلاق.
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleClose}
            disabled={isClosing}
            className="flex-1 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 font-semibold flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4" />
            {isClosing ? 'جاري الإغلاق...' : 'نعم، إغلاق الجلسة'}
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            disabled={isClosing}
            className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
          >
            إلغاء
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto" dir="rtl">
      <button
        onClick={() => setShowConfirm(true)}
        className="w-full py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold flex items-center justify-center gap-2"
      >
        <Lock className="w-4 h-4" />
        إغلاق الجلسة
      </button>
    </div>
  );
}