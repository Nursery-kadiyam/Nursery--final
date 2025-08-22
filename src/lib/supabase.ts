import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nlrdxgcckfgsgivljmkf.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5scmR4Z2Nja2Znc2dpdmxqbWtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2NzI3MzEsImV4cCI6MjA3MTI0ODczMX0.jUvGwtvHII75px9cySp5_oxAf8-8aL8xKi9id8DvgF8'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        storageKey: 'kadiyam-nursery-auth',
        storage: {
            getItem: (key) => {
                try {
                    return localStorage.getItem(key)
                } catch {
                    return null
                }
            },
            setItem: (key, value) => {
                try {
                    localStorage.setItem(key, value)
                } catch {
                    // Handle storage errors gracefully
                }
            },
            removeItem: (key) => {
                try {
                    localStorage.removeItem(key)
                } catch {
                    // Handle storage errors gracefully
                }
            }
        }
    },
    realtime: {
        params: {
            eventsPerSecond: 1
        }
    }
}) 