import { useEffect, useState } from 'react';
import { useTenantStore } from '@/shared/store/tenantStore';
import { supabase } from '@/infrastructure/supabase/client';
import { subunitsToDisplay } from '@/shared/utils/currency';
import { UserCheck, Stethoscope, Clock, DollarSign } from 'lucide-react';

interface StaffMetric {
  doctor_id: string;
  doctor_name: string;
  total_sessions: number;
  completed_sessions: number;
  avg_session_duration: number;
  total_revenue_subunits: number;
  avg_core_score: number;
  patient_satisfaction: number;
}

export default function StaffPerformance() {
  const { tenantId } = useTenantStore();
  const [staffMetrics, setStaffMetrics] = useState<StaffMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    fetchStaffMetrics();
  }, [tenantId]);

  async function fetchStaffMetrics() {
    setLoading(true);

    const { data: doctors } = await supabase
      .from('clinic_users')
      .select('id, full_name, full_name_ar')
      .eq('tenant_id', tenantId)
      .eq('role', 'doctor')
      .eq('is_active', true)
      .is('deleted_at', null);

    if (!doctors || doctors.length === 0) {
      setStaffMetrics([]);
      setLoading(false);
      return;
    }

    const metrics: StaffMetric[] = [];

    for (const doctor of doctors) {
      interface SessionRecord {
        session_status: string;
        session_duration_minutes: number | null;
        core_score_backend: number | null;
      }

      interface InvoiceRecord {
        total_subunits: number | null;
      }

      const { data: sessions } = await supabase
        .from('clinic_visit_sessions')
        .select('session_status, session_duration_minutes, core_score_backend')
        .eq('tenant_id', tenantId)
        .eq('doctor_id', doctor.id)
        .is('deleted_at', null);

      const { data: invoices } = await supabase
        .from('clinic_invoices')
        .select('total_subunits')
        .eq('tenant_id', tenantId)
        .in('invoice_status', ['paid', 'partial']);

      const totalSessions = sessions?.length || 0;
      const completedSessions = sessions?.filter((s: SessionRecord) => s.session_status === 'completed').length || 0;
      const avgDuration = totalSessions > 0
        ? (sessions?.reduce((sum: number, s: SessionRecord) => sum + (s.session_duration_minutes || 0), 0) || 0) / totalSessions
        : 0;
      const totalRevenue = invoices?.reduce((sum: number, inv: InvoiceRecord) => sum + (inv.total_subunits || 0), 0) || 0;
      const avgScore = totalSessions > 0
        ? (sessions?.reduce((sum: number, s: SessionRecord) => sum + (s.core_score_backend || 0), 0) || 0) / totalSessions
        : 0;

      metrics.push({
        doctor_id: doctor.id,
        doctor_name: doctor.full_name_ar || doctor.full_name,
        total_sessions: totalSessions,
        completed_sessions: completedSessions,
        avg_session_duration: Math.round(avgDuration),
        total_revenue_subunits: totalRevenue,
        avg_core_score: Math.round(avgScore / 10) / 10,
        patient_satisfaction: completedSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0,
      });
    }

    setStaffMetrics(metrics);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="p-4" dir="rtl">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse h-64" />
      </div>
    );
  }

  return (
    <div className="p-4" dir="rtl">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-6">
          <UserCheck className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold">أداء الطاقم الطبي</h2>
        </div>

        {staffMetrics.length === 0 ? (
          <div className="text-center text-gray-500 py-8">لا يوجد أطباء مسجلين</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-right py-3 px-4 font-medium text-gray-600">الطبيب</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">الجلسات</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">مكتملة</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">متوسط المدة</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">الإيرادات</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">Core Score</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">الرضا</th>
                </tr>
              </thead>
              <tbody>
                {staffMetrics.map((metric) => (
                  <tr key={metric.doctor_id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Stethoscope className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">{metric.doctor_name}</span>
                      </div>
                    </td>
                    <td className="text-center py-3 px-4">{metric.total_sessions}</td>
                    <td className="text-center py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        metric.completed_sessions === metric.total_sessions
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {metric.completed_sessions}/{metric.total_sessions}
                      </span>
                    </td>
                    <td className="text-center py-3 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        {metric.avg_session_duration}د
                      </div>
                    </td>
                    <td className="text-center py-3 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <DollarSign className="w-3 h-3 text-gray-400" />
                        {subunitsToDisplay(metric.total_revenue_subunits)}
                      </div>
                    </td>
                    <td className="text-center py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        metric.avg_core_score >= 80
                          ? 'bg-green-100 text-green-800'
                          : metric.avg_core_score >= 60
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {metric.avg_core_score.toFixed(1)}
                      </span>
                    </td>
                    <td className="text-center py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        metric.patient_satisfaction >= 90
                          ? 'bg-green-100 text-green-800'
                          : metric.patient_satisfaction >= 70
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {metric.patient_satisfaction}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}