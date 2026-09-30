'use server'

import { createClient } from '@/utils/supabase/server';

export type AuthState = {
    error?: string | null;
    message?: string | null;
} | null;

// ✅ Firma unificada 2: (prevState, formData)
export async function signup(prevState: AuthState, formData: FormData): Promise<AuthState> {
    const email = String(formData.get('email') ?? '').trim();
    const password = String(formData.get('password') ?? '');
    const confirmPassword = String(formData.get('confirmPassword') ?? '');

    if (password !== confirmPassword) {
        return { error: 'Las contraseñas no coinciden' };
    }

    if (password.length < 6) {
        return { error: 'La contraseña debe tener al menos 6 caracteres' };
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
        return { error: error.message };
    }

    return { message: 'Cuenta creada exitosamente. Puedes iniciar sesión.' };
}