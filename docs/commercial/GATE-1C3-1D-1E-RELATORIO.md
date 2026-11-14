# Gates 1C.3, 1D e 1E — Relatório

Branch: `feature/commercial-gates-1c3-1e` (empilhada sobre `feature/commercial-1c2`; nada mesclado na `main`).
Migrations novas: **242** (1D) e **243** (1E), além das 240/241 da 1C.2. Todas aditivas, com rollback que recusa se já houver dados.
Nada foi aplicado em produção. Nenhuma regra de comissão, taxa, plano ou categoria é semeada: **sem regra ativa e aprovada, ninguém recebe comissão**.

## 1C.3 — Material de vendas
`/representante/material`: link de indicação com botão de copiar, passo a passo e planos vigentes lidos da fonte oficial (`plan_payment_rules` via `fetchTenantPlans`). Nada digitado à mão. O anunciante conclui cadastro, aceite e pagamento sozinho.
Decisão: **não** foi criado link com dados pré-preenchidos (colocaria dados pessoais na URL). O vínculo já funciona pela reserva do lead (CNPJ/e-mail) combinada ao link de indicação.

## 1D — Estornos e chargebacks do Asaas
**Lacuna encontrada:** o webhook só auditava estorno/chargeback; a fatura não mudava, então o trigger de captura (231) nunca enxergava a reversão.
- Migration 242: `commercial_record_provider_reversal` registra o estorno/chargeback como evento financeiro (`provider_webhook`), idempotente pela chave do evento, limitado ao valor líquido recebido, com estorno parcial acumulado e disputa vencida (`chargeback_reversal`). Venda sem comissão original gera evento `skipped`.
- `lib/commercial/provider-reversal-capture.ts`: ponte chamada **uma vez** no webhook, melhor esforço, com limite de 4 s, sem efeito com o módulo desligado, nunca lança nem altera a resposta/fluxo. Estorno parcial sem valor legível NÃO vira estorno total: vai para `commercial_capture_failures`.
- Única alteração no arquivo do Asaas: 1 import + 1 chamada (teste estático garante que nada mais mudou).
- **Validar no sandbox do Asaas antes de ligar:** `PAYMENT_AWAITING_CHARGEBACK_REVERSAL` foi tratado como disputa **vencida** (valor devolvido). Confirmar o significado exato.

## 1E — Comissões, repasses e fechamento (migration 243)
- **Categorias de representante** e regras por categoria (precedência: representante > categoria > plano padrão; plano específico antes de "qualquer plano"; prioridade).
- **Motor** `commercial_process_financial_event`: comissão só de pagamento recebido + atribuição **confirmada** + representante **ativo** + regra ativa/aprovada. Valores em centavos, truncamento (floor), teto e mínimo. 1ª venda = `initial`, seguintes = `recurring` (renovação por regra `renewal` ainda **não** é aplicada: falta sinalizar renovação na fatura).
- **Estornos:** lançamento `reversal` proporcional, sem perder centavos (o último estorno fecha o saldo exato). Comissão já **paga** vira **clawback** e é abatida do próximo repasse. Estorno após criar repasse não pago **cancela** o repasse.
- **Carência/liberação:** `commercial_release_due` (idempotente).
- **Repasse:** rascunho → aprovado por **outra pessoa** (master pode aprovar o próprio) → pago com **comprovante** (PDF/imagem até 10 MB, bucket privado, SHA-256). O sistema **não envia dinheiro**; o PIX é feito fora.
- **Fechamento de período:** congela totais; recusa com eventos pendentes, período futuro ou sobreposição.
- **Revisão humana** de eventos ambíguos (redução de valor sem estorno do provedor), com justificativa.
- **Telas (staff):** `/comercial/regras`, `/comercial/comissoes`, `/comercial/repasses`; categoria na tela de Representantes. **Representante:** vê a situação de cada comissão (carência, liberada, paga, estornada).
- Tudo auditado; funções/tabelas só para `service_role`; a aplicação nunca escreve no livro-razão, só chama as funções.

## Validação
| Verificação | Resultado |
|---|---|
| PGlite 228–233 (`test:commercial-db`) | 71/71 |
| PGlite autorização (`test:commercial-authz`) | 30/30 |
| PGlite leads (`test:commercial-leads`) | 31/31 |
| PGlite link (239) | 33/33 |
| PGlite acesso direto (240) | 9/9 |
| PGlite contrato (241) | 17/17 |
| PGlite estornos (242) | 15/15 |
| PGlite motor de comissões (243) | 33/33 |
| Vitest do módulo (13 arquivos) | 104/104 |
| `pnpm --filter web typecheck` | sem erros |

**Limites:** PGlite é uma conexão única (concorrência real não testada) e não exercita RLS/JWT reais nem o Storage do Supabase; o envio do comprovante, o webhook real do Asaas e as telas não foram executados contra serviços reais.

## O que NÃO está pronto
- **Regras de comissão:** precisam ser cadastradas e aprovadas pela equipe (nenhum percentual foi definido por mim).
- **Renovação** (`renewal`) e **ajuste manual** de saldo (correção fora de estorno) ainda não existem.
- **Estorno de repasse já pago** (dinheiro devolvido pelo representante) é tratado só como débito futuro (clawback); não há tela para "estornar um repasse pago".
- **Automação:** processar eventos e liberar carência hoje são botões. Um agendamento (cron) é recomendado depois da homologação.
- **Homologação real** (RLS com JWT, Storage, Asaas sandbox) e as pendências antigas: revisão jurídica do cookie e limite de requisições no `/r/`.

## Roteiro de homologação sugerido
1. Aplicar 240, 241, 242 e 243 (nesta ordem; conferir Project Ref). 2. Publicar o contrato. 3. Criar categoria e regra, aprovar com outra conta. 4. Representante fictício + empresa + atribuição confirmada. 5. Pagamento de teste → "Processar eventos" → conferir crédito e carência. 6. Liberar, criar repasse, aprovar (outra conta), pagar com comprovante. 7. Estorno no sandbox do Asaas (total, parcial, chargeback) → conferir reversão e clawback. 8. Fechar o período.
