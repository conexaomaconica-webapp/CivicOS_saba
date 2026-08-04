# Documento 03 — Matriz RBAC: Conexão Maçônica

**Versão:** 2.2.0  
**Status:** Em revisão (Revisão v2.2.0 — Versão Final para Aprovação Definitiva)  
**Base:** `Especificação Funcional v1.1.0`, `Arquitetura Técnica v1.0.0 (Aprovada)` & `Schema Database v2.1.0 (Aprovado com Ajustes)`  
**Plataforma:** CivicOS (`foundation-v1.0`)  
**Branch:** `product/conexao-maconica-v1`

---

## 1. Princípios de Autorização e Modelo Ortogonal

O modelo de controle de acesso da **Conexão Maçônica** adota o padrão de **Autorização Ortogonal em Múltiplos Níveis**, distinguindo rigorosamente os conceitos de Identidade, Pertencimento, Autoridade Administrativa, Direitos Comerciais e Habilitação de Recursos:

```text
Autenticação (auth.users)
  │  "Quem é o usuário?" (Credencial verificada via Supabase Auth)
  ▼
Tenant Membership (tenant_members)
  │  "A quais tenants o usuário pertence e qual seu status (active)?"
  ▼
Tenant Roles & Permissions (roles + user_roles + permissions)
  │  "Quais privilégios administrativos o usuário possui no tenant?"
  ▼
Business Memberships (business_members)
  │  "Quais papéis operacionais (owner, co_owner, manager, finance, marketing, support, viewer) o usuário possui em uma empresa específica?"
  ▼
Entitlements Engine (entitlement_grants + entitlement_usage)
  │  "Quais limites comerciais a empresa/usuário pode consumir?"
  ▼
Feature Flags (tenant_features)
     "Quais funcionalidades estão ativas na instância do tenant?"
```

### 1.1 Regras Cardinais de Separação
1. **RBAC não substitui Entitlements**: Uma permissão RBAC (ex: `business:media:create`) autoriza a ação técnica de adicionar fotos, mas o motor de Entitlements (`entitlement_grants.value_numeric`) define se a empresa ainda possui cota disponível (ex: máximo de 15 fotos no Plano Prata).
2. **Entitlements não concedem Autoridade**: Possuir um entitlement (ex: `has_verified_badge`) não concede permissões administrativas de sistema nem altera papéis de usuário.
3. **Isolamento Estrito de Escopo Empresa (`business_members`)**: Um usuário pode ser `owner` da Empresa A, `finance` da Empresa B e `viewer` da Empresa C no mesmo tenant. As permissões de empresa aplicam-se **estritamente** ao contexto do `business_id` em operação.
4. **Tríade Distinta de Funções Globais e Administrativas**:
   - `has_global_platform_role('master')`: Governança técnica global da infraestrutura.
   - `has_global_operational_role('crm_sales')`: Atuação comercial cross-tenant restrita estritamente ao CRM de vendas da plataforma.
   - `has_tenant_admin_access(tenant_id)`: Autoridade operacional sobre recursos não confidenciais da instância do tenant.
5. **Acesso Elevado Auditado para Dados Privados (`has_elevated_support_access`)**: Nem `master` nem `tenant_admin` possuem acesso automático a dados confidenciais privados (leads de anunciantes, relatórios LGPD). O acesso exige aprovação de segundo operador, escopo específico e consulta via endpoint/RPC auditado.
6. **Independência da Identidade Institucional**: O vínculo maçônico (`organization_people`) comprova pertencimento de domínio e não concede autoridade de administração de TI (`tenant_admin` ou `master`).
7. **Única Fonte de Verdade no Banco de Dados**: A autoridade de qualquer papel deriva exclusivamente dos registros persistidos no banco de dados (`roles` + `user_roles`). Claims em tokens JWT atuam apenas como cache de curtíssima expiração emitido pelo backend confiável.

---

## 2. Glossário de Escopos de Autorização

