-- 195 - Convite de cadastro: reabrir o link já gerado (copiar de novo / enviar pelo WhatsApp).
--
-- O token continua guardado só como hash (token_hash) para validar o acesso. Esta coluna guarda o MESMO código, mas
-- CIFRADO (AES-256-GCM, chave derivada do servidor), só para a equipe conseguir copiar ou reenviar o link de um convite
-- ainda ativo sem invalidar o que o cliente já recebeu. Quem lê o banco sem a chave do servidor não consegue usar o código.
-- Convites anteriores a esta migration ficam sem a coluna preenchida: nesses, a equipe usa "Gerar novo link".

ALTER TABLE public.business_signup_invites ADD COLUMN IF NOT EXISTS encrypted_code TEXT;

NOTIFY pgrst, 'reload schema';
