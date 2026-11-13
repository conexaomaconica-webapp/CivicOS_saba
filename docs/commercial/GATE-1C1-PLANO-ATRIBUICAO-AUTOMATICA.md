# Relatório 2 — Plano do Gate 1C.1: cookie `cm_ref` → atribuição pendente

**Status:** somente desenho. **Nenhum código foi alterado.** Aguarda aprovação específica.
**Princípio:** o cookie **nunca** é prova de titularidade; é só um ponteiro para uma evidência registrada e validada no servidor. O cadastro da empresa **nunca** é bloqueado. A atribuição criada é sempre **pendente**.

## 1. Situação atual (fatos do código)
- `/r/[code]` grava a evidência `referral_link_visit` e define o cookie `cm_ref` com **o próprio código do representante em texto**, httpOnly, 30 dias (`app/r/[code]/route.ts`).
- Problemas desse desenho para a integração: o valor é **previsível e forjável** (qualquer um que conheça um código pode "carregar" um cookie), não está ligado a uma visita específica, e o mesmo cookie serviria para várias empresas (replay).
- A empresa é criada em **`createBusinessDraft`** (`lib/business/business-registration-service.ts`, chamada pelo cliente em `app/anunciar/passo-2/business-form.tsx`). `saveStepDataAction` passo 2 (`onboarding-server-state.ts`) também insere em `businesses`, mas o formulário atual não o usa para o passo 2. Há ainda o fluxo de convite (`signup-invite-service.ts`), que já tem evidência própria `signup_invite` e **não** usa o cookie.
- Já existe no banco: `commercial_attributions` (índice único de **uma confirmada por empresa** e **uma pendente por empresa+representante**, `origin_evidence_id`, `attributed_at`, `valid_until`), evidência imutável com vínculo único de NULL→valor, e `commercial_settings.referral_validity_days`.

## 2. Fluxo desenhado
```
/r/REP-XXXX ──► cria evidência (token aleatório, validade) ──► cookie cm_ref = token opaco
anunciante cria a empresa (passo 2) ──► [após sucesso] claimCommercialReferralAction(businessId)
   └─► RPC commercial_claim_referral (service_role) ──► atribuição PENDENTE  | ou  registro de pendência/conflito
admin confirma/rejeita em /comercial/atribuicoes (já existe)
```

## 3. Cookie: proteção contra adulteração, replay e expiração
- **Valor = token aleatório de 128 bits** (opaco), não o código. No banco guarda-se apenas o **hash SHA-256** do token (`visit_token_hash`, único). Forjar exige adivinhar 128 bits; a adulteração do valor simplesmente não encontra evidência.
- **Expiração:** a evidência ganha `valid_until` (= captura + `referral_validity_days` **vigente na data**, congelado); o cookie usa o mesmo prazo. A validação no servidor usa o `valid_until` do banco, **não** o relógio do cookie.
- **Replay / reaproveitamento:** a evidência só pode ser vinculada a **uma** empresa (`business_id` NULL→valor, já garantido pelo guard de imutabilidade). Um mesmo token não atribui duas empresas. Após o vínculo, o cookie é apagado.
- **Primeiro toque vale (sem substituição):** se já existir cookie com token **ainda válido** de outro representante, uma nova visita por `/r/` de outro representante **registra a evidência (auditoria) mas não troca o cookie**. Decisão de política a aprovar: *first-touch dentro da validade* (recomendado) vs *last-touch*.
- Flags do cookie: `httpOnly`, `Secure`, `SameSite=Lax`, `Path=/`. Não grava IP nem user-agent (AGENTS §4); só `referer` truncado, como hoje.
- **Privacidade/LGPD:** é cookie funcional de apuração. Recomendo mencionar na Política de Privacidade (item para o jurídico) e não usar o token para nenhum outro fim.

