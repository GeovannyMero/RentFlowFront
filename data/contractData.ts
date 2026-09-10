import { supabase } from "@/lib/supabase";


export async function GetContracts(userId: string) {
    try {
        const { data: contracts } = await supabase
            .from('contracts')
            .select('id, apartment_id, tenant_id, tenants(first_name, last_name)')
            .eq('user_id', userId)
            .eq('status', 'active');
        return contracts ?? []
    } catch (error) {
        console.error(error);
    }
}