| Escopo | Descrição | Origem da Confiança | Exemplo de Aplicação |
|---|---|---|---|
| **Global Platform** | Acesso de administração técnica da infraestrutura CivicOS | `user_roles` onde `roles.tenant_id IS NULL`, `is_global = true` e `role_type = 'platform'` | Manutenção de infraestrutura, billing global, governança master |
| **Global Operational**| Acesso operacional comercial cross-tenant controlado | `user_roles` onde `roles.tenant_id IS NULL`, `is_global = true` e `role_type = 'operational'` | Gestão de pipeline no CRM interno de vendas (`crm_sales`) |
| **Tenant-Scoped** | Acesso restrito exclusivamente ao tenant resolvido na sessão (`tenant_id`) | `tenant_members(status = 'active')` & `user_roles(status = 'active')` | Gestão da instância regional White Label, aprovação de anunciantes locais |
| **Business-Scoped** | Acesso restrito a uma empresa específica dentro de um tenant | `business_members(tenant_id, business_id, status = 'active')` | Edição de perfil da empresa, resposta aos próprios leads, galeria de mídia |
| **Organization-Scoped**| Acesso restrito ao domínio institucional de Loja/Potência Maçônica | `organization_people(tenant_id, organization_id, status = 'active')` | Prova de vínculo institucional (autoridade de TI mantida por `tenant_admin` no MVP 1A) |
| **Authenticated Self** | Regra contextual self-service do próprio titular autenticado (`auth.uid() == record.user_id`) | Validação contextual de ownership no RLS | Aceite de Termos de Uso, exportação LGPD e revogação de consentimentos |
| **Authenticated User** | Qualquer usuário autenticado no sistema via `auth.users` | JWT ativo (`auth.uid()`) | Solicitação inicial de empresa, envio de leads, resgate de cupons público |
| **Anonymous (Visitante)**| Usuário navegando no portal público sem autenticação | Sessão pública anônima | Visualização do guia comercial público, busca de empresas publicadas |

---

## 3. Papéis Conceituais do Sistema

### 3.1 Papéis do Nível de Plataforma e Tenant

#### 3.1.1 `master` (Administrador Global da Plataforma)
- **Escopo**: Global Platform.
- **Função**: Superadministrador da infraestrutura CivicOS via `has_global_platform_role('master')`. Possui autoridade técnica global. Para acesso a dados confidenciais privados (leads de anunciantes, dados pessoais LGPD), exige **sessão de acesso elevado temporário e auditado** (`has_elevated_support_access`).

#### 3.1.2 `socio_admin` / `tenant_admin` (Administrador Regional White Label)
- **Escopo**: Tenant-Scoped.
- **Função**: Gestor da instância regional do tenant. Gerencia planos locais, valida credenciais maçônicas, aprova anúncios e gerencia a equipe do tenant. **Não possui acesso aos leads privados dos anunciantes nem ao CRM interno por padrão**.

#### 3.1.3 `crm_sales` (Agente Comercial da Plataforma - Global Operacional)
- **Escopo**: Global Operational (`roles.tenant_id IS NULL` e `role_type = 'operational'`).
- **Função**: Membro da equipe de vendas interna da plataforma. Prospecta anunciantes, registra oportunidades, envia propostas comerciais de planos e acompanha renovações via função `has_global_operational_role('crm_sales')`. **Não possui acesso aos leads privados dos anunciantes**.

---

### 3.2 Papéis do Nível da Empresa (`business_members`)

#### 3.2.1 `business_owner` (Proprietário da Empresa)
- **Escopo**: Business-Scoped.
- **Função**: Titular legal da empresa. Possui autoridade total sobre o cadastro, contratação de assinaturas, desativação temporária, transferência de titularidade e gestão de colaboradores.

#### 3.2.2 `business_co_owner` (Sócio)
- **Escopo**: Business-Scoped.
- **Função**: Co-proprietário com plenos direitos operacionais, contratação de planos e gestão de colaboradores. **Não pode transferir a titularidade principal nem desativar/excluir a empresa**.

#### 3.2.3 `business_manager` (Gerente Operacional)
- **Escopo**: Business-Scoped.
- **Função**: Gerente de operações. Atualiza informações cadastrais, horários de funcionamento, galeria de fotos e responde a leads de clientes. **Não acessa faturas nem altera assinaturas ou membros**.

#### 3.2.4 `business_finance` (Gestor Financeiro)
- **Escopo**: Business-Scoped.
- **Função**: Responsável financeiro. Visualiza faturas, altera planos, realiza pagamentos, envia comprovantes e gerencia dados de faturamento. **Não edita mídias públicas nem visualiza/responde a leads**.

#### 3.2.5 `business_marketing` (Gestor de Mídia e Campanhas)
- **Escopo**: Business-Scoped.
- **Função**: Especialista em marketing. Atualiza fotos, mídias públicas, cadastra cupons de desconto e gera relatórios de visualização. **Não visualiza faturas nem responde a leads**.

#### 3.2.6 `business_support` (Operador de Atendimento)
- **Escopo**: Business-Scoped.
- **Função**: Atendente de suporte. Visualiza e responde exclusivamente aos leads e mensagens recebidos dos clientes. **Não altera dados cadastrais nem mídias ou faturas**.

#### 3.2.7 `business_viewer` (Visualizador / Auditor da Empresa)
- **Escopo**: Business-Scoped.
- **Função**: Acesso estritamente de leitura ao painel e relatórios de métricas da empresa. **Não acessa faturas nem executa alterações**.

