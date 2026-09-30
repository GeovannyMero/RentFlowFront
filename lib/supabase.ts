import { createClient } from '@/utils/supabase/client';

// Cliente del navegador basado en cookies (@supabase/ssr), el mismo que usa el AuthProvider.
// Así las consultas llevan el token de sesión y pasan las políticas RLS.
export const supabase = createClient();
