import { supabase } from "@/lib/supabase";


export async function GetAparments(userId: string) {
    try {
        const { data: apartmentsData } = await supabase
            .from('apartments')
            .select('*')
            .eq('user_id', userId)
            .order('number');
        return apartmentsData ?? []
    } catch (error) {
        console.error(error);
    }
}