---

## 4. Catálogo Unificado de Permissões Granulares

As permissões utilizam a nomenclatura padronizada `<modulo>:<recurso>:<acao>` com verbos operacionais estritos:

| Módulo | Código da Permissão | Descrição Granular |
|---|---|---|
| **Platform** | `tenant:view_public` | Visualizar informações públicas básicas do tenant |
| | `tenant:settings:update` | Alterar configurações operacionais do tenant |
| | `tenant:domains:manage` | Gerenciar domínios customizados e SSL |
| | `tenant:features:toggle` | Ativar ou desativar Feature Flags do tenant |
| **RBAC** | `rbac:roles:manage` | Criar e editar papéis customizados |
| | `rbac:user_roles:assign` | Atribuir papéis a usuários do tenant |
| | `rbac:user_roles:revoke` | Revogar papéis de usuários do tenant |
| **Directory** | `business:create` | Cadastrar nova empresa no diretório |
| | `business:view_public` | Visualizar dados públicos da empresa publicada |
| | `business:view_private` | Visualizar painel privado da empresa |
| | `business:update` | Editar dados cadastrais básicos da empresa |
| | `business:deactivate` | Desativar temporariamente a empresa |
| | `business:restore` | Reativar empresa desativada |
| | `business:delete_permanently`| Excluir permanentemente o registro da empresa |
| | `business:ownership:transfer` | Transferir a titularidade da empresa para outro usuário |
| | `business:members:assign` | Convidar e atribuir colaboradores em `business_members` |
| | `business:members:revoke` | Revogar colaboradores de `business_members` |
| | `business:locations:manage` | Adicionar e editar endereços da empresa |
| | `business:contacts:manage` | Adicionar e editar contatos (WhatsApp, E-mail, Redes) |
| | `business:hours:manage` | Alterar horários de funcionamento semanal |
| | `business:media:create` | Adicionar fotos e mídias à galeria |
| | `business:media:delete` | Remover fotos e mídias da galeria |
| | `categories:manage` | Criar e alterar categorias e subcategorias |
| **Masonic** | `organization:create` | Cadastrar Loja ou Potência Maçônica |
| | `organization:update` | Editar dados da organização institucional |
| | `organization:view_public` | Visualizar dados públicos institucionais |
| | `organization:view_members` | Visualizar quadro de membros resguardado |
| | `organization:people:manage` | Cadastrar e gerenciar membros institucionais |
| **Credentials**| `credential:type:manage` | Cadastrar tipos de selos no sistema |
| | `credential:request` | Solicitar emissão do selo de regularidade |
| | `credential:verify` | Aprovar ou rejeitar emissão de selo |
| | `credential:revoke` | Revogar selo emitido anteriormente |
| | `credential:evidence:upload` | Anexar documentos e comprovantes de verificação |
| **Founder** | `founder:qualify` | Conceder número e registro de Membro Fundador |
| | `founder:revoke` | Suspender ou revogar qualificação de Fundador |
| **Marketing** | `highlight:create` | Agendar destaque visual (home, carrossel, busca) |
| | `highlight:cancel` | Cancelar destaque visual ativo |
| | `sponsorship:manage` | Configurar patrocínio de canais/categorias |
| **Billing** | `plans:manage` | Definir preços e versões dos planos |
| | `subscription:create` | Contratar novo plano comercial |
| | `subscription:upgrade` | Executar upgrade imediato de plano |
| | `subscription:downgrade` | Agendar downgrade para o término da vigência |
| | `subscription:cancel` | Solicitar cancelamento de assinatura |
| | `invoices:view` | Visualizar faturas e detalhamento de cobrança |
| | `payments:create` | Efetuar pagamento ou enviar comprovante |
| | `payments:refund` | Processar estorno ou reembolso financeiro |
| | `financial:adjust` | Conceder créditos manuais ou abates |
| **Contracts** | `legal_docs:manage` | Criar e atualizar versões de Termos de Uso |
| | `legal_docs:accept` | Registrar aceite formal de documento legal |
| | `privacy:export_own` | Exportar relatórios de dados pessoais LGPD |
| | `privacy:revoke_consent`| Revogar consentimentos de tratamento de dados |
| **Entitlements**| `entitlement:def:manage` | Definir novos entitlements no catálogo |
| | `entitlement:grant:create` | Conceder direitos de uso a uma empresa |
| | `entitlement:override` | Forçar alteração de cota por autorização admin |
| | `entitlement:usage:view` | Consultar consumo de cotas e limites |
| **CRM Internal**| `crm:stages:manage` | Configurar etapas do pipeline de vendas |
| | `crm:prospect:create` | Cadastrar prospecto comercial de empresa |
| | `crm:opportunity:manage`| Criar e mover oportunidades no funil |
| | `crm:proposal:send` | Emitir proposta financeira de plano |
| | `crm:renewals:manage` | Gerenciar casos de renovação de contratos anuais |
| **Leads** | `lead:send` | Enviar mensagem/orçamento para empresa |
| | `lead:view_received` | Visualizar leads recebidos pela própria empresa |
| | `lead:reply` | Responder mensagem de cliente no lead |
| | `lead:status:update` | Alterar status do lead (novo, contactado, ganho) |
| **Import** | `import:job:create` | Enviar planilha CSV/XLSX para carga |
| | `import:job:execute` | Processar e importar linhas validadas |
| **Analytics** | `analytics:tenant:view` | Visualizar dashboard geral do tenant |
| | `analytics:business:view`| Visualizar métricas da própria empresa |
| | `audit:logs:view` | Consultar registros de auditoria do sistema |
| **Support** | `support:elevation:request` | Solicitar sessão de acesso elevado temporário |
| | `support:elevation:approve` | Aprovar sessão de acesso elevado (segundo operador) |
| | `support:elevated_session:use` | Utilizar sessão elevada aprovada em endpoint auditado |

