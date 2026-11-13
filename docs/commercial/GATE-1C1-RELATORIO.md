# Gate 1C.1 — Atribuição automática (pendente) pelo link de indicação

**Branch:** `feature/commercial-module` · **Escopo:** somente o 1C.1. Nada foi aplicado em banco remoto, sem push, sem deploy. Gates 1D/1E **não** iniciados. Os arquivos estão no working tree, **não commitados**.
**Parecer:** Gate 1C.1 **GO para homologação em ambiente de teste** · Gate 1C/1C.1 **NO-GO para produção** (RLS com JWT real e testes concorrentes reais ainda não executados — ver 6).

## 1. O que foi entregue
| Capacidade | Como |
|---|---|
| Token seguro no cookie | `/r/REP-XXXX` gera token aleatório (128 bits); o cookie `cm_ref` guarda **só o token**; o banco guarda **só o SHA-256**. O código do representante não vai mais ao navegador |
| Evidência com validade | Cada visita grava `referral_link_visit` com `valid_until` (30 dias, `referral_validity_days`) congelado na captura |
| First-touch válido | Com token ainda válido e não usado, outro link **não troca** o cookie nem estende a validade; a visita de outro representante fica só como auditoria (uma vez) |
| Claim transacional | `commercial_claim_referral` (service_role): trava por empresa + `FOR UPDATE` na evidência; uso único; idempotente |
| Só pendente | Cria `pending`/`referral_link`, vinculada à evidência original, validade **= a da evidência**. Nunca confirma |
| Precedência | confirmada > lead qualificado com reserva vigente (outro rep.) > primeira evidência elegível > posterior/manual (fila) |
| Fila de pendências | `commercial_attribution_issues` + tela em `/comercial/atribuicoes`: reprocessar (pela evidência, sem cookie), resolver/descartar com justificativa, tudo auditado |
| Falha não bloqueia o cadastro | Uma chamada protegida após `createBusinessDraft`; erro vira log estruturado + pendência `transient_error` recuperável |
| Três chaves | env `FEATURE_COMMERCIAL_MODULE_ENABLED` + `module_enabled` + **nova** `link_auto_attribution_enabled` (default **false**) |

## 2. Arquivos
**Novos:** `supabase/migrations/239_commercial_link_attribution.sql` · `supabase/rollbacks/commercial/239_rollback.sql` · `lib/commercial/referral-claim-service.ts` · `scripts/test-migration-239-commercial-link-attribution.mjs` · `test/commercial-referral-claim.static.test.ts` · este relatório.
**Alterados (existentes):**
- `app/r/[code]/route.ts` (do Gate 1C): token opaco, hash, validade, first-touch.
- `app/anunciar/passo-2/business-form.tsx` e `page.tsx`: **a única mudança no onboarding** — uma chamada atrás de `referralClaimEnabled` (prop vinda do servidor), com `try/catch` e limite de 3 s. Com a chave desligada o formulário se comporta exatamente como antes.
- `lib/commercial/attributions-service.ts` + `app/comercial/atribuicoes/{page,attributions-client}.tsx`: fila.
- `lib/commercial/commercial-utils.ts` (+ testes): funções de token. `package.json`: script `test:commercial-link`.
**Não tocados (verificado por teste contra a `main`):** `lib/business`, `lib/onboarding`, `lib/payment`, `lib/contracts`, `app/actions`, `app/api`, Asaas, checkout, planos, webhooks. Nenhuma migration anterior foi alterada (a 239 apenas substitui a função de guard da evidência).

