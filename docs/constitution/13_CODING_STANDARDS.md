# Padrões de Código (Coding Standards) — CivicOS

> _Define as diretrizes de formatação, tipagem, tratamento de erros e injeção
> de dependências para manter a qualidade de engenharia do CivicOS._

**Versão:** 1.0.0
**Status:** Ratificado

---

## 1. Tipagem TypeScript & Rigidez

- **Strict Mode:** Todo pacote do monorepo possui strict check ativo no `tsconfig.json`.
- **Proibido o tipo `any`:** O uso de `any` destrói as vantagens do TypeScript e compromete a integridade do DI container.
  - ❌ `const data: any = getSome();`
  - ✅ `const data: unknown = getSome();` ou declare a interface correspondente.
- **Generics Explicitos:** Sempre tipar os retornos do DI container e chamadas de API:
  ```typescript
  const auth = container.get<IAuthProvider>(AUTH_PROVIDER);
  ```

---

## 2. Tratamento de Erros Resiliente

- **Sem estouro silencioso:** Erros críticos em runtime não devem ser capturados e silenciados de forma vazia.
- **Padrão Monádico `Result`:** Para fluxos de negócio propensos a falhas (como pagamentos, autenticação e validações), preferir o retorno de objetos de resultado (`Result<Value, Error>`) do `@saas/shared` em vez de disparar `throw new Error()` de forma descontrolada:

```typescript
import type { Result } from '@saas/shared';

function processPixPayment(amount: number): Result<PixReceipt, string> {
  if (amount <= 0) {
    return { ok: false, error: 'Valor inválido' };
  }
  return { ok: true, value: receipt };
}
```

---

## 3. Injeção de Dependências (DI)

- **Bindings Abstratos:** Sempre vincular símbolos (tokens) de contratos abstratos na inicialização, nunca classes concretas diretamente.
- **Sem Decoradores:** O DI container do CivicOS é puramente funcional e explícito para garantir compatibilidade total com o Edge Runtime do Next.js.
  ```typescript
  // ✅ Correto
  container.bind(STORAGE_PROVIDER).toFactory(() => new SupabaseStorageProvider());
  ```
