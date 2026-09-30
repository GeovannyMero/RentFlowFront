'use client';

import { signup, type AuthState } from '@/app/auth/login/action';
import { useAuth } from '@/components/auth/auth-provider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useActionState } from 'react';

interface AuthFormProps {
  mode: 'login' | 'signup';
}

export function AuthForm({ mode }: AuthFormProps) {
  const { signIn } = useAuth();
  const router = useRouter();

  // El login se hace con el cliente de Supabase del navegador para que
  // onAuthStateChange actualice el AuthProvider antes de navegar al home.
  const login = async (_prevState: AuthState, formData: FormData): Promise<AuthState> => {
    const email = String(formData.get('email') ?? '').trim();
    const password = String(formData.get('password') ?? '');

    if (!email || !password) {
      return { error: 'Por favor ingresa tu correo y contraseña' };
    }

    const { error } = await signIn(email, password);
    if (error) {
      return {
        error: error.message === 'Invalid login credentials'
          ? 'Credenciales incorrectas'
          : error.message,
      };
    }

    router.replace('/');
    router.refresh();
    return null;
  };

  const actionToUse = mode === 'login' ? login : signup;

  // useActionState maneja la respuesta del servidor (state) y el estado de carga (isPending)
  const [state, formAction, isPending] = useActionState(actionToUse, null);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg">
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">RentFlow</h1>
              <p className="text-slate-500 text-sm">Administración de Alquileres</p>
            </div>
          </div>
        </div>

        <Card className="border-slate-200 bg-white shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-slate-800">
              {mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
            </CardTitle>
            <CardDescription className="text-slate-500">
              {mode === 'login'
                ? 'Ingresa tus credenciales para acceder al sistema'
                : 'Completa el formulario para crear tu cuenta'}
            </CardDescription>
          </CardHeader>

          {/* Vinculamos el Server Action directamente en el prop action del formulario */}
          <form action={formAction}>
            <CardContent className="space-y-4">
              {state?.error && (
                <Alert variant="destructive" className="bg-red-50 border-red-200">
                  <AlertDescription>{state.error}</AlertDescription>
                </Alert>
              )}
              {state?.message && (
                <Alert className="bg-emerald-50 border-emerald-200">
                  <AlertDescription className="text-emerald-700">{state.message}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700">Correo electrónico</Label>
                <Input
                  id="email"
                  name="email" /* 👈 Requerido para FormData */
                  type="email"
                  placeholder="tu@email.com"
                  required
                  className="bg-white border-slate-300 text-slate-800 placeholder:text-slate-400 focus:border-emerald-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700">Contraseña</Label>
                <Input
                  id="password"
                  name="password" /* 👈 Requerido para FormData */
                  type="password"
                  placeholder="••••••••"
                  required
                  className="bg-white border-slate-300 text-slate-800 placeholder:text-slate-400 focus:border-emerald-500"
                />
              </div>

              {mode === 'signup' && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-slate-700">Confirmar Contraseña</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword" /* 👈 Requerido para FormData */
                    type="password"
                    placeholder="••••••••"
                    required
                    className="bg-white border-slate-300 text-slate-800 placeholder:text-slate-400 focus:border-emerald-500"
                  />
                </div>
              )}
            </CardContent>

            <CardFooter className="flex flex-col gap-4">
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold"
                disabled={isPending}
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
              </Button>

              <div className="text-center text-sm text-slate-500">
                {mode === 'login' ? (
                  <>
                    ¿No tienes cuenta?{' '}
                    <a href="/auth/signup" className="text-emerald-600 hover:text-emerald-700 font-medium">
                      Crear cuenta
                    </a>
                  </>
                ) : (
                  <>
                    ¿Ya tienes cuenta?{' '}
                    <a href="/auth/login" className="text-emerald-600 hover:text-emerald-700 font-medium">
                      Iniciar sesión
                    </a>
                  </>
                )}
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}