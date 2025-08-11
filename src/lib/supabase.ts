import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zfdcqcoezkxuvwqpizmc.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmZGNxY29lemt4dXZ3cXBpem1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2NTg1MTQsImV4cCI6MjA2NjIzNDUxNH0.oiLG5Pr079Zzz82hHvgvfASKryolWYsXt9e6z7zL-JE'

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
            eventsPerSecond: 10
        }
    }
}) 