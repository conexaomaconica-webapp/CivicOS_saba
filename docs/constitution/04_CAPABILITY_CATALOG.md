# Catálogo de Capacidades — CivicOS

> _Este é o documento mais importante da plataforma. Ele define oficialmente
> todas as capacidades que plugins podem declarar fornecer (`provides`) ou
> precisar (`requires`). Todo plugin obrigatoriamente utiliza apenas
> capabilities deste catálogo._

**Versão:** 1.0.0
**Status:** Ratificado
**Convenção de Nomenclatura:** `domínio:qualificador` (minúsculas, dois-pontos)

---

## Regras do Catálogo

1. **Catálogo Fechado:** Novas capabilities só podem ser adicionadas mediante
   aprovação via ADR.
2. **Unicidade:** Cada capability tem um identificador único e imutável.
3. **Atomicidade:** Cada capability representa uma funcionalidade indivisível.
4. **Composibilidade:** Capabilities podem ser agrupadas em Capability Packs.
5. **Independência:** Capabilities não dependem umas das outras (exceto quando
   declarado explicitamente via `requires`).

---

## Identidade & Acesso

| Capability | Tipo | Descrição |
|---|---|---|
| `auth:basic` | Service | Login/logout por e-mail e senha, gestão de sessão JWT |
| `auth:social` | Service | Autenticação via provedores OAuth (Google, Facebook, Apple) |
| `auth:mfa` | Service | Autenticação multi-fator (TOTP, SMS) |
| `auth:magic-link` | Service | Login sem senha via link mágico por e-mail |
| `rbac:roles` | Service | Gestão de papéis e permissões por tenant |
| `rbac:custom-roles` | Service | Criação de papéis personalizados pelo admin |

---

## Armazenamento & Mídia

| Capability | Tipo | Descrição |
|---|---|---|
| `storage:basic` | Service | Upload e gestão de arquivos até 1GB |
| `storage:premium` | Service | Upload e gestão de arquivos até 50GB |
| `media:gallery` | UI Slot | Carrossel de fotos com lightbox |
| `media:video` | UI Slot | Player de vídeo embarcado (YouTube, Vimeo, upload) |
| `media:documents` | Service | Upload e visualização de PDFs e documentos |

---

## Busca & Descoberta

| Capability | Tipo | Descrição |
|---|---|---|
| `search:basic` | Service | Busca textual simples (ILIKE) |
| `search:advanced` | Service | Filtros combinados, ranges, ordenação múltipla |
| `search:geolocation` | Service | Busca por proximidade geográfica |
| `search:ai` | Service | Busca semântica com embeddings e IA |
| `search:autocomplete` | UI Slot | Sugestões instantâneas durante digitação |

---

## Monetização & Billing

| Capability | Tipo | Descrição |
|---|---|---|
| `billing:pix` | Service | Cobrança via PIX com QR code e copia-e-cola |
| `billing:stripe` | Service | Cobrança via cartão de crédito (Stripe) |
| `billing:subscription` | Logic | Assinaturas recorrentes com renovação automática |
| `billing:pro-rata` | Logic | Cálculo proporcional de valores em adesão |
| `billing:invoice` | Service | Geração e envio de faturas/boletos |
| `billing:commission` | Logic | Comissionamento sobre vendas de plugins |

---

## Conteúdo & Publicidade

| Capability | Tipo | Descrição |
|---|---|---|
| `banner:basic` | UI Slot | Banner estático com imagem e link |
| `banner:rotating` | UI Slot | Banner rotativo com múltiplas imagens |
| `banner:video` | UI Slot | Banner com vídeo promocional |
| `directory:priority` | Logic | Ordenação premium nos resultados de busca (topo) |
| `directory:featured` | UI Slot | Card destacado com visual premium |
| `directory:sticky-cta` | UI Slot | Barra fixa de conversão rápida no celular |
| `content:rich-editor` | UI Slot | Editor de texto rico (WYSIWYG) |
| `content:seo` | Logic | Meta tags e sitemap dinâmicos |

---

## Comunicação & Notificações

| Capability | Tipo | Descrição |
|---|---|---|
| `notification:email` | Service | E-mail transacional (verificação, boas-vindas, alertas) |
| `notification:push` | Service | Push notification (web e mobile) |
| `notification:whatsapp` | Service | Mensagem via WhatsApp Business API |
| `notification:sms` | Service | SMS transacional |
| `notification:in-app` | UI Slot | Notificações dentro do aplicativo (sininho) |
| `notification:digest` | Service | Resumo periódico por e-mail (diário/semanal) |

---

## Inteligência Artificial

| Capability | Tipo | Descrição |
|---|---|---|
| `ai:description` | Service | Geração automática de descrições comerciais |
| `ai:recommendation` | Service | Recomendações personalizadas baseadas em comportamento |
| `ai:chatbot` | UI Slot | Chatbot embarcado para atendimento |
| `ai:translation` | Service | Tradução automática de conteúdo |
| `ai:moderation` | Service | Moderação automática de conteúdo e comentários |
| `ai:image-generation` | Service | Geração de imagens para banners e logos |

