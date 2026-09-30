'use server';

import { ActionResult, clean, getAuthContext, SESSION_EXPIRED } from '@/lib/actions';
import { Apartment } from '@/types/database';
import { revalidatePath } from 'next/cache';

export type ApartmentFormData = {
    number: string;
    name: string;
    description?: string | null;
    monthly_rent: number;
    status: Apartment['status'];
    bedrooms: number;
    bathrooms: number;
    area?: number | null;
    floor?: number | null;
};

function normalize(data: ApartmentFormData) {
    return {
        number: data.number.trim(),
        name: data.name.trim(),
        description: clean(data.description),
        monthly_rent: Number(data.monthly_rent),
        status: data.status,
        bedrooms: Number(data.bedrooms),
        bathrooms: Number(data.bathrooms),
        area: data.area || null,
        floor: data.floor || null,
    };
}

export async function saveApartment(id: string | null, data: ApartmentFormData): Promise<ActionResult> {
    const values = normalize(data);
    if (!values.number || !values.name || !(values.monthly_rent > 0)) {
        return { error: 'El número, el nombre y una renta mayor a 0 son obligatorios' };
    }

    const { supabase, user } = await getAuthContext();
    if (!user) {
        return { error: SESSION_EXPIRED };
    }

    const { error } = id
        ? await supabase.from('apartments').update(values).eq('id', id).eq('user_id', user.id)
        : await supabase.from('apartments').insert({ ...values, user_id: user.id });

    if (error) {
        return { error: error.message };
    }

    revalidatePath('/apartments');
    return { error: null };
}

export async function deleteApartment(id: string): Promise<ActionResult> {
    const { supabase, user } = await getAuthContext();
    if (!user) {
        return { error: SESSION_EXPIRED };
    }

    const { error } = await supabase
        .from('apartments')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) {
        return { error: error.message };
    }

    revalidatePath('/apartments');
    return { error: null };
}

export type TerminateContractData = {
    contract_id: string;
    apartment_id: string;
    termination_date: string;
    reason: string;
    notes?: string | null;
};

export async function terminateContract(data: TerminateContractData): Promise<ActionResult> {
    if (!data.contract_id || !data.apartment_id || !data.termination_date || !data.reason) {
        return { error: 'La fecha y el motivo de terminación son obligatorios' };
    }

    const { supabase, user } = await getAuthContext();
    if (!user) {
        return { error: SESSION_EXPIRED };
    }

    const { error: contractError } = await supabase
        .from('contracts')
        .update({
            status: 'terminated',
            end_date: data.termination_date,
            termination_date: data.termination_date,
            termination_reason: data.reason,
        })
        .eq('id', data.contract_id)
        .eq('user_id', user.id);

    if (contractError) {
        return { error: 'No se pudo terminar el contrato.' };
    }

    const { error: terminationError } = await supabase
        .from('contract_terminations')
        .insert({
            contract_id: data.contract_id,
            termination_date: data.termination_date,
            reason: data.reason,
            notes: clean(data.notes),
            user_id: user.id,
        });

    if (terminationError) {
        return { error: 'No se pudo registrar la terminación.' };
    }

    const { error: apartmentError } = await supabase
        .from('apartments')
        .update({ status: 'vacant' })
        .eq('id', data.apartment_id)
        .eq('user_id', user.id);

    if (apartmentError) {
        return { error: 'No se pudo actualizar el departamento.' };
    }

    revalidatePath('/apartments');
    revalidatePath(`/apartments/${data.apartment_id}`);
    return { error: null };
}
