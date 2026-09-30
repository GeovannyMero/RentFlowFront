'use server';

import { ActionResult, clean, getAuthContext, SESSION_EXPIRED } from '@/lib/actions';
import { revalidatePath } from 'next/cache';

export type ExpenseFormData = {
    apartment_id: string | null;
    category: string;
    expense_type: 'vacancy_maintenance' | 'rented';
    description: string;
    amount: number;
    expense_date: string;
    notes?: string | null;
};

function normalize(data: ExpenseFormData) {
    return {
        apartment_id: data.apartment_id || null,
        category: data.category,
        expense_type: data.expense_type,
        description: data.description.trim(),
        amount: Number(data.amount),
        expense_date: data.expense_date,
        notes: clean(data.notes),
    };
}

export async function saveExpense(id: string | null, data: ExpenseFormData): Promise<ActionResult> {
    const values = normalize(data);
    if (!values.description || !(values.amount > 0) || !values.expense_date) {
        return { error: 'Completa los campos requeridos.' };
    }

    const { supabase, user } = await getAuthContext();
    if (!user) {
        return { error: SESSION_EXPIRED };
    }

    const { error } = id
        ? await supabase.from('expenses').update(values).eq('id', id).eq('user_id', user.id)
        : await supabase.from('expenses').insert({ ...values, user_id: user.id });

    if (error) {
        return { error: id ? 'No se pudo actualizar el gasto.' : 'No se pudo registrar el gasto.' };
    }

    revalidatePath('/expenses');
    return { error: null };
}

export async function deleteExpense(id: string): Promise<ActionResult> {
    const { supabase, user } = await getAuthContext();
    if (!user) {
        return { error: SESSION_EXPIRED };
    }

    const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) {
        return { error: 'No se pudo eliminar el gasto.' };
    }

    revalidatePath('/expenses');
    return { error: null };
}
