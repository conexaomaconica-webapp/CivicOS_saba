# 02 — Business Model & Anniversary Subscriptions

**Módulo:** Community Framework  
**Escopo:** Modelo financeiro de cobrança por aniversário de assinatura e versionamento de preço  

---

## 1. Estado Atual

O modelo financeiro define que a cobrança de assinaturas anuais dos membros anunciantes ocorre no aniversário individual da contratação (`renewal_at = started_at + 1 year`).

---

## 2. O Que Já Existe

- **Contrato de Licenciamento Neutro (`LicensingService`)**: Interface no Core para checagem de limites e módulos ativos por tenant.
- **Cobrança Desacoplada do Billing**: O Gateway de Pagamento (Asaas, Mercado Pago, Stripe) comunica-se via webhooks transacionais sem acoplar o banco de dados da aplicação a fornecedores específicos.

---

## 3. Pontos Fortes

- **Simplicidade de Faturamento**: Elimina pro-rata de dias fracionados.
- **Versionamento de Preço (`PlanVersion`)**: Assinaturas existentes mantêm o `price_snapshot` e o `price_version_id` do momento do aceite, protegendo o cliente de reajustes involuntários.

---

## 4. Problemas Encontrados

- Ausência de campo explícito para tolerância de inadimplência (`grace_period_until`) no schema rascunhado anteriormente.
- Falta de indicador de histórico de alterações de escopo da autorização comercial.

---

## 5. Oportunidades

- **Múltiplos Meios de Pagamento**: Suporte a Pix automático, Cartão de Crédito recorrente e Boleto Anual.
- **Add-ons Monetizáveis**: Venda de pacotes adicionais de fotos, destaques regionais e slots de cupons.

---

## 6. Benchmark

- **SaaS de Gestão (RD Station, Hubspot)**: Assinatura recorrente com preço travado pelo contrato vigente e reajuste mediante renovação formal.

---

## 7. Recomendação

Adotar a entidade `subscriptions` com `price_version_id`, `price_snapshot`, `grace_period_until` e `cancel_requested_at`.

---

## 8. Impacto

- Retenção de clientes (Churn reduzido).
- Previsibilidade total de caixa para a administradora do tenant.

---

## 9. Prioridade

**P1 — Crítica**.

---

## 10. Sprint Sugerida

Sprint 1.1 (Modelagem Física do Banco e Integradores).

---

## 11. Arquivos Afetados

- `docs/community-framework/02-business-model.md`
- `docs/products/[product_id]/engineering/02-schema-database.md`

---

## 12. Dependências

Integrador neutro de pagamento no módulo de infraestrutura.

---

## 13. Riscos

Baixo.

---

## 14. Decisão Recomendada

Aprovar a especificação de faturamento por aniversário com versionamento imutável de precificação.
