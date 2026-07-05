import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/shared/store/authStore';
import { supabase } from '@/infrastructure/supabase/client';
import { toast } from 'sonner';
import { Stethoscope, ClipboardCheck, AlertCircle } from 'lucide-react';

interface DecisionCardProps {
  sessionId: string;
  patientId: string;
  onDecisionMade?: () => void;
}

interface Decision {
  id: string;
  type: 'medication' | 'procedure' | 'referral' | 'follow_up' | 'other';
  description: string;
  notes: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export function DecisionCard({ sessionId, patientId, onDecisionMade }: DecisionCardProps) {
  // ALL HOOKS FIRST — before any conditional logic
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newDecision, setNewDecision] = useState<Partial<Decision>>({
    type: 'medication',
    priority: 'medium',
    description: '',
    notes: ''
  });

  // Auth store hooks
  const tenantId = useAuthStore((state) => state.tenant_id);
  const user = useAuthStore((state) => state.user);

  // GUARD AFTER ALL HOOKS
  if (!tenantId) {
    return (
      <div className="p-6 text-center text-red-500" dir="rtl">
        <AlertCircle className="w-8 h-8 mx-auto mb-2" />
        <p>Tenant not initialized</p>
      </div>
    );
  }

  // Load existing decisions
  useEffect(() => {
    const loadDecisions = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('clinical_decisions')
          .select('*')
          .eq('session_id', sessionId)
          .eq('tenant_id', tenantId)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false });

        if (error) {
          toast.error(`خطأ في تحميل القرارات: ${error.message}`);
          return;
        }

        if (data) {
          setDecisions(data.map(d => ({
            id: d.id,
            type: d.type,
            description: d.description,
            notes: d.notes,
            priority: d.priority
          })));
        }
      } catch (err: any) {
        toast.error(err?.message || 'حدث خطأ');
      } finally {
        setIsLoading(false);
      }
    };

    if (sessionId && tenantId) {
      loadDecisions();
    }
  }, [sessionId, tenantId]);

  const handleAddDecision = useCallback(() => {
    if (!newDecision.description?.trim()) {
      toast.error('يرجى إدخال وصف القرار');
      return;
    }

    const decision: Decision = {
      id: crypto.randomUUID(),
      type: newDecision.type as Decision['type'],
      description: newDecision.description || '',
      notes: newDecision.notes || '',
      priority: newDecision.priority as Decision['priority']
    };

    setDecisions(prev => [decision, ...prev]);
    setNewDecision({ type: 'medication', priority: 'medium', description: '', notes: '' });
    setShowForm(false);
  }, [newDecision]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Delete existing decisions
      await supabase
        .from('clinical_decisions')
        .delete()
        .eq('session_id', sessionId)
        .eq('tenant_id', tenantId);

      // Insert new decisions
      if (decisions.length > 0) {
        const { error } = await supabase
          .from('clinical_decisions')
          .insert(decisions.map(d => ({
            session_id: sessionId,
            patient_id: patientId,
            tenant_id: tenantId,
            doctor_id: user?.id,
            type: d.type,
            description: d.description,
            notes: d.notes,
            priority: d.priority,
            is_deleted: false
          })));

        if (error) {
          toast.error(`خطأ في الحفظ: ${error.message}`);
          return;
        }
      }

      toast.success('تم حفظ القرارات بنجاح');
      onDecisionMade?.();
    } catch (err: any) {
      toast.error(err?.message || 'حدث خطأ');
    } finally {
      setIsSaving(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      default: return 'bg-green-100 text-green-700 border-green-300';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'medication': return 'دواء';
      case 'procedure': return 'إجراء';
      case 'referral': return 'إحالة';
      case 'follow_up': return 'متابعة';
      default: return 'آخر';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 text-center" dir="rtl">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-600">جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-lg" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <Stethoscope className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-bold text-[#1B2A4A]">قرارات الطبيب</h2>
      </div>

      {decisions.length === 0 && !showForm && (
        <div className="text-center py-8 text-gray-500">
          <ClipboardCheck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>لا توجد قرارات مسجلة</p>
        </div>
      )}

      <div className="space-y-3 mb-6">
        {decisions.map((decision) => (
          <div key={decision.id} className={`p-4 rounded-lg border ${getPriorityColor(decision.priority)}`}>
            <div className="flex justify-between items-start mb-2">
              <span className="font-semibold">{getTypeLabel(decision.type)}</span>
              <span className="text-sm px-2 py-1 rounded-full bg-white/50">{decision.priority}</span>
            </div>
            <p className="text-gray-800 mb-2">{decision.description}</p>
            {decision.notes && (
              <p className="text-sm text-gray-600">{decision.notes}</p>
            )}
          </div>
        ))}
      </div>

      {showForm && (
        <div className="p-4 bg-gray-50 rounded-lg mb-4 space-y-3">
          <div className="flex gap-3">
            <select
              value={newDecision.type}
              onChange={(e) => setNewDecision(prev => ({ ...prev, type: e.target.value as Decision['type'] }))}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="medication">دواء</option>
              <option value="procedure">إجراء</option>
              <option value="referral">إحالة</option>
              <option value="follow_up">متابعة</option>
              <option value="other">آخر</option>
            </select>
            <select
              value={newDecision.priority}
              onChange={(e) => setNewDecision(prev => ({ ...prev, priority: e.target.value as Decision['priority'] }))}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="low">منخفض</option>
              <option value="medium">متوسط</option>
              <option value="high">عالي</option>
              <option value="urgent">عاجل</option>
            </select>
          </div>
          <input
            type="text"
            value={newDecision.description}
            onChange={(e) => setNewDecision(prev => ({ ...prev, description: e.target.value }))}
            placeholder="وصف القرار الطبي"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <textarea
            value={newDecision.notes}
            onChange={(e) => setNewDecision(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="ملاحظات إضافية"
            rows={2}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handleAddDecision}
              className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              إضافة
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex-1 py-3 border-2 border-dashed border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
          >
            + إضافة قرار جديد
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-semibold"
        >
          {isSaving ? 'جاري الحفظ...' : 'حفظ القرارات'}
        </button>
      </div>
    </div>
  );
}