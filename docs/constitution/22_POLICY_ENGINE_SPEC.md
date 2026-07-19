# 22. POLICY ENGINE SPEC

O Policy Engine não é apenas um "verificador de permissões", mas o **motor de decisão governamental** da plataforma.

A autorização no CivicOS obedece estritamente a seguinte pirâmide de decisão "Fail Fast":

```text
Capability               (O recurso existe para este tenant?)
      │
      ▼
Permission               (Este ator tem permissão formal para tentar utilizá-lo?)
      │
      ▼
EvaluationContextBuilder (Resolve todas as dependências do contexto: quotas, licenças)
      │
      ▼
PolicyPipeline           (Executa as Regras Puras e Assíncronas injetando o contexto imutável)
      │
      ▼
DecisionAggregator       (Consolida os Resultados)
      │
      ▼
Decision                 (ALLOW / DENY / ERROR)
```

## 1. Regras (Rules), Categorias e Políticas (Policies)

Uma `Policy` (ex: `company.delete`) não contém código; é um agregado lógico de `Rule`s reutilizáveis gerenciadas pelo `RuleRegistry`. 
Plugins registram a prioridade e as regras que compõem uma política.

As Regras são puras perante o contexto e divididas em categorias para facilitar Diagnósticos:
- **`PureRule`**: Avalia o estado imutável sem realizar I/O.
- **`AsyncRule`**: Interage com o mundo externo (embora o ideal seja que o `EvaluationContextBuilder` já tenha pre-buscado a informação).

## 2. PolicyDecision vs RuleDecision

- **`RuleDecision`**: Objeto minificado retornado pela Regra, contendo apenas seu voto (`outcome`: `ALLOW`, `DENY`, `ABSTAIN`, `ERROR`) e o motivo.
- **`PolicyDecision`**: Objeto rico final gerado pelo Aggregator, agregando `durationMs`, tracking e Warnings coletados.

O estado `ERROR` garante que problemas de infraestrutura não silenciem a decisão como um falso DENY.

## 3. Comportamento e Resolução de Conflito

- **Imutabilidade**: O `PolicyContext` que transita pelo pipeline é garantido via `Object.freeze()`. Nenhuma Regra pode ter side-effects no contexto.
- **Resolução de Conflitos (Deny Overrides estendido):** 
  `ERROR > DENY > ALLOW > ABSTAIN`
  - Um `ERROR` suplanta tudo (falha catastrófica).
  - Um `DENY` vence qualquer `ALLOW`.
  - Se ninguém disser `DENY` ou `ERROR`, e ao menos um disser `ALLOW`, o final é `ALLOW`.
- **Fail Fast:** O `PolicyPipeline` short-circuits antes da policy se `Capability` ou `Permission` falharem, economizando ciclos valiosos.
