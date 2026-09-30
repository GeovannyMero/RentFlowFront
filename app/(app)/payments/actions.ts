'use server';

import { ActionResult, clean, getAuthContext, SESSION_EXPIRED } from '@/lib/actions';
import { Payment } from '@/types/database';
import { format } from 'date-fns';
import { revalidatePath } from 'next/cache';

export type PaymentFormData = {
    contract_id: string;
    amount: number;
    payment_date: string;
    due_date: string;
    payment_type: Payment['payment_type'];
    payment_method?: string | null;
    reference_number?: string | null;
    notes?: string | null;
    status?: Payment['status'];
};

function normalize(data: PaymentFormData) {
    return {
        amount: Number(data.amount),
        payment_date: data.payment_date,
        due_date: data.due_date,
        payment_type: data.payment_type,
        payment_method: clean(data.payment_method),
        reference_number: clean(data.reference_number),
        notes: clean(data.notes),
        status: data.status ?? 'paid',
    };
}

export async function savePayment(id: string | null, data: PaymentFormData): Promise<ActionResult> {
    const values = normalize(data);
    if (!data.contract_id || !(values.amount > 0)) {
        return { error: 'Selecciona un contrato e ingresa un monto mayor a 0' };
    }

    const { supabase, user } = await getAuthContext();
    if (!user) {
        return { error: SESSION_EXPIRED };
    }

    // El contrato de un pago existente no se cambia al editar
    const { error } = id
        ? await supabase.from('payments').update(values).eq('id', id).eq('user_id', user.id)
        : await supabase.from('payments').insert({ ...values, contract_id: data.contract_id, user_id: user.id });

    if (error) {
        return { error: error.message };
    }

    revalidatePath('/payments');
    return { error: null };
}

export async function markPaymentAsPaid(id: string): Promise<ActionResult> {
    const { supabase, user } = await getAuthContext();
    if (!user) {
        return { error: SESSION_EXPIRED };
    }

    const { error } = await supabase
        .from('payments')
        .update({ status: 'paid', payment_date: format(new Date(), 'yyyy-MM-dd') })
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) {
        return { error: error.message };
    }

    revalidatePath('/payments');
    return { error: null };
}
