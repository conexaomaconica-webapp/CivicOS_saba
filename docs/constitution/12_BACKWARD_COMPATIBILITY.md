# Compatibilidade Retroativa (Backward Compatibility) — CivicOS

> _Garante estabilidade de longo prazo para os plugins instalados, impedindo
> atualizações do Core de quebrar deploys de produção ativos._

**Versão:** 1.0.0
**Status:** Ratificado

---

## 1. Regra de Ouro: Sem Remoções Abruptas

Nenhum contrato, capability, registry ou tabela do banco de dados oficial do Core ou de Plugins ativos em produção pode ser removido abruptamente.

### Fluxo de Depreciação Obrigatório:
```
[Ativo] ➜ [1. Deprecated (Aviso/Logs)] ➜ [2. Oculto (Admin)] ➜ [3. Removido (Nova Major)]
```

---

## 2. Depreciação de Capabilities

Se uma capability (ex: `maps:basic`) precisa ser evoluída ou substituída por outra (ex: `maps:interactive`):

1. **Ciclo Deprecated:** A capability `maps:basic` é mantida no `CAPABILITY_CATALOG.md` mas marcada com a tag `@deprecated`. O `LicensingEngine` continua respondendo `true` para a consulta da capability antiga.
2. **Registro de Aviso:** O Core registra avisos em console ou telemetria informando que o plugin está consumindo uma capability obsoleta.
3. **Remoção:** A remoção física da capability antiga do catálogo e do código só é permitida na próxima versão **MAJOR** da plataforma.

---

## 3. Evolução de Schemas de Banco de Dados

- **Sem Destruição de Colunas:** Colunas de tabelas existentes não podem ser removidas ou renomeadas em migrações menores.
- **Novos Campos Obrigatórios:** Se uma nova coluna é adicionada, ela deve:
  - Possuir um valor padrão (`DEFAULT`).
  - Ou ser opcional (`NULL`).
  - Nunca criar restrições `NOT NULL` sem default que quebrem inserts de códigos antigos.
- **Campos Obsoletos:** Colunas obsoletas devem ser descontinuadas logicamente na aplicação (parar de ler/escrever), mas mantidas fisicamente no banco até a execução de uma migração de limpeza major planejada.
