INSERT INTO public.profiles (id, full_name, email, phone, role, user_type)
SELECT u.id,
       COALESCE(u.raw_user_meta_data->>'full_name', u.email),
       u.email,
       u.raw_user_meta_data->>'phone',
       'student'::user_role,
       COALESCE((u.raw_user_meta_data->>'user_type')::user_type, 'frequentador'::user_type)
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;