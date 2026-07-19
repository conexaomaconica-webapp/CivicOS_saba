# Constituição da IA (AI Constitution) — CivicOS

> _Este documento define o protocolo de comportamento obrigatório para qualquer
> modelo de IA (incluindo o Antigravity) que trabalhe neste repositório.
> Destina-se a impedir a deriva arquitetural e garantir conformidade estrita
> com os contratos constitucionais._

**Versão:** 1.0.0
**Status:** Ratificado

---

## 1. O Protocolo de Auto-Validação

Antes de propor um plano de implementação, escrever código ou rodar comandos de modificação, a IA **deve responder internamente** a estas 10 perguntas de controle. A resposta deve ser registrada no início da sua linha de raciocínio.

### As 10 Perguntas de Auto-Validação:

1. **Qual camada será alterada?** (Kernel, Platform, Plugin, Infrastructure ou Documentation)
2. **Existe alguma Architecture Decision Record (ADR) relacionada?** (Se sim, qual número?)
3. **Existe alguma Capability correspondente?** (A alteração consome ou fornece alguma capability registrada?)
4. **Existe algum Registry correspondente?** (Se for uma rota, widget ou menu, usou o respectivo Registry?)
5. **Existe um contrato de interface já existente?** (Verificou se a interface em `@saas/core` atende?)
6. **Estou quebrando compatibilidade retroativa?** (Alterou assinaturas antigas sem deprecá-las?)
7. **Estou criando acoplamento entre plugins?** (Inseriu imports diretos ou dependências mútuas?)
8. **Existe uma forma mais genérica de resolver isso?** (A alteração beneficia outros plugins?)
9. **Isso pertence ao Core (Kernel/Platform)?** (Verificou se contém regras de negócio de domínio?)
10. **Isso pode ser resolvido puramente em um Plugin?** (Se for um recurso específico, isole-o).

---

## 2. Ação Diante de Desvios

Se a auto-validação indicar qualquer desvio arquitetural (como acoplamento de plugins ou vazamento de lógica de negócio para o Core):

1. **Parar a execução imediatamente.**
2. **Alertar o usuário** detalhando a incompatibilidade com a Constituição.
3. **Propor uma abordagem alternativa** em conformidade com as regras (ex: promovendo funcionalidade para `@saas/shared` ou registrando um novo provedor).