---

## 5. Matriz RBAC Oficial (100% Papéis × 100% Permissões)

Esta matriz especifica os privilégios atribuídos exclusivamente aos papéis do sistema:

| Permissão | `master` | `tenant_admin` | `crm_sales` | `business_owner` | `business_co_owner` | `business_manager` | `business_finance` | `business_marketing` | `business_support` | `business_viewer` |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `tenant:view_public` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `tenant:settings:update` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `tenant:domains:manage` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `tenant:features:toggle` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `rbac:roles:manage` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `rbac:user_roles:assign` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `rbac:user_roles:revoke` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `business:create` | ✅ | ✅ | ❌ | ❌* | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `business:view_public` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `business:view_private` | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `business:update` | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `business:deactivate` | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `business:restore` | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `business:delete_permanently`| ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `business:ownership:transfer`| ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `business:members:assign` | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `business:members:revoke` | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `business:locations:manage` | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `business:contacts:manage` | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `business:hours:manage` | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `business:media:create` | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| `business:media:delete` | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| `categories:manage` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `organization:create` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `organization:update` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `organization:view_public` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `organization:view_members` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `organization:people:manage` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `credential:type:manage` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `credential:request` | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `credential:verify` | ✅ | ✅* | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `credential:revoke` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `credential:evidence:upload`| ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `founder:qualify` | ✅ | ✅* | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `founder:revoke` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `highlight:create` | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `highlight:cancel` | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `sponsorship:manage` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `plans:manage` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `subscription:create` | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `subscription:upgrade` | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `subscription:downgrade` | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `subscription:cancel` | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `invoices:view` | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `payments:create` | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `payments:refund` | ✅ | ✅* | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `financial:adjust` | ✅ | ✅* | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `legal_docs:manage` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `legal_docs:accept` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `privacy:export_own` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `privacy:revoke_consent`| ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `entitlement:def:manage` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `entitlement:grant:create` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `entitlement:override` | ✅ | ✅* | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `entitlement:usage:view` | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| `crm:stages:manage` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `crm:prospect:create` | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `crm:opportunity:manage`| ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `crm:proposal:send` | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `crm:renewals:manage` | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `lead:send` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `lead:view_received` | 🔒* | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `lead:reply` | 🔒* | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `lead:status:update` | 🔒* | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `import:job:create` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `import:job:execute` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `analytics:tenant:view` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `analytics:business:view`| ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| `audit:logs:view` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `support:elevation:request`| ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `support:elevation:approve`| ✅* | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `support:elevated_session:use`| 🔒* | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

> **Legenda de Restrições**:
> - `✅*`: Exige regra de Anti-Self-Approval (`requested_by != approved_by`).
> - `🔒*`: Requer sessão de Acesso Elevado (`elevated_access_sessions`) com aprovação prévia de segundo operador (`approved_by != user_id`) e consulta por endpoint/RPC auditado.
> - `❌*`: A criação inicial de uma empresa não depende do papel `business_owner`, pois ele é atribuído dinamicamente **após** a inserção.

---

### 5.1 Tabela de Regras Contextuais & Estados Derivados

Estas regras não constituem papéis em `user_roles`, sendo avaliadas contextualmente via RLS:

