# Catálogo de Licenciamento — CivicOS

> _Define os planos comerciais, seus limites operacionais e os conjuntos de
> capabilities (Capability Sets) liberados para cada nível. O Licensing Engine
> consulta este catálogo para determinar o que cada tenant pode fazer._

**Versão:** 1.0.0
**Status:** Ratificado

---

## Regras do Licenciamento

1. **Capability-Based:** O Billing vende planos. O Licensing traduz planos em
   conjuntos de capabilities. O Plugin nunca sabe qual plano existe — ele
   pergunta apenas: _"Tenho a Capability X?"_

2. **Composibilidade:** Capabilities podem ser vendidas individualmente (add-ons)
   ou em pacotes (Capability Packs), além dos planos base.

3. **Herança:** Planos superiores herdam todas as capabilities dos inferiores.
   O Enterprise inclui tudo do Professional, que inclui tudo do Starter.

4. **Limites Numéricos:** Além das capabilities booleanas, cada plano define
   limites quantitativos (usuários, armazenamento, plugins ativos).

5. **Per-Tenant:** Cada tenant possui seu próprio plano e add-ons.
   Diferentes tenants podem ter diferentes combinações.

---

## Planos Base

### STARTER (Gratuito — Foco em Povoamento)

**Objetivo:** Isca para povoar a plataforma rapidamente. Permite listar e
ser encontrado, sem funcionalidades premium.

| Limite | Valor |
|---|---|
| Usuários Administrativos | 2 |
| Armazenamento | 1 GB |
| Plugins Ativos | 3 |
| Listagens/Registros por Plugin | 50 |

**Capability Set:**

| Capability | Status |
|---|---|
| `auth:basic` | ✅ Ativo |
| `rbac:roles` | ✅ Ativo |
| `storage:basic` | ✅ Ativo |
| `search:basic` | ✅ Ativo |
| `notification:in-app` | ✅ Ativo |
| `notification:email` | ✅ Ativo |
| `maps:basic` | ✅ Ativo |
| `admin:tenant-settings` | ✅ Ativo |
| `admin:user-management` | ✅ Ativo |
| `billing:pix` | ✅ Ativo |
| `billing:pro-rata` | ✅ Ativo |
| `content:seo` | ✅ Ativo |
| — | — |
| `banner:*` | ❌ Bloqueado |
| `media:gallery` | ❌ Bloqueado |
| `media:video` | ❌ Bloqueado |
| `ai:*` | ❌ Bloqueado |
| `analytics:advanced` | ❌ Bloqueado |
| `automation:*` | ❌ Bloqueado |
| `directory:priority` | ❌ Bloqueado |
| `directory:featured` | ❌ Bloqueado |
| `directory:sticky-cta` | ❌ Bloqueado |
| `search:advanced` | ❌ Bloqueado |
| `search:geolocation` | ❌ Bloqueado |

---

### PROFESSIONAL (Intermediário — Presença Visual Digna)

**Objetivo:** Oferecer ferramentas visuais e de conversão que justificam um
investimento mensal acessível.

| Limite | Valor |
|---|---|
| Usuários Administrativos | 15 |
| Armazenamento | 10 GB |
| Plugins Ativos | Ilimitado |
| Listagens/Registros por Plugin | 500 |

**Capability Set:** _Tudo do STARTER, mais:_

| Capability | Status |
|---|---|
| `auth:social` | ✅ Ativo |
| `storage:premium` | ✅ Ativo |
| `search:advanced` | ✅ Ativo |
| `search:autocomplete` | ✅ Ativo |
| `media:gallery` | ✅ Ativo |
| `media:documents` | ✅ Ativo |
| `banner:basic` | ✅ Ativo |
| `directory:priority` | ✅ Ativo |
| `directory:featured` | ✅ Ativo |
| `billing:subscription` | ✅ Ativo |
| `billing:invoice` | ✅ Ativo |
| `analytics:basic` | ✅ Ativo |
| `comments:engine` | ✅ Ativo |
| `ratings:stars` | ✅ Ativo |
| `social:sharing` | ✅ Ativo |
| `social:favorites` | ✅ Ativo |
| `notification:push` | ✅ Ativo |
| `maps:interactive` | ✅ Ativo |
| `maps:distance` | ✅ Ativo |
| `import:csv` | ✅ Ativo |
| `export:csv` | ✅ Ativo |
| `export:excel` | ✅ Ativo |
| `reports:pdf` | ✅ Ativo |
| `calendar:basic` | ✅ Ativo |
| `content:rich-editor` | ✅ Ativo |
| `admin:audit-log` | ✅ Ativo |
| — | — |
| `ai:*` | ❌ Bloqueado |
| `automation:workflows` | ❌ Bloqueado |
| `analytics:advanced` | ❌ Bloqueado |
| `banner:rotating` | ❌ Bloqueado |
| `directory:sticky-cta` | ❌ Bloqueado |

---

### ENTERPRISE (Completo — Festa de Recursos)

**Objetivo:** Pacote premium com acesso total a todas as capabilities da
plataforma. Orientado a organizações grandes e redes multi-unidade.

| Limite | Valor |
|---|---|
| Usuários Administrativos | Ilimitado |
| Armazenamento | 50 GB |
| Plugins Ativos | Ilimitado |
| Listagens/Registros por Plugin | Ilimitado |

