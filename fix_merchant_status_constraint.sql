-- Fix the merchants table status constraint to include 'blocked' status
-- This allows admins to block/unblock merchants

-- First, drop the existing constraint
ALTER TABLE public.merchants DROP CONSTRAINT IF EXISTS merchants_status_check;

-- Add the new constraint that includes 'blocked' status
ALTER TABLE public.merchants ADD CONSTRAINT merchants_status_check 
CHECK (status IN ('pending', 'approved', 'rejected', 'blocked'));

-- Verify the constraint was added
SELECT conname, pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.merchants'::regclass 
AND conname = 'merchants_status_check';