| Contexto / Estado | Descrição da Regra | Condição de Validação no RLS | Permissões Autorizadas |
|---|---|---|---|
| **`authenticated_self`** | Próprio titular dos dados pessoais | `auth.uid() = record.user_id` | `legal_docs:accept`, `privacy:export_own`, `privacy:revoke_consent` |
| **`usuario_comum`** | Usuário autenticado ativo no tenant | `auth.uid() IS NOT NULL AND tenant_members.status = 'active'` | `business:create` (se `tenant_features.allow_self_registration = true`), `lead:send` (para empresas ativas) |
| **`irmao_membro`** | Estado derivado de credencial maçônica ativa | `EXISTS(credential_issuances WHERE user_id = auth.uid() AND status = 'verified')` | Acesso a cupons e vantagens restritas a membros |
| **`visitante`** | Navegação pública anônima | `auth.uid() IS NULL` | `tenant:view_public`, `business:view_public`, `lead:send` (se `tenant_features.allow_anonymous_leads = true`) |

---

## 6. Regras de Segregação de Funções e Anti-Self-Approval

Para evitar conflitos de interesse e fraudes administrativas:

1. **Regra de Anti-Self-Approval**: Um administrador (`tenant_admin`) que seja simultaneamente proprietário (`owner`) de uma empresa **NÃO pode autoaprovar**:
   - `credential:verify` (Selo de Regularidade para sua empresa);
   - `founder:qualify` (Registro de Membro Fundador);
   - `financial:adjust` (Concessão manual de créditos ou isenção);
   - `payments:refund` (Processamento de reembolso);
   - `entitlement:override` (Aumento manual de cotas);
   - `support:elevation:approve` (Aprovação de elevação do próprio `master`).
   *Mecanismo de Validação*: As tabelas de solicitação possuem `requested_by` e `approved_by`. A validação RLS e de banco exige `requested_by != approved_by` para mudar o status para 'approved' ou 'verified'.

2. **Isolamento de CRM vs. Leads Privados**:
   - O papel `crm_sales` possui autorização estrita e exclusiva para `crm_*`. O RLS bloqueia o acesso de `crm_sales` às tabelas `public.leads` e `public.lead_messages`.

---

## 7. Delegação, Convites e Ciclo de Vida do Acesso

### 7.1 Gestão de Convites em `business_members`
1. **Envio do Convite**: O `owner` ou `co_owner` informa o e-mail do colaborador e seleciona o papel (`manager`, `finance`, `marketing`, `support`, `viewer`).
2. **Estado Inicial**: Um registro é criado em `public.business_members` com:
   - `status = 'invited'`
   - `invited_email = 'colaborador@email.com'`
   - `invite_token_hash = hash criptográfico seguro do token` *(estratégia definida em ADR de Segurança)*
   - `invite_expires_at = now() + INTERVAL '7 days'`
3. **Aceite pelo Colaborador**: Ao acessar o link com o token, a função valida o hash, vincula `user_id = auth.uid()`, atualiza `status = 'active'` e preenche `accepted_at = now()`.
4. **Revogação de Acesso**: Ao revogar um colaborador, o registro atualiza `status = 'revoked'`, `revoked_at = now()` e `revoked_by = auth.uid()`.

---

## 8. Estrutura de Acesso Elevado e Endpoint Auditado (`elevated_access_sessions`)

Para que o superadministrador (`master`) acesse dados confidenciais privados (ex: leads de anunciantes), a validação exige obrigatoriamente confirmação de papel global `master`, aprovação por **segundo operador** (`approved_by != user_id`), validade e escopo específico:

```sql
CREATE OR REPLACE FUNCTION public.has_elevated_support_access(
  target_tenant_id UUID,
  target_business_id UUID,
  required_scope TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  -- 1. Confirma que o usuário é superadministrador master global
  IF NOT public.has_global_platform_role('master') THEN
    RETURN false;
  END IF;

  -- 2. Valida existência de sessão elevada ativa com aprovação prévia de segundo operador
  RETURN EXISTS (
    SELECT 1 
    FROM public.elevated_access_sessions eas
    WHERE eas.user_id = auth.uid()
      AND (eas.tenant_id = target_tenant_id OR eas.tenant_id IS NULL)
      AND (eas.business_id = target_business_id OR eas.business_id IS NULL)
      AND eas.scope = required_scope
      AND eas.status = 'active'
      AND eas.approved_by IS NOT NULL
      AND eas.approved_at IS NOT NULL
      AND eas.approved_by != eas.user_id -- Anti-Self-Approval
      AND eas.revoked_at IS NULL
      AND eas.expires_at > now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = pg_catalog, public;
```

### 8.1 Fluxo de Execução e Auditoria Obrigatória
Consultas a dados confidenciais via acesso elevado **não são executadas diretamente via cliente PostgREST generico**. O acesso ocorre obrigatoriamente por RPC ou endpoint de backend dedicado (ex: `support_read_private_lead`), que executa o seguinte fluxo transacional:
1. Recebe requisição de leitura do `master`.
2. Invoca `has_elevated_support_access(tenant_id, business_id, 'lead:private:view')`.
3. Insere registro de auditoria inalterável em `public.audit_logs` com `action = 'support.elevated_read'`, `entity_type = 'leads'`, `entity_id = target_lead_id`, `reason = eas.reason`, `user_id = auth.uid()`.
4. Executa a leitura dos dados e retorna o resultado.