## 3. Decisões aprovadas → como foram aplicadas
1. **first-touch válido**: no `/r/` (cookie vivo e não usado não é trocado) e no banco (pendente de outro representante não é substituída → `competing_pending`).
2. **Reserva de 60 dias prevalece**: lead `qualified/proposal` com `reserved_until` futuro de **outro** representante → `reserved_by_other`, sem atribuição. Lead do **mesmo** representante vira vínculo (`lead_id`). Lead não qualificado ou reserva vencida não bloqueiam. A chave de duplicidade usa HMAC do CNPJ e do e-mail de login do dono (não "mesmo dispositivo").
3. **Validade 30 dias, sem extensão**: `attribution.valid_until = evidence.valid_until`; evidência vencida **no momento do cadastro** → nenhuma atribuição (`evidence_expired`), evidência preservada. Cadastro dentro da validade vale mesmo sem cookie depois (reprocesso pela evidência, avaliado em `claim_at`).
4. **Token de uso único para reivindicar, sem consumir em visita**: o token só é consumido no claim (`business_id` + `consumed_at`); revisitar o link não o consome.
5. **Nunca substitui confirmada; nunca confirma**: testado (conflito com confirmada de outro rep. e nenhum desfecho automático gera `confirmed`).
6. **Cookie/LGPD**: tecnicamente pronto; **ativação pública condicionada à revisão jurídica** (finalidade, prazo de 30 dias, dados associados: evidência com `referer` truncado, sem IP/UA).

## 4. Pontos que exigem sua atenção (desvios e escolhas minhas)
- **Correção de desenho descoberta nos testes:** o guard de imutabilidade da evidência (229) impediria apagar qualquer empresa com evidência vinculada (o `ON DELETE SET NULL` da FK era barrado). A 239 permite que `business_id` volte a NULL **apenas** pela exclusão da empresa e adiciona o carimbo `consumed_at` (imutável) para que **apagar a empresa não libere o token** (testado). Trocar por *outra* empresa segue proibido.
- **Janela de recuperação de 7 dias (decisão sua):** se a pendência é reprocessada pela equipe **depois** de a evidência ter vencido, mas a evidência era válida no cadastro, a atribuição pendente recebe uma janela curta (7 dias, nota "Recuperação tardia") para a equipe decidir — caso contrário nasceria já expirada. É uma exceção à regra "sem extensão", só por ação da equipe e auditada. **Alternativa mais estrita:** recusar e exigir atribuição manual. Diga se prefere.
- **Evidência vinculada em qualquer desfecho** (inclusive conflito): o token fica consumido pela empresa, evitando reuso em outra.
- A fila é lida/escrita pelo serviço com `service_role` **após** `tryCommercialPermission('attributions.manage')`; não há política para `authenticated` na nova tabela (menor superfície).
- O fluxo de **convite de cadastro** (`signup-invite-service`) não usa o cookie; segue com a evidência `signup_invite`. O caminho legado `saveStepDataAction` passo 2 também não chama o claim (o formulário atual não o usa).

## 5. Testes executados
| Suíte | Resultado |
|---|---|
| `pnpm test:commercial-link` (239, PostgreSQL real/PGlite) | **33 / 33** |
| `pnpm test:commercial-leads` (238, regressão) | **31 / 31** |
| `pnpm test:commercial-authz` (234–237, regressão) | **30 / 30** |
| `pnpm test:commercial-db` (228–233, regressão) | **71 / 71** |
| Vitest do módulo (utilitários, regras, estáticos 1A/1B/1C/1C.1) | **49 / 49** |
| `pnpm --filter web typecheck` | passa |
| Vitest completo do web | **NÃO CONCLUÍDO — divergência aberta.** Linha de base e a branch no Gate 1C: 30 falhas idênticas. Após o 1C.1, a suíte completa deu **67 falhas** (37 novas, todas `Cannot read properties of null (reading 'useState')`/similares em testes de componentes React sem relação com o módulo). Os 8 arquivos afetados **passam quando rodados em subconjunto ou isolados**, e a falha persiste sem o meu arquivo de teste novo. Em investigação (comparando o commit `2b6cabe` limpo no mesmo ambiente, para separar ambiente de alteração). **Não declarar o 1C.1 sem regressão até isso fechar.** |
| `pnpm --filter web build` | passa (rotas `/comercial/*`, `/representante/*` e `/r/[code]` compilam) |

