# Gate 1C.2 — Relatório: cadastro direto de representante com senha temporária

Branch: `feature/commercial-1c2` (não mesclada na `main`). Plano aprovado: `GATE-1C2-PLANO-CADASTRO-DIRETO-REPRESENTANTE.md`.
Não toca em Asaas, checkout, faturamento, regras financeiras nem nos Gates 1D/1E.

## O que foi entregue

| Item | Onde |
|---|---|
| Migration 240 (aditiva) + rollback seguro | `supabase/migrations/240_commercial_representative_access.sql`, `supabase/rollbacks/commercial/240_rollback.sql` |
| Cadastro com duas opções (convite / acesso direto) | `lib/commercial/representatives-service.ts`, `app/comercial/representantes/representatives-client.tsx` |
| Senha temporária gerada pelo servidor (14 caracteres, `crypto`) | `lib/commercial/temp-password.ts` |
| Exibição única da senha à equipe, estado e "Nova senha temporária" | tela de representantes |
| Troca obrigatória no primeiro login | `app/definir-senha-representante/*`, `lib/commercial/temp-password-service.ts` |
| Trava no middleware (troca pendente / senha expirada) | `middleware.ts` |
| Aviso de senha expirada e atalho no login | `app/(auth)/login/page.tsx` |

## Como funciona

- **Acesso direto:** a equipe escolhe "Acesso direto"; o servidor cria o usuário (`auth.admin.createUser`, e-mail confirmado) com senha aleatória e marca `app_metadata.must_change_password = true` e `temp_password_expires_at`. O representante nasce em `pending_review` (a ativação continua manual).
- **Validade:** 24 h a 7 dias, padrão 72 h. Expirada, a sessão é encerrada pelo middleware e o login mostra o aviso; a equipe usa "Nova senha temporária".
- **Primeiro login:** com troca pendente só `/definir-senha-representante` e `/login` funcionam; APIs respondem 403. A troca exige a senha temporária atual (conferida no Auth), nova senha de 10+ caracteres com letras e números e diferente da temporária.
- **Conta existente:** o modo direto é recusado e nunca altera a senha de uma conta que já existe (usar o convite, que só vincula).
- **Senha nunca registrada:** não vai para banco, auditoria nem log (teste estático garante).
- **Se o cadastro falha** depois de criar o usuário, o usuário é removido.
- **Módulo desligado:** a trava do middleware não roda; nada muda no login/cadastro atuais.

## Desvios do plano (para ciência)

1. **Contrato/termos no primeiro acesso: não incluído.** Não existe texto de contrato do representante no sistema, e não criei texto jurídico. A equipe continua registrando a versão do contrato ao ativar (fluxo atual). Entra quando houver o documento aprovado.
2. **Rota da troca de senha:** `/definir-senha-representante` (fora de `/representante`, para o layout da área do representante não exibir menu durante a troca), e não `/representante/definir-senha`.
3. **Limite de tentativas de login:** vale o limite do próprio Supabase Auth; não foi criado limite adicional.
4. **E-mail com a senha:** o sistema não envia e-mail; a equipe repassa a senha por canal próprio.

## Validação

| Verificação | Resultado |
|---|---|
| Migration 240 em PGlite (`pnpm test:commercial-access`) | 9/9 |
| Migration 239 (regressão, `pnpm test:commercial-link`) | 33/33 |
| Vitest do módulo (10 arquivos) | 80/80 (15 novos) |
| `pnpm --filter web typecheck` | sem erros |
| Vitest completo | ver nota abaixo |

Limites: PGlite não exercita RLS/JWT reais nem a API `auth.admin` do Supabase; o fluxo `createUser` → login → troca de senha **não foi testado contra um Supabase real**. É o primeiro roteiro a executar na homologação.

## Roteiro de homologação (Supabase de teste ou o oficial com representante fictício)

1. Aplicar a 240 (conferindo o Project Ref).
2. Cadastrar representante em "Acesso direto" com e-mail novo → copiar a senha.
3. Login com a senha temporária → deve ir direto para a troca; testar acesso a `/representante` e `/minha-conta` antes de trocar (devem redirecionar).
4. Trocar a senha (recusar curta, sem número, igual à temporária) → cai em `/representante`.
5. Repetir com validade de 24 h forçando expiração (ajustar `temp_password_expires_at` no `app_metadata`) → login encerra a sessão com aviso; "Nova senha temporária" restaura o acesso.
6. Tentar o modo direto com e-mail de conta existente → recusado, senha da conta intacta.

## Antes de usar com pessoas reais (inalterado)

Revisão jurídica do cookie/política, limite de requisições no `/r/` e teste de RLS com JWT real. Gates 1D/1E seguem não autorizados.