---

## 9. Resolução Confiável do Tenant (ADR-004)

```text
Requisição do Cliente (Header/Subdomínio)
  │  1. Gateway / API resolve subdomínio em public.tenant_domains
  ▼
Middleware Confiável (Backend / RPC)
  │  2. Define variável de sessão segura app.current_tenant_id
  ▼
Supabase RLS & Funções SECURITY DEFINER
  │  3. Valida se auth.uid() possui tenant_members(tenant_id, status = 'active')
  │  4. RLS executa query com garantia relacional física
```
> **Nota de Validação Técnica**: A aplicação física do ADR-004 depende de Prova de Conceito (PoC) no runtime PostgREST do Supabase para garantir immutabilidade da variável de sessão antes da liberação das migrations de RLS real.

---

## 10. Hardening de Funções `SECURITY DEFINER` e Pseudocódigo RLS

### 10.1 Função Hardened: `public.has_tenant_role`
```sql
CREATE OR REPLACE FUNCTION public.has_tenant_role(
  target_tenant_id UUID,
  required_role TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  -- 1. Valida membership ativo do usuário no tenant
  IF NOT EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.user_id = auth.uid()
      AND tm.tenant_id = target_tenant_id
      AND tm.status = 'active'
  ) THEN
    RETURN false;
  END IF;

  -- 2. Valida atribuição de papel ativo no tenant
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = target_tenant_id
      AND ur.status = 'active'
      AND (ur.expires_at IS NULL OR ur.expires_at > now())
      AND r.tenant_id = target_tenant_id
      AND r.code = required_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = pg_catalog, public;

REVOKE ALL ON FUNCTION public.has_tenant_role(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_tenant_role(UUID, TEXT) TO authenticated;
```

---

### 10.2 Funções Hardened Globais: `has_global_platform_role` & `has_global_operational_role`
```sql
-- Valida papel de plataforma global (ex: 'master')
CREATE OR REPLACE FUNCTION public.has_global_platform_role(
  required_role TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND ur.status = 'active'
      AND (ur.expires_at IS NULL OR ur.expires_at > now())
      AND r.tenant_id IS NULL
      AND r.is_global = true
      AND r.role_type = 'platform'
      AND r.code = required_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = pg_catalog, public;

-- Valida papel operacional global (ex: 'crm_sales')
CREATE OR REPLACE FUNCTION public.has_global_operational_role(
  required_role TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND ur.status = 'active'
      AND (ur.expires_at IS NULL OR ur.expires_at > now())
      AND r.tenant_id IS NULL
      AND r.is_global = true
      AND r.role_type = 'operational'
      AND r.code = required_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = pg_catalog, public;
```

---

### 10.3 Função Hardened para Autoridade Administrativa em Recursos Não Confidenciais
```sql
CREATE OR REPLACE FUNCTION public.has_tenant_admin_access(
  target_tenant_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.has_tenant_role(target_tenant_id, 'tenant_admin')
      OR public.has_global_platform_role('master');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = pg_catalog, public;
```

---

### 10.4 Função Hardened Estrita de Empresa: `public.has_business_permission`
```sql
CREATE OR REPLACE FUNCTION public.has_business_permission(
  target_tenant_id UUID,
  target_business_id UUID,
  allowed_roles TEXT[]
) RETURNS BOOLEAN AS $$
BEGIN
  -- Valida ESTRITAMENTE o pertencimento ativo na empresa (SEM bypass para tenant_admin/master)
  RETURN EXISTS (
    SELECT 1 
    FROM public.business_members bm
    WHERE bm.user_id = auth.uid()
      AND bm.tenant_id = target_tenant_id
      AND bm.business_id = target_business_id
      AND bm.status = 'active'
      AND bm.role = ANY(allowed_roles)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = pg_catalog, public;
```

---

### 10.5 Definição Lógica de Políticas RLS Separadas por Operação

#### 10.5.1 Tabela `public.business_locations`
```sql
-- SELECT: Leitura pública de empresas publicadas e ativas
CREATE POLICY "RLS_business_locations_select"
  ON public.business_locations FOR SELECT
  USING (
    tenant_id = current_setting('app.current_tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_locations.business_id
        AND b.tenant_id = business_locations.tenant_id
        AND b.publication_status = 'published'
        AND b.is_active = true
    )
  );

-- INSERT / UPDATE / DELETE: Somente gestores da empresa ou autoridade administrativa do tenant
CREATE POLICY "RLS_business_locations_insert"
  ON public.business_locations FOR INSERT
  WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id')::uuid
    AND (
      public.has_business_permission(tenant_id, business_id, ARRAY['owner', 'co_owner', 'manager'])
      OR public.has_tenant_admin_access(tenant_id)
    )
  );
```

