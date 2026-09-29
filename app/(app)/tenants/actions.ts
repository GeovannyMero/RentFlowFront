'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export type TenantFormData = {
    first_name: string;
    last_name: string;
    email?: string | null;
    phone?: string | null;
    emergency_contact?: string | null;
    emergency_phone?: string | null;
    identification_number?: string | null;
    notes?: string | null;
};

export type ActionResult = { error: string | null };

function normalize(data: TenantFormData) {
    const clean = (value?: string | null) => value?.trim() || null;
    return {
        first_name: data.first_name.trim(),
        last_name: data.last_name.trim(),
        email: clean(data.email),
        phone: clean(data.phone),
        emergency_contact: clean(data.emergency_contact),
        emergency_phone: clean(data.emergency_phone),
        identification_number: clean(data.identification_number),
        notes: clean(data.notes),
    };
}

export async function saveTenant(id: string | null, data: TenantFormData): Promise<ActionResult> {
    const values = normalize(data);
    if (!values.first_name || !values.last_name) {
        return { error: 'El nombre y los apellidos son obligatorios' };
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: 'Tu sesión ha expirado. Vuelve a iniciar sesión.' };
    }

    const { error } = id
        ? await supabase.from('tenants').update(values).eq('id', id).eq('user_id', user.id)
        : await supabase.from('tenants').insert({ ...values, user_id: user.id });

    if (error) {
        return { error: error.message };
    }

    revalidatePath('/tenants');
    return { error: null };
}

export async function deleteTenant(id: string): Promise<ActionResult> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: 'Tu sesión ha expirado. Vuelve a iniciar sesión.' };
    }

    const { error } = await supabase
        .from('tenants')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) {
        return { error: error.message };
    }

    revalidatePath('/tenants');
    return { error: null };
}
