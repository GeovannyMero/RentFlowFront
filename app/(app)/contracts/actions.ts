'use server';

import { ActionResult, clean, getAuthContext, SESSION_EXPIRED } from '@/lib/actions';
import { revalidatePath } from 'next/cache';

export type ContractFormData = {
    apartment_id: string;
    tenant_id: string;
    start_date: string;
    end_date?: string | null;
    monthly_rent: number;
    deposit_amount: number;
    deposit_paid: boolean;
    notes?: string | null;
};

export async function createContract(data: ContractFormData): Promise<ActionResult> {
    if (!data.apartment_id || !data.tenant_id || !data.start_date) {
        return { error: 'El departamento, el inquilino y la fecha de inicio son obligatorios' };
    }
    if (!(Number(data.monthly_rent) > 0)) {
        return { error: 'La renta mensual debe ser mayor a 0' };
    }

    const { supabase, user } = await getAuthContext();
    if (!user) {
        return { error: SESSION_EXPIRED };
    }

    const depositAmount = Number(data.deposit_amount) || 0;

    const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .insert({
            apartment_id: data.apartment_id,
            tenant_id: data.tenant_id,
            start_date: data.start_date,
            end_date: data.end_date || null,
            monthly_rent: Number(data.monthly_rent),
            deposit_amount: depositAmount || null,
            deposit_paid: data.deposit_paid,
            notes: clean(data.notes),
            status: 'active',
            user_id: user.id,
        })
        .select()
        .single();

    if (contractError || !contract) {
        return { error: contractError?.message ?? 'No se pudo crear el contrato.' };
    }

    const { error: apartmentError } = await supabase
        .from('apartments')
        .update({ status: 'occupied' })
        .eq('id', data.apartment_id)
        .eq('user_id', user.id);

    if (apartmentError) {
        return { error: apartmentError.message };
    }

    const payments = [];

    // Si el depósito está pagado, se registra como pago
    if (depositAmount > 0 && data.deposit_paid) {
        payments.push({
            contract_id: contract.id,
            amount: depositAmount,
            payment_date: data.start_date,
            due_date: data.start_date,
            payment_type: 'deposit',
            payment_method: 'cash',
            status: 'paid',
            notes: 'Depósito de garantía',
            user_id: user.id,
        });
    }

    // Renta del primer mes (el contrato es nuevo, no puede tener pagos previos)
    payments.push({
        contract_id: contract.id,
        amount: Number(data.monthly_rent),
        payment_date: data.start_date,
        due_date: data.start_date,
        payment_type: 'rent',
        status: 'pending',
        notes: 'Renta del primer mes',
        user_id: user.id,
    });

    const { error: paymentsError } = await supabase.from('payments').insert(payments);

    if (paymentsError) {
        return { error: paymentsError.message };
    }

    revalidatePath('/apartments');
    revalidatePath(`/apartments/${data.apartment_id}`);
    revalidatePath('/payments');
    revalidatePath('/tenants');
    return { error: null };
}
