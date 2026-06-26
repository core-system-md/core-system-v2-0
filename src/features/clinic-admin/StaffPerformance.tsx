import { useEffect, useState } from 'react';
import { useTenantStore } from '@/shared/store/tenantStore';
import { supabase } from '@/infrastructure/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
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

    // Fetch doctors in tenant
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
      // Sessions for this doctor
      const { data: sessions } = await supabase
        .from('clinic_visit_sessions')
        .select('session_status, session_duration_minutes, core_score_backend')
        .eq('tenant_id', tenantId)
        .eq('doctor_id', doctor.id)
        .is('deleted_at', null);

      // Invoices linked to doctor's sessions
      const { data: invoices } = await supabase
        .from('clinic_invoices')
        .select('total_subunits')
        .eq('tenant_id', tenantId)
        .in('invoice_status', ['paid', 'partial']);

      const totalSessions = sessions?.length || 0;
      const completedSessions = sessions?.filter((s: any) => s.session_status === 'completed').length || 0;
      const avgDuration = totalSessions > 0
        ? (sessions?.reduce((sum: number, s: any) => sum + (s.session_duration_minutes || 0), 0) || 0) / totalSessions
        : 0;
      const totalRevenue = invoices?.reduce((sum: number, inv: any) => sum + (inv.total_subunits || 0), 0) || 0;
      const avgScore = totalSessions > 0
        ? (sessions?.reduce((sum: number, s: any) => sum + (s.core_score_backend || 0), 0) || 0) / totalSessions
        : 0;

      metrics.push({
        doctor_id: doctor.id,
        doctor_name: doctor.full_name_ar || doctor.full_name,
        total_sessions: totalSessions,
        completed_sessions: completedSessions,
        avg_session_duration: Math.round(avgDuration),
        total_revenue_subunits: totalRevenue,
        avg_core_score: Math.round(avgScore / 10) / 10, // Convert backend to display scale
        patient_satisfaction: completedSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0,
      });
    }

    setStaffMetrics(metrics);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="p-4">
        <Card className="animate-pulse"><CardContent className="h-64" /></Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserCheck className="w-5 h-5 text-blue-600" />
            أداء الطاقم الطبي
          </CardTitle>
        </CardHeader>
        <CardContent>
          {staffMetrics.length === 0 ? (
            <div className="text-center text-gray-500 py-8">لا يوجد أطباء مسجلين</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الطبيب</TableHead>
                  <TableHead className="text-center">الجلسات</TableHead>
                  <TableHead className="text-center">مكتملة</TableHead>
                  <TableHead className="text-center">متوسط المدة</TableHead>
                  <TableHead className="text-center">الإيرادات</TableHead>
                  <TableHead className="text-center">Core Score</TableHead>
                  <TableHead className="text-center">الرضا</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffMetrics.map((metric) => (
                  <TableRow key={metric.doctor_id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Stethoscope className="w-4 h-4 text-gray-400" />
                        {metric.doctor_name}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{metric.total_sessions}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={metric.completed_sessions === metric.total_sessions ? 'default' : 'secondary'}>
                        {metric.completed_sessions}/{metric.total_sessions}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        {metric.avg_session_duration}د
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <DollarSign className="w-3 h-3 text-gray-400" />
                        {subunitsToDisplay(metric.total_revenue_subunits)}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant={metric.avg_core_score >= 80 ? 'default' : metric.avg_core_score >= 60 ? 'secondary' : 'destructive'}
                      >
                        {metric.avg_core_score.toFixed(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant={metric.patient_satisfaction >= 90 ? 'default' : metric.patient_satisfaction >= 70 ? 'secondary' : 'destructive'}
                      >
                        {metric.patient_satisfaction}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}