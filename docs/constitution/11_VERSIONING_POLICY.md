# Política de Versionamento (Versioning Policy) — CivicOS

> _Determina as regras de SemVer e compatibilidade para os manifestos,
> capabilities e serviços da plataforma para evitar o caos operacional._

**Versão:** 1.0.0
**Status:** Ratificado

---

## 1. Regras SemVer por Camada

O CivicOS utiliza Semantic Versioning (SemVer) estrito `MAJOR.MINOR.PATCH`.

```
MAJOR: Quebra contratos, remove capabilities ou apaga tabelas.
MINOR: Adiciona novas capabilities, registries, tabelas ou endpoints sem quebrar.
PATCH: Correções de bugs, melhorias de performance e refatorações internas transparentes.
```

### A. Camada Kernel & Platform (`@saas/core`)
- **MAJOR:** Remoção de tokens DI existentes, quebra de contratos de lifecycle de plugins, ou alteração incompatível na assinatura do EventBus.
- **MINOR:** Registro de novos registries, novos tokens DI, novas capacidades no catálogo padrão.
- **PATCH:** Bugfixes de tipagem, otimização de DI, ou correções na injeção de contexto de Tenant.

### B. Camada Plugins (`@saas/plugin-*`)
- **MAJOR:** Alteração obrigatória nos schemas de banco de dados sem migração automática, ou dependência de uma versão nova do Core.
- **MINOR:** Novas rotas, novos widgets, ou publicação de novos eventos consumíveis.
- **PATCH:** Melhoria visual em componentes de página ou widgets, ou correção de bugs de formulários.

---

## 2. Compatibilidade no Manifesto

Os manifestos declaram compatibilidade com a versão do Core através da propriedade `coreVersion` no arquivo `plugin.json`:

```json
{
  "id": "business-directory",
  "version": "1.2.0",
  "coreVersion": "^1.0.0"
}
```

- Durante a inicialização, o `PluginRegistry` valida se a versão instalada do `@saas/core` satisfaz o range `coreVersion`.
- Se a verificação falhar, o plugin entra automaticamente no estado `error` e sua inicialização é abortada para evitar quebras em runtime.
