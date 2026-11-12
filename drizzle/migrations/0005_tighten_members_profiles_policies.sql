DROP POLICY IF EXISTS "Team can view profiles" ON public.profiles;
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "Anyone can update status" ON public.members;
DROP POLICY IF EXISTS "Anyone can join" ON public.members;
DROP POLICY IF EXISTS "Anyone can view members" ON public.members;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.members FROM anon, authenticated;