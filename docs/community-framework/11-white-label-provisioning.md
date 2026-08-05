# 11 — White Label Provisioning

**Módulo:** Community Framework
**Escopo:** Provisionamento, onboarding, Wizard de 10 passos, governança de Community Instance e publicação de operações white label

---

## 1. Conceito de Community Instance vs. Tenant

Uma **Community Instance** é a representação lógica de uma operação white label ativa. Ela não substitui nem duplica a entidade física `tenant` no banco de dados, mas agrega todas as configurações, módulos, políticas, branding e integrações vinculadas àquele `tenant_id`.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                          COMMUNITY INSTANCE                            │
│                                                                        │
│   ┌──────────────┐    ┌──────────────────┐    ┌────────────────────┐   │
│   │    Tenant    │ ── │  Branding & Theme│ ── │ Community Template │   │
│   │ (Isolamento) │    │  (Visual Tokens) │    │ (Regras de Domínio)│   │
│   └──────────────┘    └──────────────────┘    └────────────────────┘   │
│          │                     │                        │              │
│   ┌──────────────┐    ┌──────────────────┐    ┌────────────────────┐   │
│   │   Módulos    │ ── │     Políticas    │ ── │ Billing & Gateway  │   │
│   │ (Habilitados)│    │  (Aprovação/RLS) │    │ (Mercado Pago)     │   │
│   └──────────────┘    └──────────────────┘    └────────────────────┘   │
│          │                     │                        │              │
│   ┌──────────────┐    ┌──────────────────┐    ┌────────────────────┐   │
│   │   Domínios   │ ── │ Contratos & Legal│ ── │ SEO, Storage & CRM │   │
│   │ (Custom/DNS) │    │ (Assinatura Elec)│    │ (Metadados/Logs)   │   │
│   └──────────────┘    └──────────────────┘    └────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Estado Atual

O CivicOS opera em arquitetura multi-tenant nativa. Cada tenant possui isolamento completo de dados via RLS, resolução por host no Next.js e configuração independente. Este documento formaliza o **Provisioning Wizard** em 10 passos para que uma nova `Community Instance` seja lançada de forma padronizada, segura e auditável.

---

## 3. O Provisioning Wizard em 10 Passos

O provisionamento é realizado por um assistente interativo no painel de administração da plataforma CivicOS.

```text
Passo 1: Selecionar Template
  ↓
Passo 2: Nome e Identidade Básica
  ↓
Passo 3: Slug e Subdomínio Temporário
  ↓
Passo 4: Branding, Tema e Assets
  ↓
Passo 5: Domínio Personalizado e DNS
  ↓
Passo 6: Habilitação de Módulos
  ↓
Passo 7: Políticas Operacionais, Jurídicas e Onboarding Gates
  ↓
Passo 8: Billing, Gateway (Mercado Pago) e Planos
  ↓
Passo 9: Administradores Iniciais
  ↓
Passo 10: Revisão, Homologação e Publicação
```

---

### Passo 1 — Selecionar Community Template
O operador seleciona um **Community Template** publicado (ex: `conexao-maconica`, `rotary-connect`, `lions-connect`). O template carrega automaticamente os defaults de terminologia, módulos obrigatórios, tipos de organização, onboarding gates e políticas de vínculo.

### Passo 2 — Nome e Identificação Básica
- Nome público da comunidade.
- Razão social ou entidade jurídica responsável.
- CNPJ da entidade contratante da plataforma.
- Endereço físico e fuso horário padrão.
- Idioma principal (`pt-BR`).

### Passo 3 — Slug e Subdomínio Temporário
- Definição do `slug` único (ex: `conexao-maconica`).
- Geração automática do subdomínio de homologação: `[slug].civicos.app`.
- Validação de disponibilidade do slug na plataforma.

### Passo 4 — Branding, Tema e Assets Visuais
- **Logotipos**: Principal, reduzido, variantes para fundo claro e escuro (SVG/PNG).
- **Ícones**: Favicon (32x32, 180x180), PWA icons (192x192, 512x512), Splash screen.
- **Paleta de Cores (Theme Tokens)**: Primária, secundária, superfície, fundo, acento, estados (sucesso, aviso, erro, informação).
- **Tipografia**: Seleção de fontes principais e secundárias via Google Fonts.
- **Imagens Padrão**: Social OG Image (1200x630px), banner institucional.

### Passo 5 — Domínio Personalizado e DNS
- Registro do domínio final (ex: `www.conexaomaconica.com.br`).
- Instruções de apontamento CNAME para a CDN/Edge da plataforma.
- Verificação de registro TXT para comprovação de posse do domínio.
- Geração automática de certificado HTTPS via Let's Encrypt.
- Configuração de URLs canônicas e redirecionamento 301.

### Passo 6 — Habilitação de Módulos
- Ativação dos módulos declarados no template (Diretório, Marketplace, Organizações, Credenciais, Cupons, Eventos, Conteúdo, Leads, CRM, Avaliações, Mapa, Billing).
- Ajustes de visibilidade e permissões por módulo.

