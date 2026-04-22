-- Migration: Secure invites table with RLS
-- Date: 2026-04-22

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- 1. Admins and Managers can read all invites
CREATE POLICY "Admins and Managers can read all invites"
ON public.invites
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'admin' OR profiles.role = 'manager')
  )
);

-- 2. Residents can read invites they created
CREATE POLICY "Residents can read their own created invites"
ON public.invites
FOR SELECT
TO authenticated
USING (
  invited_by = auth.uid()
);

-- 3. Edge functions (service_role) handle inserts and updates, but let's allow authenticated users to see their status
-- Note: Insert and Update are done via service_role in Edge Functions, so they bypass RLS.
