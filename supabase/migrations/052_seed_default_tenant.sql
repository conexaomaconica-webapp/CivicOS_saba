-- Garante que um Tenant "Default" exista para que as inserções locais funcionem
-- sem violar a restrição de chave estrangeira (foreign key)

INSERT INTO public.tenants (id, name, slug, settings) 
VALUES (
  '00000000-0000-0000-0000-000000000000', 
  'Conexão Maçônica', 
  'conexao-maconica', 
  '{}'::jsonb
) 
ON CONFLICT (id) DO NOTHING;