### Passo 7 — Políticas Operacionais, Jurídicas e Onboarding Gates
- **Onboarding Gate Policy & Template Policy Validation**: Configuração da ordem flexível de travas de onboarding, com validação de invariantes pelo framework:
  - `payment_before_contract`: Permitido apenas quando houver fundamento comercial e política explícita de estorno.
  - `publication_before_verification`: Estritamente **proibido** para templates que exigem verificação.
  - `activation_before_payment`: Permitido **apenas** para planos gratuitos ou períodos de cortesia/trial configurados.
- **Regras de Aprovação**: Aprovação automática ou moderação manual de empresas.
- **Vínculo Comunitário**: Exigência de documento ou validação institucional para comprovação de vínculo.
- **Configuração Jurídica da Operação**:
  - Razão social da contratante para emissão dos contratos de anunciantes.
  - Representante legal (Nome, CPF, Cargo).
  - Modelos de contrato habilitados (ex: `advertiser_annual_subscription`).
  - Modalidade de assinatura eletrônica (`ELECTRONIC_ADVANCED` recomendada) e modo (`SINGLE_PARTY` vs `BILATERAL`).
  - Provider adapter de assinatura eletrônica (integração via `ElectronicSignatureProvider`).
  - Termos de Uso, Política de Privacidade, Consentimentos e Autorização de Marca vinculados à instância.
  - Foro jurídico e política de retenção de dados após cancelamento.

### Passo 8 — Billing, Gateway e Planos
- Seleção do modelo de cobrança habilitado pelo template (`ANNIVERSARY` ou `FIXED_DATE`).
- Configuração do adapter de pagamento (**Mercado Pago**):
  - Public Key e Access Token (sandbox e produção).
  - Secret do Webhook de notificação.
- Cadastro dos planos comerciais (Bronze, Prata, Ouro) com vigência e preços.
- Configuração do Grace Period (default 7 dias).

### Passo 9 — Administradores Iniciais
- Cadastro do primeiro `tenant_admin` (Nome, E-mail, Telefone).
- Envio de convite com link temporário de primeiro acesso e definição de senha.

### Passo 10 — Homologação, Checklist e Publicação
- Execução do checklist automatizado de *readiness* e validação de políticas do template.
- Transição controlada de estados: `DRAFT` → `HOMOLOGATION` → `PRODUCTION`.

---

## 4. Gestão de Estado do Wizard e Recursos Operacionais

Para garantir flexibilidade e controle no provisionamento, o Wizard suporta:

1. **Salvar Rascunho (Draft Persistence)**: Cada passo concluído salva o estado parcial na tabela de rascunhos de provisionamento. O operador pode interromper e retomar a qualquer momento.
2. **Navegação Bidirecional**: É possível voltar passos para corrigir dados antes da publicação final.
3. **Validação Progressiva**: O botão "Avançar" só é liberado após a validação dos campos obrigatórios do passo atual.
4. **Clonagem de Configurações**: É possível iniciar o provisionamento importando a estrutura de uma `Community Instance` existente como base.
5. **Ações de Ciclo de Vida da Instância**:
   - **Suspensão**: Bloqueia temporariamente o acesso público e do painel administrativo por motivos financeiros ou operacionais.
   - **Arquivamento**: Coloca a instância em modo leitura imutável.
   - **Reativação**: Restaura o status `PRODUCTION` após saneamento de pendências.
   - **Trilha de Auditoria de Configuração**: Toda alteração efetuada nas configurações da instância é registrada com `user_id`, `timestamp`, `ip` e `diff` de valores.

---

## 5. Matriz RBAC para Gestão da Instância e Contratos

| Papel no Sistema | Acesso a Configurações | Leitura de Contratos | Acesso a Evidências | Operações Financeiras |
|---|:---:|:---:|:---:|:---:|
| `Tenant Admin` | Total na instância | Sim (do tenant) | Não | Sim |
| `Financeiro` | Apenas Billing/Gateway | Sim (Resumo/Valores) | Não | Total |
| `Moderador` | Nítido (Aprovação) | Apenas Status | Não | Não |
| `Jurídico / Compliance` | Apenas Termos/Políticas | Total | Total (Hashes/IPs) | Leitura |
| `Suporte` | Somente Leitura | Apenas Status | Não | Não |
| `Platform Master` | Total (Auditado) | Total (Auditado) | Total (Auditado) | Total (Auditado) |

---

## 6. Checklist de Readiness para Publicação

Antes de autorizar a transição para `PRODUCTION`, o sistema exige 100% de aprovação no checklist:

- [ ] Template válido e compatível com o Framework.
- [ ] Identidade visual e assets completos (Logos, Favicon, OG Image).
- [ ] Domínio personalizado verificado via DNS TXT e CNAME ativo.
- [ ] Certificado HTTPS provisionado e ativo.
- [ ] Credenciais do Mercado Pago testadas e validadas (Produção).
- [ ] Provider de assinatura eletrônica configurado com credenciais válidas.
- [ ] Representante legal e dados jurídicos preenchidos.
- [ ] Pelo menos 1 Administrador cadastrado e convidado.
- [ ] Pelo menos 1 Plano comercial cadastrado e ativo.
- [ ] Termos de uso, política de privacidade e contrato-padrão vinculados.
- [ ] Onboarding Gate Policy definida e aprovada pelo `Template Policy Validation`.

---

## 7. Prioridade e Sprint Sugerida

- **Prioridade**: P1 — Crítica.
- **Sprint Sugerida**: Sprint 1.0.6 (Formalização do Wizard de Provisionamento).