#### 10.5.2 Tabela `public.leads` (Isolamento Estrito de Leads Privados)
```sql
-- INSERT: Envio de lead (RLS garante elegibilidade de dados; CAPTCHA e Rate Limit são tratados no API Gateway)
CREATE POLICY "RLS_leads_insert"
  ON public.leads FOR INSERT
  WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = leads.business_id
        AND b.tenant_id = leads.tenant_id
        AND b.publication_status = 'published'
        AND b.is_active = true
    )
    AND (
      auth.uid() IS NOT NULL OR 
      EXISTS (
        SELECT 1 FROM public.tenant_features tf
        WHERE tf.tenant_id = leads.tenant_id
          AND tf.feature_key = 'allow_anonymous_leads'
          AND tf.is_enabled = true
      )
    )
  );

-- SELECT: Somente colaboradores autorizados da empresa OU master com sessão elevada ativa para 'lead:private:view'
CREATE POLICY "RLS_leads_select_advertiser"
  ON public.leads FOR SELECT
  USING (
    tenant_id = current_setting('app.current_tenant_id')::uuid
    AND (
      public.has_business_permission(tenant_id, business_id, ARRAY['owner', 'co_owner', 'manager', 'support'])
      OR public.has_elevated_support_access(tenant_id, business_id, 'lead:private:view')
    )
  );
```

---

## 11. Cenários de Testes de Autorização (Positivos e Negativos)

| ID | Cenário de Teste | Papel / Contexto | Recurso Alvo | Resultado Esperado |
|---|---|---|---|:---:|
| **TC-RBAC-01** | Anunciante lê os leads de sua própria empresa | `business_owner` (Empresa A) | `leads` (Empresa A) | 🟢 PERMITIDO |
| **TC-RBAC-02** | Anunciante tenta ler os leads de empresa concorrente | `business_owner` (Empresa A) | `leads` (Empresa B) | 🔴 NEGADO (0 rows) |
| **TC-RBAC-03** | Admin do Tenant A tenta ler os leads de empresa anunciante sem ser membro | `tenant_admin` (Tenant A) | `leads` (Empresa A) | 🔴 NEGADO (Proteção de Privacidade) |
| **TC-RBAC-04** | Gestor financeiro tenta ler leads da própria empresa | `business_finance` | `leads` (Empresa A) | 🔴 NEGADO |
| **TC-RBAC-05** | Visualizador tenta acessar faturas da empresa | `business_viewer` | `invoices` (Empresa A) | 🔴 NEGADO |
| **TC-RBAC-06** | Agente comercial CRM acessa oportunidades da plataforma | `crm_sales` | `crm_opportunities` | 🟢 PERMITIDO |
| **TC-RBAC-07** | Agente comercial CRM tenta ler leads privados dos anunciantes | `crm_sales` | `leads` (Empresa A) | 🔴 NEGADO |
| **TC-RBAC-08** | Admin do Tenant A tenta autoaprovar selo de sua própria empresa | `tenant_admin` + `owner` | `credential_issuances` | 🔴 NEGADO (`requested_by == approved_by`) |
| **TC-RBAC-09** | Superadministrador `master` acessa lead sem sessão elevada | `master` (sem elevação) | `leads` (Empresa A) | 🔴 NEGADO |
| **TC-RBAC-10** | Superadministrador `master` tenta autoaprovar a própria sessão elevada | `master` | `elevated_access_sessions` | 🔴 NEGADO (Exige `approved_by != user_id`) |
| **TC-RBAC-11** | Superadministrador `master` com elevação aprovada consulta lead via endpoint auditado | `master` (`elevated_session`) | `leads` (Empresa A) | 🟢 PERMITIDO (Auditado em `audit_logs`) |
| **TC-RBAC-12** | Usuário autenticado registra o próprio aceite de Termos | `authenticated_self` | `acceptance_records` | 🟢 PERMITIDO |
| **TC-RBAC-13** | Visitante envia lead para empresa não publicada | `visitante` | `leads` (Empresa Rascunho) | 🔴 NEGADO |

---

## 12. Catálogo e Matriz de Permissões de Vínculo (Masonic Link RBAC Matrix)

Este catálogo estabelece as permissões granulares para a gestão do ciclo de vida dos vínculos comerciais maçônicos, garantindo a segregação de funções entre o usuário declarante, a empresa, os moderadores do tenant e administradores.

