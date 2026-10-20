SELECT
  u.email,
  p.role,
  u.email_confirmed_at
FROM auth.users AS u
JOIN public.profiles AS p ON p.id = u.id
WHERE u.id = '4fdc15f0-121b-4ef6-b08d-5e7266871fb3'::uuid;