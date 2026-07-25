# ADR-001 — Limites entre Plataforma e Produto

**Status:** Ratificado  
**Data:** 2026-07-25  
**Contexto:** Encerramento da Fundação (`foundation-v1.0`, commit `bdbdd34`) e início da Engenharia do Produto Conexão Maçônica.

---

## Decisão

A Conexão Maçônica será tratada como o **primeiro produto** construído sobre a plataforma CivicOS, e **não** como continuação da Fundação.

Nenhuma regra de negócio específica do domínio maçônico será inserida em `packages/core`, na infraestrutura genérica ou em plugins reutilizáveis sem justificativa arquitetural explícita e aprovação documentada.

## Regra de Classificação

Para determinar se uma funcionalidade pertence à plataforma ou ao produto, aplicar o seguinte teste:

> **"Essa funcionalidade faria sentido para uma associação médica, uma igreja, uma cooperativa ou uma câmara de comércio?"**

- **SIM** → Pertence à plataforma (plugin genérico ou capacidade do core).
- **NÃO** → Pertence exclusivamente ao produto.

## Exemplos de Classificação

### Pertence ao Produto (Conexão Maçônica)

| Conceito | Justificativa |
|---|---|
| Potência maçônica | Conceito exclusivo do domínio maçônico |
| Loja maçônica | Entidade organizacional específica |
| Grau maçônico | Hierarquia exclusiva da Maçonaria |
| Rito | Classificação maçônica |
| Vínculo maçônico | Relação membro–loja exclusiva |
| Plano Fundador | Regra comercial do produto |
| Selo de Irmão Verificado | Identidade visual do produto |
| Categorias maçônicas | Taxonomia exclusiva |

### Pertence à Plataforma (Plugin Genérico ou Core)

| Conceito | Justificativa |
|---|---|
| Sistema de cupons | Qualquer comunidade pode usar |
| Eventos e agenda | Reutilizável em qualquer nicho |
| Artigos e conteúdo | Funcionalidade genérica |
| Notificações | Infraestrutura transversal |
| CRM | Gestão de contatos genérica |
| Pagamentos e assinaturas | Infraestrutura financeira |
| Analytics | Observabilidade genérica |
| Geolocalização e mapas | Funcionalidade transversal |
| Busca por IA | Capacidade genérica reutilizável |

## Promoção de Funcionalidade

Caso uma funcionalidade inicialmente classificada como produto demonstre potencial de reutilização comprovado, ela poderá ser promovida à plataforma mediante:

1. Registro de uma nova ADR documentando a justificativa;
2. Refatoração para remover dependências do domínio maçônico;
3. Validação de que o contrato do plugin é genérico o suficiente;
4. Aprovação explícita antes da migração.

## Consequências

- `packages/core` permanece congelado para regras de negócio.
- `plugins/` recebe apenas funcionalidades genéricas e reutilizáveis.
- `apps/web` e `docs/products/conexao-maconica/` concentram toda a lógica específica do produto.
- A Fundação (`foundation-v1.0`) não será alterada sem justificativa técnica comprovada.