**Cobertura da 239:** permissões e RLS da fila; imutabilidade; formato/unicidade do hash; chaves desligadas = nenhum efeito; caso limpo; idempotência (3 chamadas = 1 atribuição); token forjado; isolamento por tenant; replay em segunda empresa; replay após apagar a empresa; evidência expirada; cadastro válido sem cookie; recuperação tardia; expiração posterior; representante suspenso → reativado → reprocesso; autoindicação; confirmada (outro e mesmo rep.); reserva (vigente, vencida, não qualificada, mesmo rep.); pendente concorrente; contagem de tentativas; nenhum `confirmed` automático; decisão com justificativa; evidência preservada (FK); rollback (aplica, recusa com dados, reaplica).

## 6. Homologação do Gate 1C em staging — NÃO realizada
- Você informou que **não criará staging** no projeto oficial; a autorização pedia o projeto separado. **Não criei projeto nem branch Supabase** (nenhum recurso pago) e não toquei no projeto de produção. Docker/Supabase CLI continuam indisponíveis na máquina.
- Portanto **continuam pendentes**: RLS com JWT real (representante, anunciante, operador, master, sem permissão), funções privilegiadas via PostgREST, `storage.objects` real, roteiro funcional ponta a ponta, e concorrência com sessões simultâneas (no PGlite, conexão única: a trava foi validada em sequência, não em paralelo real).
- Caminhos para destravar (escolha sua): (a) projeto Supabase separado, gratuito, só de teste; (b) Docker Desktop + Supabase CLI local (eu preparo os scripts); (c) branch do Supabase (custo por uso).

## 7. Riscos pendentes
1. **RLS real e concorrência real não validadas** (item 6) — risco principal.
2. **Inflação de evidências em `/r/`** (endpoint público, sem limitação de taxa): quem repete a visita sem cookie gera uma linha por visita (já era assim; agora cada uma tem token). Recomendo limitação de taxa (edge/Vercel firewall) **antes** de ligar publicamente.
3. **Revisão jurídica** do cookie e da Política de Privacidade (condição de ativação).
4. First-touch é **por navegador**: dois dispositivos do mesmo anunciante podem gerar duas evidências; o banco trata o conflito com pendência para arbitragem, sem inferir identidade por dispositivo.
5. O preview da branch comercial não traz o diagnóstico do Firebase (está só na `main`).
6. 30 falhas pré-existentes do Vitest seguem abertas (iguais à linha de base).
7. Paridade multiplataforma (AGENTS §8): `/r/` e `/anunciar` são web; `apps/mobile` não contém esse fluxo (verificado) e não foi alterado.

## 8. Para ativar (somente em ambiente de teste, nunca em produção agora)
1. Aplicar 228–239 em ordem no ambiente de teste.
2. `FEATURE_COMMERCIAL_MODULE_ENABLED=true` no deploy de teste.
3. `UPDATE commercial_settings SET module_enabled = true, link_auto_attribution_enabled = true WHERE tenant_id = '<tenant de teste>';`
4. Roteiro: `/r/REP-XXXX` → cadastro até o passo 2 → conferir a atribuição **pendente** em `/comercial/atribuicoes`; repetir com outro link (conflito → pendência); com lead qualificado de outro representante (reserva prevalece).
5. Rollback: desligar `link_auto_attribution_enabled` (efeito imediato, sem deploy); a 239 só reverte se não houver tokens/pendências (recusa para não perder origem).

## 9. Parecer
| Item | Parecer |
|---|---|
| Implementação e testes locais do 1C.1 | **GO** |
| Aplicar 239 em ambiente de teste isolado | **GO** |
| Aplicar 234–239 / ligar chaves em **produção** | **NO-GO** (RLS real, concorrência real, jurídico, limitação de taxa) |
| Gates 1D e 1E | **Não iniciados — aguardam autorização** |

Execução interrompida; aguardando nova autorização.
