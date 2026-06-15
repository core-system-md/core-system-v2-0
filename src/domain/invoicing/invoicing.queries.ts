import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../infrastructure/supabase/client';

export interface InvoiceRow {
  id: string;
  tenant_id: string;
  session_id: string;
  patient_id: string;
  invoice_number: string;
  subtotal_subunits: number;
  tax_subunits: number;
  discount_subunits: number;
  total_subunits: number;
  paid_subunits: number;
  balance_subunits: number;
  status: string;
  issued_at: string | null;
  paid_at: string | null;
  payment_method: string | null;
}

const INVOICE_KEY = 'invoices';

export function useInvoice(invoiceId: string) {
  return useQuery({
    queryKey: [INVOICE_KEY, invoiceId],
    queryFn: async (): Promise<InvoiceRow> => {
      const { data, error } = await supabase
        .from('clinic_invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!invoiceId,
  });
}

export function useInvoicesBySession(sessionId: string) {
  return useQuery({
    queryKey: [INVOICE_KEY, 'session', sessionId],
    queryFn: async (): Promise<InvoiceRow[]> => {
      const { data, error } = await supabase
        .from('clinic_invoices')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!sessionId,
  });
}

export function useUnpaidInvoicesByPatient(patientId: string) {
  return useQuery({
    queryKey: [INVOICE_KEY, 'unpaid', patientId],
    queryFn: async (): Promise<InvoiceRow[]> => {
      const { data, error } = await supabase
        .from('clinic_invoices')
        .select('*')
        .eq('patient_id', patientId)
        .in('status', ['draft', 'issued', 'partial', 'overdue'])
        .order('issued_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!patientId,
  });
}

export function useInvoicesByTenant(tenantId: string, status?: string) {
  return useQuery({
    queryKey: [INVOICE_KEY, 'tenant', tenantId, status],
    queryFn: async (): Promise<InvoiceRow[]> => {
      let query = supabase
        .from('clinic_invoices')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('issued_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!tenantId,
  });
}
