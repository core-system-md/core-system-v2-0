import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../infrastructure/supabase/client';

const INVOICE_KEY = 'invoices';

export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      tenantId: string;
      sessionId: string;
      patientId: string;
      subtotal_subunits: number;
      tax_subunits?: number;
      discount_subunits?: number;
    }) => {
      const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
      const total = payload.subtotal_subunits + (payload.tax_subunits ?? 0) - (payload.discount_subunits ?? 0);
      const { data, error } = await supabase
        .from('clinic_invoices')
        .insert({
          tenant_id: payload.tenantId,
          session_id: payload.sessionId,
          patient_id: payload.patientId,
          invoice_number: invoiceNumber,
          subtotal_subunits: payload.subtotal_subunits,
          tax_subunits: payload.tax_subunits ?? 0,
          discount_subunits: payload.discount_subunits ?? 0,
          total_subunits: total,
          balance_subunits: total,
          paid_subunits: 0,
          status: 'draft',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [INVOICE_KEY, 'session', variables.sessionId] });
    },
  });
}

export function useCollectPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      invoiceId: string;
      paid_subunits: number;
      payment_method: string;
    }) => {
      const { data: invoice, error: fetchError } = await supabase
        .from('clinic_invoices')
        .select('*')
        .eq('id', payload.invoiceId)
        .single();
      if (fetchError) throw fetchError;

      const newPaid = (invoice.paid_subunits ?? 0) + payload.paid_subunits;
      const newBalance = invoice.total_subunits - newPaid;
      const newStatus = newBalance <= 0 ? 'paid' : newPaid > 0 ? 'partial' : invoice.status;

      const { data, error } = await supabase
        .from('clinic_invoices')
        .update({
          paid_subunits: newPaid,
          balance_subunits: Math.max(0, newBalance),
          status: newStatus,
          payment_method: payload.payment_method,
          paid_at: newStatus === 'paid' ? new Date().toISOString() : null,
        })
        .eq('id', payload.invoiceId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [INVOICE_KEY, variables.invoiceId] });
      queryClient.invalidateQueries({ queryKey: [INVOICE_KEY, 'session'] });
      queryClient.invalidateQueries({ queryKey: [INVOICE_KEY, 'unpaid'] });
    },
  });
}

export function useUpdateInvoiceStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { invoiceId: string; status: string }) => {
      const updates: Record<string, unknown> = { status: payload.status };
      if (payload.status === 'issued') {
        updates.issued_at = new Date().toISOString();
      }
      const { data, error } = await supabase
        .from('clinic_invoices')
        .update(updates)
        .eq('id', payload.invoiceId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [INVOICE_KEY, variables.invoiceId] });
    },
  });
}
