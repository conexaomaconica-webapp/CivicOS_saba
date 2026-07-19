# 24. AUTOMATION DSL SPEC

O CivicOS implementa um modelo estrito e seguro de avaliação de condições (Ast Evaluator) para a Execution Platform (Workflow e Policy).

## 1. O Contrato Oficial: AST JSON

O formato textual (Visual Rule Builder, SQL-like, JS-like) **não é o contrato de execução**. Qualquer sintaxe deverá compilar, build time ou no frontend, para um AST JSON estrutural puro. O Runtime nunca interpreta texto ou invoca `eval()`.

Exemplo:
```json
{
  "dslVersion": "1.0",
  "root": {
    "type": "logical",
    "operator": "AND",
    "nodes": [
      {
        "type": "comparison",
        "field": "payload.amount",
        "operator": "GT",
        "value": 100
      }
    ]
  }
}
```

## 2. Operadores Limitados (Built-in)

Na V1, não há extensibilidade de operadores lógicos ou booleanos.
Permitidos:
- Comparação: `EQ`, `NE`, `GT`, `GTE`, `LT`, `LTE`
- Coleções: `IN`, `NOT_IN`, `CONTAINS`
- Existência: `EXISTS`, `NOT_EXISTS`
- Lógicos: `AND`, `OR`, `NOT`

## 3. Segurança (Fail-Fast)

1. **Sem Injeção Lógica**: Funções ou Scripts JS não são interpretados.
2. **Safe Path Resolver**: Bloqueio de caminhos maliciosos (`__proto__`, `prototype`, `constructor`).
3. **Restrições Estruturais**: Limite de Nós (maxNodes) e Profundidade (maxDepth) e tempo (maxExecutionMs).

## 4. Pipeline de Avaliação

O Fluxo do AST é:
`AST Validator` (Limites, Schema) -> `AST Normalizer` (Castings, Uppercase) -> `AST Evaluator` (Short-circuit, Função Pura, Determinística).
