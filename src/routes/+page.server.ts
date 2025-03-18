import type { PageLoad } from './$types';
import { supabase, heartRateData } from '$lib/supabase';

export const load: PageLoad = async ({ params }: any) => {
        const { data, error } = await heartRateData(supabase);
	return {data};
};