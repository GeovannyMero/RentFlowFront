'use server'

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export type AuthState = {
    error?: string | null;
    message?: string | null;
} | null;

export async function login(prevState: AuthState, formData: FormData): Promise<AuthState> {
    const email = String(formData.get('email') ?? '').trim();
    const password = String(formData.get('password') ?? '');

    if (!email || !password) {
        return { error: 'Por favor ingresa tu correo y contraseña' };
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        return {
            error: error.message === 'Invalid login credentials'
                ? 'Credenciales incorrectas'
                : error.message,
        };
    }

    redirect('/');
}

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