**Capability Set:** _Todas as 82 capabilities do catálogo ativas._

| Capability | Status |
|---|---|
| `ai:*` | ✅ Ativo |
| `analytics:advanced` | ✅ Ativo |
| `analytics:realtime` | ✅ Ativo |
| `automation:*` | ✅ Ativo |
| `banner:rotating` | ✅ Ativo |
| `banner:video` | ✅ Ativo |
| `directory:sticky-cta` | ✅ Ativo |
| `search:geolocation` | ✅ Ativo |
| `search:ai` | ✅ Ativo |
| `media:video` | ✅ Ativo |
| `maps:directions` | ✅ Ativo |
| `maps:heatmap` | ✅ Ativo |
| `maps:geofence` | ✅ Ativo |
| `calendar:booking` | ✅ Ativo |
| `calendar:sync` | ✅ Ativo |
| `calendar:reminders` | ✅ Ativo |
| `import:excel` | ✅ Ativo |
| `import:api` | ✅ Ativo |
| `reports:scheduled` | ✅ Ativo |
| `notification:whatsapp` | ✅ Ativo |
| `notification:sms` | ✅ Ativo |
| `notification:digest` | ✅ Ativo |
| `forum:basic` | ✅ Ativo |
| `forum:moderated` | ✅ Ativo |
| `ratings:nps` | ✅ Ativo |
| `auth:mfa` | ✅ Ativo |
| `auth:magic-link` | ✅ Ativo |
| `rbac:custom-roles` | ✅ Ativo |
| `admin:backup` | ✅ Ativo |
| `admin:multi-language` | ✅ Ativo |
| _...todas as demais_ | ✅ Ativo |

---

## Capability Packs (Add-Ons)

Pacotes temáticos que podem ser adquiridos independentemente do plano base.
Cada pack é um conjunto lógico de capabilities que resolvem uma necessidade
de negócio específica.

### 📢 Marketing Pack

**Ideal para:** Anunciantes que querem maximizar visibilidade e conversão.

| Capability incluída | Tipo |
|---|---|
| `banner:rotating` | UI Slot |
| `banner:video` | UI Slot |
| `directory:sticky-cta` | UI Slot |
| `notification:push` | Service |
| `notification:whatsapp` | Service |
| `analytics:basic` | Service |

---

### 🤖 AI Pack

**Ideal para:** Tenants que querem automatizar criação de conteúdo.

| Capability incluída | Tipo |
|---|---|
| `ai:description` | Service |
| `ai:recommendation` | Service |
| `ai:chatbot` | UI Slot |
| `ai:moderation` | Service |
| `ai:translation` | Service |

---

### 👥 Community Pack

**Ideal para:** Comunidades que querem engajamento e interação social.

| Capability incluída | Tipo |
|---|---|
| `comments:engine` | Service |
| `ratings:stars` | UI Slot |
| `ratings:nps` | Service |
| `forum:basic` | Service |
| `forum:moderated` | Service |
| `social:sharing` | UI Slot |
| `social:favorites` | Service |

---

### 📊 Analytics Pack

**Ideal para:** Organizações orientadas a dados e métricas.

| Capability incluída | Tipo |
|---|---|
| `analytics:advanced` | Service |
| `analytics:realtime` | Service |
| `reports:pdf` | Service |
| `reports:excel` | Service |
| `reports:scheduled` | Service |

---

### 🗺️ Location Pack

**Ideal para:** Guias comerciais e diretórios com foco em geolocalização.

| Capability incluída | Tipo |
|---|---|
| `maps:interactive` | UI Slot |
| `maps:distance` | Service |
| `maps:directions` | Service |
| `maps:heatmap` | UI Slot |
| `search:geolocation` | Service |

---

### ⚙️ Automation Pack

**Ideal para:** Organizações que querem processos automáticos sem código.

| Capability incluída | Tipo |
|---|---|
| `automation:workflows` | Logic |
| `automation:scheduler` | Service |
| `automation:webhooks` | Service |
| `automation:triggers` | Logic |

---

## Mapeamento: Plano → Capability Set (Resumo Visual)

```
STARTER        ████░░░░░░░░░░░░  ~15 capabilities  (Grátis)
PROFESSIONAL   ████████████░░░░  ~45 capabilities  (Intermediário)
ENTERPRISE     ████████████████  ~82 capabilities  (Completo)

+ Marketing Pack    ██  (+6 capabilities)
+ AI Pack           ██  (+5 capabilities)
+ Community Pack    ██  (+7 capabilities)
+ Analytics Pack    █   (+5 capabilities)
+ Location Pack     ██  (+5 capabilities)
+ Automation Pack   █   (+4 capabilities)
```

---

## Regras de Upgrade e Downgrade

1. **Upgrade:** Instantâneo. Novas capabilities são liberadas imediatamente.
2. **Downgrade:** Gracioso. Capabilities removidas ficam em modo read-only por
   30 dias antes de serem desativadas.
3. **Add-on:** Pode ser adicionado a qualquer plano. A capability é ativada
   imediatamente e aparece na fatura seguinte.
4. **Cancelamento de Add-on:** Capability desativada no fim do ciclo de
   faturamento vigente.
