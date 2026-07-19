# 23. DIAGNOSTICS PLATFORM SPEC

O CivicOS possui uma separação clara entre **Health** (Estado Operacional) e **Diagnostics** (Introspecção Profunda).

## 1. Health vs Diagnostics

- **Health:** Rápido (<10ms), determinístico, sem I/O pesado. Utilizado por orquestradores (Kubernetes, Load Balancers). Retorna apenas um status.
- **Diagnostics:** Pode levar centenas de ms, faz I/O e computação profunda, agregando informações detalhadas voltadas à operação e observabilidade humana ou coletores passivos.

## 2. Health Status

O sistema de Health possui 4 estados oficiais:
1. `UP`: Totalmente operacional.
2. `DEGRADED`: A plataforma funciona, mas há perda parcial de capacidade (ex: Cache expirado, Plugin falhou). O sistema **não cai**.
3. `DOWN`: Falha estrutural (ex: Registry corrompido, Container DI inválido). O Runtime não consegue operar.
4. `UNKNOWN`: Estado transiente de boot ou indeterminado.

## 3. Score por Severidade

Em vez de porcentagens fixas arbitrárias, a saúde arquitetural é medida através de um score baseado em severidade de issues detectadas pelos Providers.

- **Pontuação Base:** 100
- **CRITICAL:** -30 pontos (ex: falhas estruturais, boot errors).
- **MAJOR:** -10 pontos (ex: dependências circulares, registry mismatch).
- **MINOR:** -3 pontos (ex: policies lentas).
- **INFO:** 0 pontos (apenas informacional).

O limite inferior (floor) é 0.

## 4. Timeline e Recommendations

Todo relatório diagnóstico unificado (`DiagnosticsSnapshot`) contém:
- Uma **Timeline** dos eventos mais importantes ocorridos durante o ciclo de vida (desde o boot).
- **Recommendations**: `DiagnosticIssue` fornece recomendações acionáveis para resolver os problemas em vez de apenas logar erros.

## 5. Exportação Versionada

Os dados exportados pela plataforma (ex: `JsonDiagnosticsExporter`) sempre possuem `schemaVersion` para garantir contratos estáveis (ex: `"schemaVersion": "1.0"`).
