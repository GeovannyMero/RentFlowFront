import { createClient } from '@/utils/supabase/server';

export type ActionResult = { error: string | null };

export const SESSION_EXPIRED = 'Tu sesión ha expirado. Vuelve a iniciar sesión.';

// Crea el cliente de Supabase del servidor (con las cookies de sesión) y obtiene el usuario autenticado.
export async function getAuthContext() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return { supabase, user };
}

export const clean = (value?: string | null) => value?.trim() || null;
