# Módulo Comercial Nacional — Gate 1C: Representantes, Leads, Links e Atribuições

**Branch:** `feature/commercial-module` · **Escopo:** somente Gate 1C. Nada foi aplicado em banco remoto. O Gate 1D (eventos financeiros/estorno) **não** foi iniciado.
**Parecer:** **GO parcial** — homologação local concluída; **NO-GO** para aplicar em produção até os testes de RLS reais (pgTAP/Docker) e a revisão do plano de aplicação (seção 8).

---

## 1. O que foi entregue

| Capacidade | Como |
|---|---|
| Cadastro de representante (PF/PJ) pelo admin comercial | `/comercial/representantes` — CPF/CNPJ validados; documento e PIX **cifrados**; hash para duplicidade; código `REP-XXXXXXXX` |
| Vínculo ao **usuário existente** | pelo e-mail do perfil (na criação) ou, para convidados, **no primeiro acesso** a `/representante` com o e-mail **verificado** |
| Ativação / suspensão / desligamento | exige contrato aceito + documento; motivo obrigatório; **créditos nunca são tocados** pelo status |
| Permissões comerciais pelo admin | `/comercial/acessos` (concessão com validade opcional e revogação), sem conceder papel de admin |
| Indicações (leads) do representante | `/representante/leads`: cadastro, atividades, qualificação com **reserva de 60 dias** (configurável) |
| Equipe: leads, conversão, expiração | `/comercial/leads`: **converter em anunciante preservando a origem**, encerrar, processar expirações |
| Atribuições | `/comercial/atribuicoes`: manual pendente (validade 30 dias, justificativa), confirmar sem conflito, revogar |
| Links de indicação | `/r/REP-XXXXXXXX` registra a evidência e define cookie; redireciona ao funil existente |
| Atalho no admin | item "Representantes e Comissões" (somente com a chave ligada) |

### Arquivos
- **Banco:** `supabase/migrations/238_commercial_leads_operations.sql` (+ `supabase/rollbacks/commercial/238_rollback.sql`).
- **Serviços:** `apps/web/src/lib/commercial/{representatives,access-grants,leads,attributions}-service.ts`, `commercial-auth.ts` (staff + vínculo do convite), `commercial-utils.ts`, `commercial-secrets.ts`, `commercial-service-base.ts`.
- **Telas:** `apps/web/src/app/comercial/**`, `app/representante/leads/**`, `app/r/[code]/route.ts`.
- **Alterações em código existente:** `middleware.ts` (rotas `/comercial` e `/representante`), `noindex-paths.ts`, `AdminSidebar.tsx`/`AdminShell.tsx`/`admin/layout.tsx` (atalho condicional), `package.json` (scripts). **Nada de Asaas, checkout, onboarding, planos ou pagamentos.**

## 2. Regras garantidas no banco (migration 238)
Funções `SECURITY DEFINER`, `search_path` fixo, executáveis **somente por `service_role`**; cada ação de serviço autoriza antes de chamá-las.
- `commercial_register_lead`: lead + **evidência de origem** + atividade inicial numa transação; representante precisa estar **ativo**; duplicidade ativa barrada pelo índice único (nada é gravado se falhar).
- `commercial_log_lead_activity` / `commercial_qualify_lead`: qualificar **exige atividade real de contato**; reserva = `lead_reservation_days` do tenant (60 por padrão); nova atividade renova.
- `commercial_convert_lead`: lock do lead, valida representante ativo, empresa do mesmo tenant e **ausência de atribuição confirmada**; reaproveita a **evidência original** (ou cria `lead_conversion`) e vincula à empresa; cria a atribuição **confirmada**; tudo atômico.
- `commercial_confirm_attribution`: pendente → confirmada sem conflito, validade e representante ativo.
- `commercial_expire_stale`: expira leads sem atividade dentro da janela e atribuições pendentes vencidas (libera a chave de duplicidade).

## 3. Segurança e decisões aprovadas
- **Administrador não entra automaticamente:** serviços usam `has_commercial_permission` (banco). A área `/comercial` fica **fora de `/admin`**, então quem só tem permissão comercial não precisa de papel de admin e quem é admin sem permissão **não acessa** (404). Exceção: `master`.
- **Suspenso/desligado** mantém leitura do histórico financeiro; não cadastra indicações nem converte (barrado no banco).
- **Dados sensíveis:** documento e PIX cifrados (AES-256-GCM, mesma cifra do projeto); lista de representantes nunca devolve hash/cifrados; chave de duplicidade de leads é HMAC (não expõe CPF/CNPJ/e-mail).
- **Chave de serviço** só no servidor, depois da autorização; telas cliente não a importam (testado).
- **Vínculo do convite:** exige e-mail **verificado** igual ao do convite e módulo ligado; vincula, mas **não ativa**.
- **Link de indicação:** 404 sem módulo; sempre redireciona (não permite enumerar códigos); só representante ativo gera evidência/cookie; não lê nem altera o onboarding.
- Auditoria em `admin_audit_logs` (cadastro, status, permissões, conversão, atribuições).

## 4. Como o cadastro funciona na prática
1. `master` (ou quem receber `settings.manage`) concede permissões em **Comercial → Acessos**.
2. Em **Representantes → Novo representante**, o e-mail define o vínculo: se já existe usuário, fica "em análise" e vinculado; se não, "convidado" e vincula no primeiro acesso.
3. A equipe **ativa** (informa a versão do contrato aceito) e o representante passa a cadastrar indicações.
4. A equipe converte a indicação em anunciante informando o **ID ou slug** do anúncio criado: atribuição confirmada com a origem preservada.

