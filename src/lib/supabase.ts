import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://snpcpjzsmwkmzkrqccsy.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNucGNwanpzbXdrbXprcnFjY3N5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxOTE0ODQsImV4cCI6MjA4Nzc2NzQ4NH0.PZ2CmoeQw9FQlYEiJew0OiL5pro0DM99Gc8NMfPKIR4";

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || SUPABASE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing. Please check your environment variables.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
