import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";

// Incolla qui l'URL del tuo progetto Supabase
const supabaseUrl = "https://npkzojijhljgnvmopfxz.supabase.co/rest/v1/";

// Incolla qui la tua Publishable Key (o anon key)
const supabaseAnonKey = "sb_publishable_dw2aXvgzBPPQzLEqJUnjow_N6jHsZpl";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
