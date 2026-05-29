import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan las variables de entorno para inicializar Supabase');
}

// Creamos el cliente global de base de datos
export const supabase = createClient(supabaseUrl, supabaseAnonKey);