# Architecture

O CivicOS utiliza uma arquitetura baseada em Plugins e Ports/Adapters. O objetivo é manter o domínio limpo, independente de frameworks de apresentação (React, Vue, Mobile) e de tecnologias de banco de dados.

## High Level Architecture

```text
                 HOST
                  |
             APP-SDK
                  |
              PRESENTATION
                  |
PLUGIN ← SDK → KERNEL
                  |
          INFRASTRUCTURE
                  |
              DATABASE
```

### O que isso significa na prática?

1. **Host:** A aplicação final que inicializa o sistema (ex: Next.js app, Capacitor mobile app).
2. **App-SDK:** O kit de ferramentas que o Host usa para renderizar a interface de forma segura sem tocar no Kernel.
3. **Presentation:** O motor agnóstico de UI, capaz de expor rotas e widgets baseados em capabilities e policies.
4. **Plugin:** Unidades encapsuladas de domínio (regras de negócio). Se comunicam estritamente via SDK.
5. **Kernel:** O orquestrador central (boot, cycle, registries, policies).
6. **Infrastructure:** Implementação de conectividade (Supabase, Stripe, S3, Email).
