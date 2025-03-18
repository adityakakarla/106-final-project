import { createClient } from "@supabase/supabase-js";

export const supabase = createClient('https://bfxambqrjjzxwfhopnre.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmeGFtYnFyamp6eHdmaG9wbnJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIyNTE0ODMsImV4cCI6MjA1NzgyNzQ4M30.CLS6ecIWuoOscVx1Ged_cwtwqruvyzs9mnyZauBSVgA');

export async function heartRateData(supabase: any) {
    const { data, error } = await supabase
    .from('hr_data')
    .select('*')

    return { data, error }
    
}