---

## Automação & Workflows

| Capability | Tipo | Descrição |
|---|---|---|
| `automation:workflows` | Logic | Automações condicionais tipo Zapier |
| `automation:scheduler` | Service | Agendamento de tarefas recorrentes |
| `automation:webhooks` | Service | Disparo de webhooks para integrações externas |
| `automation:triggers` | Logic | Gatilhos baseados em eventos do sistema |

---

## Analytics & Relatórios

| Capability | Tipo | Descrição |
|---|---|---|
| `analytics:basic` | Service | Métricas de visualização e cliques |
| `analytics:advanced` | Service | Funis de conversão, cohorts, A/B testing |
| `analytics:realtime` | Service | Dashboard de métricas em tempo real |
| `reports:pdf` | Service | Exportação de relatórios em PDF |
| `reports:excel` | Service | Exportação de dados em Excel/CSV |
| `reports:scheduled` | Service | Relatórios agendados por e-mail |

---

## Social & Comunidade

| Capability | Tipo | Descrição |
|---|---|---|
| `comments:engine` | Service | Sistema de avaliações e comentários textuais |
| `ratings:stars` | UI Slot | Sistema de avaliação por estrelas (1-5) |
| `ratings:nps` | Service | Net Promoter Score |
| `forum:basic` | Service | Fórum de discussão com tópicos e respostas |
| `forum:moderated` | Service | Fórum com moderação e aprovação de posts |
| `social:sharing` | UI Slot | Botões de compartilhamento social |
| `social:favorites` | Service | Lista de favoritos do usuário |

---

## Mapas & Geolocalização

| Capability | Tipo | Descrição |
|---|---|---|
| `maps:basic` | Service | Mapa estático com marcadores |
| `maps:interactive` | UI Slot | Mapa interativo com zoom e pan |
| `maps:distance` | Service | Cálculo de distância entre pontos |
| `maps:directions` | Service | Rotas e direções (integração Google/Mapbox) |
| `maps:heatmap` | UI Slot | Mapa de calor de concentração |
| `maps:geofence` | Logic | Cercas virtuais e alertas de proximidade |

---

## Importação & Exportação

| Capability | Tipo | Descrição |
|---|---|---|
| `import:csv` | Service | Importação de dados via arquivo CSV |
| `import:excel` | Service | Importação de dados via arquivo Excel (XLSX) |
| `import:api` | Service | Importação via API REST externa |
| `export:csv` | Service | Exportação de dados em CSV |
| `export:excel` | Service | Exportação de dados em Excel |
| `export:pdf` | Service | Exportação formatada em PDF |
| `export:json` | Service | Exportação de dados em JSON |

---

## Agenda & Calendário

| Capability | Tipo | Descrição |
|---|---|---|
| `calendar:basic` | UI Slot | Visualização de calendário mensal |
| `calendar:booking` | Service | Agendamento de horários e reservas |
| `calendar:sync` | Service | Sincronização com Google Calendar / iCal |
| `calendar:reminders` | Service | Lembretes automáticos por e-mail/push |

---

## Administração & Configuração

| Capability | Tipo | Descrição |
|---|---|---|
| `admin:tenant-settings` | UI Slot | Painel de configurações do tenant |
| `admin:user-management` | UI Slot | Gestão de usuários e convites |
| `admin:audit-log` | Service | Log de auditoria de ações administrativas |
| `admin:backup` | Service | Backup e restauração de dados |
| `admin:multi-language` | Service | Suporte a múltiplos idiomas |

---

## Índice Alfabético de Capabilities

Para referência rápida, todas as capabilities em ordem alfabética:

```
admin:audit-log
admin:backup
admin:multi-language
admin:tenant-settings
admin:user-management
ai:chatbot
ai:description
ai:image-generation
ai:moderation
ai:recommendation
ai:translation
analytics:advanced
analytics:basic
analytics:realtime
auth:basic
auth:magic-link
auth:mfa
auth:social
automation:scheduler
automation:triggers
automation:webhooks
automation:workflows
banner:basic
banner:rotating
banner:video
billing:commission
billing:invoice
billing:pix
billing:pro-rata
billing:stripe
billing:subscription
calendar:basic
calendar:booking
calendar:reminders
calendar:sync
comments:engine
content:rich-editor
content:seo
directory:featured
directory:priority
directory:sticky-cta
export:csv
export:excel
export:json
export:pdf
forum:basic
forum:moderated
import:api
import:csv
import:excel
maps:basic
maps:directions
maps:distance
maps:geofence
maps:heatmap
maps:interactive
media:documents
media:gallery
media:video
notification:digest
notification:email
notification:in-app
notification:push
notification:sms
notification:whatsapp
ratings:nps
ratings:stars
rbac:custom-roles
rbac:roles
reports:excel
reports:pdf
reports:scheduled
search:advanced
search:ai
search:autocomplete
search:basic
search:geolocation
social:favorites
social:sharing
storage:basic
storage:premium
```

**Total: 82 capabilities catalogadas.**
