import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import TenantsClient, { TenantWithApartment } from './tenats-client';

export const instant = false;

export default async function TenantsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const [{ data: tenantsData }, { data: contracts }] = await Promise.all([
    supabase
      .from('tenants')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('contracts')
      .select('id, tenant_id, apartment_id, apartments(name, number, id)')
      .eq('user_id', user.id)
      .eq('status', 'active'),
  ]);

  const tenants: TenantWithApartment[] = (tenantsData ?? []).map((tenant) => {
    const contract = contracts?.find((c) => c.tenant_id === tenant.id);
    const apartment = contract?.apartments as { name: string; number: string } | null | undefined;
    return {
      ...tenant,
      apartment_name: apartment ? `${apartment.name} (Depto. ${apartment.number})` : undefined,
      apartment_id: contract?.apartment_id,
    };
  });

  return <TenantsClient tenants={tenants} />;
}
