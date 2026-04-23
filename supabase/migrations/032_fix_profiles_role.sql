-- Migration: Fix profiles view and ensure roles are respected
-- Date: 2026-04-22

-- We need to ensure that the profile creation from auth.users (if any trigger remains)
-- defaults to resident ONLY IF not provided, but since we disabled the trigger,
-- we just need to ensure the policy allows the edge function to update any role.

-- However, the issue might be that the Edge Function's update is being rejected by RLS
-- because it uses service_role but maybe there's a constraint failing.

-- Let's make absolutely sure 'familiar' is a valid role everywhere it's used.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'manager', 'resident', 'familiar'));

ALTER TABLE public.invites DROP CONSTRAINT IF EXISTS invites_role_check;
ALTER TABLE public.invites ADD CONSTRAINT invites_role_check CHECK (role IN ('admin', 'manager', 'resident', 'familiar'));

-- Also, let's fix the 406 error on invites table by adjusting RLS
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins and Managers can read all invites" ON public.invites;
CREATE POLICY "Admins and Managers can read all invites"
ON public.invites FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'admin' OR profiles.role = 'manager')
  )
);

DROP POLICY IF EXISTS "Users can read their own created invites" ON public.invites;
CREATE POLICY "Users can read their own created invites"
ON public.invites FOR SELECT TO authenticated
USING (
  invited_by = auth.uid()
);

-- Note: Inserts and Updates to invites are handled by the edge function using service_role,
-- which bypasses RLS. We just needed SELECT for the UI to read them.