### 12.1 Catálogo de Permissões `masonic_link:*`

| Código da Permissão | Descrição | Nível de Risco / Escopo |
|---|---|---|
| `masonic_link:declare` | Permite iniciar a declaração de um novo vínculo comercial | Baixo (Usuário Autenticado) |
| `masonic_link:view_own` | Permite visualizar as declarações de vínculo da própria conta | Baixo (Usuário Autenticado) |
| `masonic_link:update_own` | Permite alterar rascunhos da própria declaração antes da submissão | Baixo (Usuário Autenticado) |
| `masonic_link:submit` | Permite submeter a declaração de vínculo para moderação | Baixo (Usuário Autenticado) |
| `masonic_link:set_primary` | Permite definir qual vínculo é a afiliação principal da empresa | Médio (Gestor da Empresa) |
| `masonic_link:review` | Permite colocar o vínculo em análise pela moderação | Médio (Tenant Moderator) |
| `masonic_link:approve` | Permite aprovar formalmente o vínculo maçônico | Alto (Tenant Moderator / Admin) |
| `masonic_link:request_correction` | Permite solicitar correções ao declarante | Médio (Tenant Moderator) |
| `masonic_link:reject` | Permite rejeitar uma solicitação de vínculo inconsistente | Alto (Tenant Moderator / Admin) |
| `masonic_link:suspend` | Permite suspender temporariamente um vínculo ativo | Alto (Tenant Moderator / Admin) |
| `masonic_link:revoke` | Permite revogar em definitivo o vínculo | Crítico (Tenant Admin) |
| `masonic_link:evidence:view` | Permite visualizar documentos comprovatórios sensíveis | **Crítico / Elevado (Acesso Auditado)** |
| `masonic_link:authorization:manage` | Permite ao proprietário da empresa autorizar/revogar o vínculo | Médio (Business Owner) |
| `masonic_link:public_consent:manage` | Permite gerenciar o consentimento de exibição pública | Médio (Declarante / Business Owner) |
| `masonic_link:contest` | Permite abrir contestação formal contra vínculo ou denúncia | Médio (Usuário Autenticado) |

### 12.2 Mapeamento de Permissões por Papel

| Permissão | Declarante (`user`) | Business Owner (`owner`) | Tenant Moderator (`moderator`) | Tenant Admin (`tenant_admin`) | Elevated Evidence Auditor (`master`) |
|---|:---:|:---:|:---:|:---:|:---:|
| `masonic_link:declare` | 🟢 | 🟢 | 🟢 | 🟢 | 🔴 |
| `masonic_link:view_own` | 🟢 | 🟢 | 🟢 | 🟢 | 🔴 |
| `masonic_link:update_own` | 🟢 (rascunho) | 🔴 | 🔴 | 🔴 | 🔴 |
| `masonic_link:submit` | 🟢 | 🔴 | 🔴 | 🔴 | 🔴 |
| `masonic_link:set_primary` | 🔴 | 🟢 | 🔴 | 🟢 | 🔴 |
| `masonic_link:review` | 🔴 | 🔴 | 🟢 | 🟢 | 🔴 |
| `masonic_link:approve` | 🔴 | 🔴 | 🟢 | 🟢 | 🔴 |
| `masonic_link:request_correction` | 🔴 | 🔴 | 🟢 | 🟢 | 🔴 |
| `masonic_link:reject` | 🔴 | 🔴 | 🟢 | 🟢 | 🔴 |
| `masonic_link:suspend` | 🔴 | 🔴 | 🟢 | 🟢 | 🔴 |
| `masonic_link:revoke` | 🔴 | 🔴 | 🔴 | 🟢 | 🔴 |
| `masonic_link:evidence:view` | 🟢 (próprias) | 🔴 | 🟡 (somente em análise) | 🟢 (auditado) | 🔒 **Acesso Elevado** |
| `masonic_link:authorization:manage` | 🔴 | 🟢 | 🔴 | 🟢 | 🔴 |
| `masonic_link:public_consent:manage` | 🟢 | 🟢 | 🔴 | 🔴 | 🔴 |
| `masonic_link:contest` | 🟢 | 🟢 | 🔴 | 🔴 | 🔴 |

---

## 13. Conclusão

Esta Matriz RBAC consolida a separação rigorosa de escopos, protegendo dados sensíveis de evidências através de privilégios de acesso elevado e auditoria obrigatória.
O **Documento 03 — Matriz RBAC v2.2.0** encerra com sucesso a fase de especificação do modelo de autorização e controle de acesso do produto.

- **Status**: Concluído (v2.2.0 pronta para aprovação definitiva).
- **Próxima Etapa**: Documento 04 — Mapa de Telas.
