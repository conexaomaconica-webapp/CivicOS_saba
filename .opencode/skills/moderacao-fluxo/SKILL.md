---
name: moderacao-fluxo
description: Use when implementing or reviewing the administrative moderation and moderation of masonic links in the Conexão Maçônica product: ADM-002 (company queue), ADM-003 (masonic link moderation), ADM-003-DET (detail/history), ADM-004 (contests), ADM-020 (audit trail), the 10-state link lifecycle, anti-self-approval, and business:moderate / masonic_link:* permissions. Trigger on keywords like moderação, fila de moderação, vínculo maçônico, aprovar, rejeitar, suspender, revogar, contestação, anti-self-approval, approv, reject, under_review, active, moderador, business:moderate, masonic_link.
---

# Moderação Administrativa e de Vínculos Maçônicos — Conexão Maçônica

Regras para implementar/revisar o fluxo de moderação do produto, incluindo a
"torre de controle" (epopeia `AP-004`) e o ciclo de vida do vínculo maçônico
(epopeia de extensão maçônica). O vínculo maçônico é a espinha dorsal do selo
de confiança do produto — a moderação é o que torna aquele selo crível.

Fonte documental: Docs 00 (especificação, seção de vínculos), 02 (schema),
03 (matriz RBAC), 05 (jornada J4), 07 (CRIT-VSC-009/010/011) e 08 (AP-004).

## 1. Ciclo de vida do vínculo maçônico (10 estados)

`draft ──> pending_verification ──> under_review ──┬──> approved ──> active`
                                                  ├──> correction_requested
                                                  ├──> rejected
                                                  ├──> suspended
                                                  ├──> expired
                                                  └──> revoked

Regras críticas (Doc 00 / Doc 02):
- **`approved` ≠ `active`**: `active` exige `approved` + prazo de validade vigente
  (`valid_until > now()`) + autorização da empresa + **consentimento de publicação
  ativo** (erro comum é confundir os dois).
- Apenas vínculos `active` têm elegibilidade de exibição no guia.
- Máximo de **1 vínculo principal ativo por empresa por tenant**; expiração do
  principal desativa a flag `is_primary` e notifica o anunciante — **nunca**
  promover outro vínculo silenciosamente.
- Toda declaração por representante/familiar exige autorização formal da empresa
  (`business_authorization`) com escopos explícitos.

## 2. Estados de publicação / análise

- `businesses.verification_status`: `unverified → pending_review → approved → correction_requested → rejected`
- `businesses.publication_status`: `draft → under_review → published → unpublished → suspended`
- `businesses.subscription_status`: inclui `pending_documents`, `under_review`, `active`, `suspended`, `terminated`
- A **visibilidade pública no guia** é determinada pelo conjunto de gates, incluindo
  o `moderation_gate` (sem sanção em `moderation_holds`) e o `verification_gate`
  (vínculo/credenciais válidas).

## 3. Critérios funcionais (CRIT-VSC-009/010/011)

- **CRIT-VSC-009 (Análise e solicitação de correções)**: moderador analisa e pode
  solicitar ajustes; eventos canônicos de correções registrados. `directory.business.correction_requested.v1`.
- **CRIT-VSC-010 (Aprovação e publicação oficial)**: aprovação com ator moderador;
  evento `directory.business.published.v1`; exige permissão `business:moderate`.
- **CRIT-VSC-011 (Rejeição fundamentada)**: toda rejeição exige justificativa;
  evento `directory.business.rejected.v1`; ator pode se defender dentro do fluxo
  de contestação (ADM-004 no MVP 1B).
- As três operações geram trilha de auditoria imutável (`CRIT-TRN-015`) com ator,
  ação, recurso, antes/depois e timestamp.

## 4. RBAC e Anti-Self-Approval (crítico de segurança)

- Moderação usa `business:moderate` (Tenant-Scoped; moderador/admin; NUNCA o
  owner declarante) e `masonic_link:*` (declare/submit pelo usuário;
  review/approve/reject/suspend pelo moderador/admin; revoke pelo tenant admin).
- **Anti-Self-Approval**: estado `approved`/`verified` exige `requested_by !=
  approved_by` — validação RLS/banco obrigatória (TC-RBAC-08 nega autoaprovação de
  selo da própria empresa).
- **Sessão elevada auditada** para acesso a dados confidenciais (ex: leads): exige
  confirmação de papel global, aprovação por segundo operador (`approved_by !=
  user_id`), validade e escopo — nunca bypass.
- Separação de deveres (Doc 03/05): no MVP 1A, autoridade de TI institucional não
  é concedida por vínculo maçônico (`organization_people` não vira `tenant_admin`).

## 5. Eventos EDA (nomenclatura canônica — Doc 06)

| Momento | Evento |
|---|---|
| Solicitação de correção | `directory.business.correction_requested.v1` |
| Publicação aprovada | `directory.business.published.v1` |
| Rejeição fundamentada | `directory.business.rejected.v1` |
| Pagamento aprovado (pré-requisito) | `billing.payment.approved.v1` |
| Contrato assinado | `legal.contract.signed.v1` |

Eventos vão para Outbox (`outbox_events`) e consomem via Worker idempotente
(`INF-003`); consistência com nomes e versionamento do Doc 06 (ver também skill
`produto-finalizacao`).

## 6. Competição / contestações (ADM-004 — MVP 1B)

- Contestação NÃO suspende automaticamente (`abertura ──> notificação ──>
  prazo de defesa 7 dias ──> análise ──> decisão ──> recurso opcional`).
- Suspensão antes da decisão exige **medida cautelar fundamentada pelo
  administrador do tenant** — proteção anticoncorrencial contra ataques maliciosos.
- Permissão `masonic_link:contest:review`.

## 7. Trilha de auditoria (CRIT-TRN-015)

- Registrar imutavelmente: tenant, ator, ação, recurso, valores antes/novos,
  marca temporal — para empresas, contratos, faturas, permissões, selos, vínculos.
- Preservar histórico mesmo com apagamento de atores (`ON DELETE SET NULL`); nunca
  cascata que destrua registros auditáveis (coordenar com skill `lgpd-revisao`).

## 8. Checklist de implementação (ADM-002 / ADM-003 / ADM-003-DET)

- [ ] Fila de moderação com filtros por loja/potência/oriente (J4)
- [ ] Transições de estado validam permissão + anti-self-approval no banco
- [ ] Aprovação exige consentimento de publicação ativo p/ virar `active`
- [ ] Rejeição/correção sempre com justificativa; detalhe/histórico (`ADM-003-DET`)
- [ ] Eventos EDA canônicos no Outbox; auditoria imutável em cada ação
- [ ] Mudanças em endereço/nome fantasia re-entram na fila de moderação
- [ ] Vínculo principal: regra de 1 ativo; sem promoção silenciosa ao expirar
- [ ] Homologação visual no Design System v1.0 (DoD)