## 4. Ponto de integração e preservação do onboarding
- **Alteração mínima no onboarding: uma chamada** em `business-form.tsx`, depois de `createBusinessDraft` retornar sucesso, para a nova server action `claimCommercialReferralAction(businessId)` (módulo comercial), dentro de `try/catch`, sem `await` bloqueante do resultado na UX e **sem alterar `createBusinessDraft`, `saveStepDataAction`, Asaas, checkout, planos ou contratos**.
- A action: (a) retorna imediatamente se a flag estiver desligada (retorno vazio, zero efeito); (b) lê o cookie; (c) confirma com o cliente do usuário que o `businessId` pertence ao usuário logado (`owner_id`); (d) chama a RPC com o `service_role`; (e) apaga o cookie se o token foi consumido ou é inválido; (f) **qualquer exceção é capturada** e vira registro de falha (item 7).
- Alternativa avaliada e descartada: gatilho de banco em `businesses` (acoplaria o módulo à tabela central e rodaria dentro da transação do cadastro — uma falha comercial poderia derrubar a criação da empresa). Não recomendado.

## 5. Regras da RPC `commercial_claim_referral` (SECURITY DEFINER, `service_role`)
Entrada: tenant, `business_id`, hash do token, usuário. Tudo numa transação, com `SELECT … FOR UPDATE` na empresa.
1. **Idempotência:** se já existe atribuição viva (`pending`/`confirmed`) da empresa para qualquer representante → retorna `already_attributed`, sem alterar nada. Repetir o cadastro/chamada não duplica (reforçado pelos índices únicos existentes).
2. Evidência: encontra por hash, mesmo tenant, `valid_until` futuro, tipo `referral_link_visit`, `business_id` NULL ou igual ao atual; senão `invalid_or_expired`.
3. Representante da evidência precisa estar **ativo** agora; senão `rep_inactive`.
4. **Autoindicação:** representante vinculado ao mesmo usuário dono da empresa → `self_referral` (sem atribuição).
5. **Atribuição confirmada existente** (outro representante) → `conflict_confirmed`; nada é criado.
6. **Reserva de lead existente** de outro representante (lead ativo/qualificado dentro da janela de 60 dias, por chave de duplicidade do CNPJ/e-mail da empresa) → **a reserva prevalece**: não cria atribuição do link; registra `reserved_by_other` para decisão do admin. Se a reserva for do **mesmo** representante, a atribuição pendente é criada já com `lead_id`.
7. **Pendente concorrente** de outro representante → o segundo **não substitui**: registra `competing_pending` para arbitragem do admin.
8. Caso limpo: cria atribuição `pending`, tipo `referral_link`, `origin_evidence_id`, `attributed_at = now()`, `valid_until = evidence.valid_until`; vincula `business_id` na evidência. **Nunca `confirmed`.**
9. Atribuição pendente **não gera comissão**: o motor do Gate 1E só considera `confirmed`. Isso fica como teste obrigatório do 1E.

## 6. Dados e migration proposta (239 — não criada)
- `commercial_referral_evidence`: `+ visit_token_hash TEXT` (índice único parcial), `+ valid_until TIMESTAMPTZ`; guard de imutabilidade estendido para ambas.
- `commercial_settings`: `+ link_auto_attribution_enabled BOOLEAN NOT NULL DEFAULT false` (terceira camada de controle, além da env e de `module_enabled`).
- Nova tabela **`commercial_attribution_issues`** (fila de falhas/conflitos e recuperação): `tenant_id, business_id, evidence_id, representative_id, kind` (`transient_error|invalid_or_expired|reserved_by_other|competing_pending|conflict_confirmed|self_referral|rep_inactive`), `status` (`open|resolved|discarded`), `detail jsonb` (sem dados pessoais), `attempts`, timestamps, `resolved_by`. RLS: leitura por permissão `attributions.read`, escrita só `service_role`.
- Função de leitura/recuperação: `commercial_retry_attribution_issue(issue_id)` (service_role) reprocessa **usando o `evidence_id` salvo**, portanto não depende do cookie, que já terá sido perdido.
- `/r/[code]` muda para gerar o token e gravar `visit_token_hash`/`valid_until`; evidências antigas (sem hash) continuam válidas para a atribuição manual.
- Rollback 239 e testes PGlite junto, no mesmo padrão das anteriores.