## 5. Testes executados
| Suíte | Resultado |
|---|---|
| `pnpm test:commercial-leads` (migration 238, PostgreSQL real) | **31 / 31** |
| `pnpm test:commercial-authz` (Gate 1B, regressão) | **30 / 30** |
| `pnpm test:commercial-db` (Gate 1A, regressão) | **71 / 71** |
| Vitest do módulo (utilitários, regras, estáticos 1A/1B/1C) | **42 / 42** |
| `pnpm --filter web typecheck` / `build` | passam; 9 rotas novas compilam |
| Vitest completo do web | as **mesmas 30 falhas pré-existentes** (11 arquivos), nenhuma nova |

Cobertura da 238: permissões das funções; atividade e qualificação (exige contato; 60 dias; renovação; prazo por tenant); conversão (origem preservada, conflito sem efeito colateral, representante inativo, tenant cruzado, lead sem representante); confirmação (conflito, vencida, não pendente, representante suspenso); expiração; cadastro atômico (duplicidade não grava nada); rollback.

## 6. Roteiro de teste manual (após aplicar a 238, ligar a chave e `module_enabled`)
1. Com um usuário `master`: abrir **Comercial** no menu do admin → **Acessos** → conceder `representatives.manage`, `leads.manage`, `attributions.manage` a um usuário de teste.
2. Esse usuário (sem papel de admin) abre `/comercial` (**vê só o que o grant cobre**); um admin **sem** grant abre `/comercial` (**404**).
3. **Representantes → Novo** com o e-mail de um usuário existente (**vinculado, em análise**) e com e-mail inexistente (**convidado**).
4. **Ativar** (informar versão do contrato). Entrar como o representante em `/representante` (**vê Indicações**). O convidado, ao entrar/criar conta com o e-mail verificado, passa a ver a área.
5. Representante: **Nova indicação** (CPF/CNPJ ou e-mail) → **Registrar atividade** → **Qualificar** (sem atividade antes: recusa). Outro representante indicando o **mesmo CPF/CNPJ/e-mail**: recusa "já em atendimento".
6. Equipe: **Converter em anunciante** com o ID/slug de uma empresa de teste → atribuição **confirmada**; tentar converter outro lead para a **mesma** empresa: recusa por conflito.
7. **Atribuições → Nova manual**, confirmar, tentar confirmar outra para a mesma empresa (recusa), revogar com motivo.
8. Abrir `/r/REP-XXXXXXXX` (código do representante ativo): vai ao cadastro; conferir 1 evidência `referral_link_visit` por navegador.
9. **Suspender** o representante: some "Indicações"; `/representante/comissoes` continua abrindo; novas indicações/conversões são recusadas.
10. Desligar a chave na Vercel: `/comercial`, `/representante` e `/r/...` respondem **404**.

## 7. Impacto sobre o sistema existente
- Funcional: apenas rotas novas e o atalho condicional no menu do admin. Com a chave desligada, nada muda.
- Banco: 1 migration nova (6 funções + ampliação do CHECK de tipos de evidência); nenhuma tabela existente alterada.
- **Paridade multiplataforma (AGENTS §8):** `/comercial`, `/representante` e `/r/` são portais web; o app Android/iOS não possui área equivalente e nada foi alterado em `apps/mobile`.

## 8. Limitações, riscos e GO/NO-GO
1. **Link de indicação ainda não atribui sozinho:** o funil de cadastro atual **não lê** o cookie `cm_ref` (integrar exige tocar o onboarding, que está fora do escopo e depende de aprovação específica). Hoje a evidência fica registrada e a equipe cria a atribuição manual (com a evidência como prova) ou converte um lead.
2. **Convite por e-mail não é enviado:** o representante convidado só é vinculado quando entra/cria conta com o e-mail verificado; a tela orienta o admin a avisá-lo. Envio automático fica como evolução.
3. **Docker/pgTAP indisponíveis:** a RLS/JWT reais não foram testadas; PGlite valida as regras do banco, não o Supabase.
4. Conversão pede **ID ou slug** da empresa (sem busca por nome) para evitar ambiguidade.
5. Comissões, repasses, estornos e a captura financeira continuam nos Gates 1D/1E; nenhum valor é calculado ainda.
6. Ao ligar o módulo, **empresas com atribuição/lead** não podem ser apagadas (`ON DELETE RESTRICT`, proteção financeira).

| Decisão | Parecer |
|---|---|
| Revisão técnica de serviços, telas e migration 238 | **GO** |
| Homologação local (PGlite + estático + build) | **GO — concluída** |
| Aplicação da 238 em produção | **NO-GO** até pgTAP/RLS real (ou ambiente de teste) e aprovação do plano de aplicação |
| Gate 1D | **Aguardando aprovação expressa** |

### Como reproduzir
```bash
pnpm test:commercial-leads && pnpm test:commercial-authz && pnpm test:commercial-db
pnpm --filter web exec vitest run test/commercial-utils.test.ts test/commercial-services.static.test.ts test/commercial-authz.static.test.ts test/commercial-access-rules.test.ts test/commercial-migrations.static.test.ts
pnpm --filter web typecheck && pnpm --filter web build
```