## 7. Falhas, logs e recuperação
- Falha técnica (ex.: banco indisponível) **não afeta o cadastro** (ver item 4). A action tenta gravar `commercial_attribution_issues` com `kind=transient_error`; se nem isso for possível, emite log estruturado (`{event:'commercial.claim_failed', evidence_id, business_id, reason}`) sem PII no log da Vercel.
- Todas as recusas de regra (itens 5.2–5.7) viram **issue aberta**, visível numa seção nova em `/comercial/atribuicoes`, onde o admin resolve (criar atribuição manual com a evidência, descartar com motivo, reprocessar).
- A origem nunca se perde: evidência imutável + `evidence_id` na issue.

## 8. Arquivos a alterar / criar
| Tipo | Arquivo | Mudança |
|---|---|---|
| Migration | `supabase/migrations/239_commercial_link_attribution.sql` (+ rollback) | colunas, setting, tabela de issues, 2 funções |
| Existente | `apps/web/src/app/r/[code]/route.ts` | token opaco + hash + `valid_until`; não trocar cookie vivo de outro representante |
| Existente (1 linha) | `apps/web/src/app/anunciar/passo-2/business-form.tsx` | chamar a action após sucesso, em `try/catch` |
| Novo | `apps/web/src/lib/commercial/referral-claim-service.ts` | server action `claimCommercialReferralAction` |
| Existente | `attributions-service.ts` + `app/comercial/atribuicoes/*` | fila de issues, resolver/reprocessar |
| Novo | testes: `scripts/test-migration-239-*.mjs`, `test/commercial-referral-claim.static.test.ts` | ver 9 |
| **Não tocados** | `createBusinessDraft`, `saveStepDataAction`, Asaas, checkout, webhooks, planos, contratos, convites | — |

## 9. Testes previstos
**Banco (PGlite):** idempotência (2 chamadas = 1 atribuição); token inexistente/forjado/expirado; replay em segunda empresa; representante inativo; autoindicação; conflito com confirmada; reserva de lead de outro representante prevalece; reserva do mesmo representante liga o `lead_id`; pendente concorrente não substitui; corrida (duas chamadas simultâneas, uma única vence); atribuição criada é sempre `pending`; guard de imutabilidade; reprocessamento via issue sem cookie; permissões (só `service_role`).
**Estáticos/Vitest:** action não importa nada de Asaas/checkout; retorna vazio com a flag desligada; todo caminho capturado por `try/catch`; cookie `httpOnly/Secure/SameSite`; `/r/` não troca cookie de outro representante; `business-form` só ganha a chamada protegida.
**Regressão:** suítes 228–238, Vitest completo (esperado: as mesmas 30 falhas), build.
**Homologação real:** no ambiente de teste do Relatório 1, fluxo `/r/…` → cadastro → atribuição pendente → confirmação, com os perfis do item 4.

## 10. Decisões que preciso de você
1. **Política de toque:** *first-touch dentro da validade* (recomendado) ou *last-touch*.
2. **Conflito com lead reservado:** a reserva de 60 dias **prevalece** sobre o link (recomendado, conforme sua condição 2).
3. **Validade da atribuição pendente:** igual à da evidência (30 dias, recomendado) ou outra.
4. **Cookie na Política de Privacidade:** confirmar com o jurídico antes de ligar.
5. **Ordem:** só implementar depois do ambiente de teste (Relatório 1, item 4) estar disponível e a 238 homologada.

## 11. Evolução futura (confirmação automatizada)
A estrutura já permite, sem retrabalho: critérios objetivos (evidência válida + sem concorrente + sem reserva + empresa com contrato assinado e primeira cobrança paga) avaliados por uma função de banco, ligada por um quarto setting (`auto_confirm_policy`), mantendo a trilha de auditoria. **Fora de escopo agora**, não implementada nem habilitada.
