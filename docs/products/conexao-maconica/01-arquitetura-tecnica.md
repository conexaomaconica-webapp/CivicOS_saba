# Documento 01 — Arquitetura Técnica: Conexão Maçônica

**Versão:** 1.0.0  
**Status:** Aprovado  
**Base:** `Especificação Funcional v1.1.0`  
**Plataforma:** CivicOS (`foundation-v1.0`)

---

## 1. Contexto e Objetivos

Este documento descreve a arquitetura técnica da **Conexão Maçônica**, o primeiro produto construído sobre a fundação **CivicOS**. O objetivo arquitetural primário é garantir que a fundação permaneça completamente agnóstica a regras de negócio maçônicas, distribuindo as capacidades em três camadas: Platform Core, Plugins Genéricos e Extensões Exclusivas do Produto.

## 2. Topologia do Sistema e Distribuição de Camadas

A arquitetura adota uma topologia modular baseada em composição. Os módulos e responsabilidades estão divididos em três camadas estritas:

### 2.1 Platform Core
A fundação fornece apenas capacidades universais e primitivas técnicas. Não possui regras de negócio comercial ou de produto.
- **Tenant Context:** Isolamento lógico e contexto de execução.
- **Identity and Authentication:** Gestão de usuários e sessões.
- **Authorization Foundation:** Primitivas para RBAC e ABAC.
- **Capability Registry:** Descoberta de módulos e dependências.
- **Feature Flags:** Controle de liberação de funcionalidades.
- **Audit Framework:** Trilha de auditoria base.
- **Privacy Policy Framework:** Primitivas de consentimento e LGPD.
- **Configuration and Secrets:** Gestão segura de configurações.
- **Observability:** Logs, métricas e tracing.
- **Integration Contracts:** Interfaces padronizadas para serviços externos.
- **Primitivas Financeiras:** Moeda, status técnicos, valores monetários e idempotência.

### 2.2 Plugins Genéricos
Módulos de negócio reutilizáveis por múltiplos produtos do CivicOS. Eles não sabem o que é "maçonaria".
- **White Label:** Configuração de marca por tenant.
- **Business Directory:** Diretório de empresas, categorias e atributos (inclui tratamento base de `company_type`).
- **Geolocation:** Serviços espaciais.
- **Content Management:** CMS para artigos, banners, pop-ups e eventos.
- **Coupons and Benefits:** Motor genérico de cupons.
- **Lead Management:** Gestão base de leads (contatos, origens, status).
- **Sales CRM:** Base para prospecção (oportunidades, estágios, propostas).
- **Billing and Subscriptions:** Planos, assinaturas, cobranças, pagamentos e ciclo financeiro.
- **Contracts and Consent:** Aceites versionados e termos.
- **Notifications:** Roteamento e envio (E-mail, In-App, Push).
- **Analytics:** Coleta e agregação de eventos de produto.
- **Badge and Credential Engine:** Emissor genérico de selos (tipo, validade, evidência, status).
- **Import Framework:** Motor genérico para ingestão de dados em lote.

### 2.3 Extensões Exclusivas da Conexão Maçônica
Injetam regras, semânticas e políticas específicas sobre os plugins genéricos.
- **Masonic Organization Domain:** Contratos organizacionais institucionais.
- **Masonic Verification Rules:** Regras para emissão do selo de regularidade.
- **Founder Program Rules:** Políticas comerciais dos fundadores.
- **Masonic Badge Definitions:** Tipos de selos específicos do domínio.
- **Masonic Business Types:** Extensão para lojas de artigos maçônicos e afins.
- **Commercial Plan Configuration:** Parametrização da oferta.
- **Product-specific CRM Policies:** Regras da equipe de vendas da plataforma.
- **Product-specific Lead Policies:** Regras de consentimento maçônico e visibilidade.
- **Masonic Search Semantics:** Pesos e IA específica para o domínio.
- **Masonic Content Taxonomy:** Categorização de eventos e artigos institucionais.

---

## 3. Contextos Delimitados (Bounded Contexts) e Ownership de Dados

Os principais Bounded Contexts definem a propriedade e o isolamento dos dados:

- **Identity & Access Context:** Pertence ao Core. Gerencia JWTs, credenciais e permissões.
- **Directory Context:** Pertence ao Plugin Genérico. Dono das entidades `Company`, `Category`, `Location`.
- **Commerce Context:** Pertence ao Plugin Genérico. Dono das entidades `Subscription`, `Invoice`, `Payment`.
- **Engagement Context:** Pertence aos Plugins Genéricos. Engloba `Leads`, `CRM Oportunidades`, `Coupons`.
- **Masonic Domain Context:** Pertence à extensão do produto. Dono estrito das regras de qualificação (ex: evidências de regularidade, relacionamentos institucionais).

Cada contexto se comunicará preferencialmente por **contratos de integração** ou **eventos de domínio**, evitando joins diretos indiscriminados (cross-context) no nível da aplicação, embora o banco relacional possibilite relações no Schema.

---

## 4. Evolução do Modelo de Organizações

Para garantir a distinção entre Empresas Comerciais e Organizações Institucionais (Lojas Maçônicas), a arquitetura não misturará as duas em uma mesma tabela base `Company`. 

Serão definidos os seguintes **contratos conceituais** de extensão para desenvolvimento futuro, sem que seja necessário criar tabelas físicas no MVP:
- `Organization` (entidade base, ex: Loja Simbólica)
- `OrganizationUnit` (subdivisões)
- `OrganizationRelationship` (hierarquias e obediências)
- `OrganizationMembership` (vínculo de membros/dirigentes)
- `OrganizationEventLink` (eventos institucionais)
- `OrganizationBusinessPartnership` (vínculo com empresas conveniadas)

No MVP, as lojas comerciais que vendem itens maçônicos serão tratadas como Empresas, via extensão configurável `Masonic Business Types` sobre o `Business Directory`.

---

## 5. Modelagem de Benefícios (Entitlements)

A relação entre planos, assinaturas e o que o usuário efetivamente pode fazer não dependerá de um cálculo estático (hardcoded). A arquitetura utilizará o padrão de **Entitlements**:
- **Entitlement:** Direito concedido (ex: 5 banners, selo Fundador).
- **Usage:** Consumo daquele direito.
- **Override:** Exceção administrativa (ex: conceder 1 cupom extra).
- **Source:** Origem do direito (Assinatura do Plano Ouro, Campanha manual, Condição de Fundador).

Isso garante que upgrades, downgrades ou cancelamentos recalculem os Entitlements sem quebrar as regras comerciais ou ignorar exceções.

---

## 6. Fluxos Síncronos e Assíncronos

- **Síncronos:** Ações de leitura do usuário, atualizações de perfil, submissão de leads, checkout de pagamento.
- **Assíncronos:** Geração de faturas recorrentes, processamento do Webhook de pagamento (PIX), envio de e-mails/notificações, ingestão da planilha de importação de empresas, agregação de analytics.

---

## 7. Eventos de Domínio Propostos

A comunicação reativa (desacoplamento) será feita com base em eventos, como:
- `Tenant.Provisioned`
- `Company.Registered` / `Company.VerificationStatusChanged`
- `Subscription.Created` / `Subscription.Renewed` / `Subscription.Canceled`
- `Invoice.Paid` / `Invoice.Overdue`
- `Lead.Created` / `Lead.StatusChanged`
- `CRM.OpportunityWon`

---

## 8. Estratégia de Integração e Infraestrutura Mobile

- **Mobile Strategy:** O sistema suportará Web, Android e iOS. No lançamento do MVP 1A, a interface será um **PWA responsivo**. A API exposta (Backend-as-a-Service no Supabase) já será desenhada como REST/GraphQL consumível por futuros aplicativos nativos, sem necessidade de redesenhar contratos.
- **Gateways de Pagamento:** Integração isolada via interface de `PaymentProvider` para que a abstração de cobrança não dependa do gateway específico (ex: Mercado Pago, Stripe, Pagar.me).

---

## 9. Segurança e Modelo de Ameaças

- **Multi-tenant RLS:** A principal barreira de isolamento de dados. Cada requisição ao banco injetará obrigatoriamente o `tenant_id` via JWT context, garantido por políticas de Row Level Security inegociáveis.
- **Privacidade e LGPD:** Aplicação do princípio de minimização de dados. Endereços IP completos não serão persistidos por padrão. Visitantes não-autenticados terão identificação pseudônima (a estratégia exata — token em cookie, session ID ou first-party ID — será decidida via ADR, sem recorrer diretamente a fingerprinting invasivo ou hashes de IP/user-agent não confiáveis).

---

## 10. Observabilidade, Analytics e Tratamento de Dados

A arquitetura de dados e métricas separará o armazenamento por finalidade e ciclo de vida, com rigorosa minimização de dados:
1. **Raw Event Data / Short-lived Security Data:** Logs de tráfego e tentativas de login. Retenção muito curta.
2. **Pseudonymous Analytics Data:** Eventos de uso vinculados a uma sessão pseudônima ou ID de usuário anonimizado para entender funis. Retenção média.
3. **Aggregated Analytics Data:** Tabelas de projeção (_rollups_) materializadas. Retenção longa, impossível associar a PII. É o que o Anunciante verá.
4. **Business Records with Lawful Purpose:** Dados contratuais, faturas e logs de auditoria (aceite de termos). Propósito legal. Retenção conforme exigência tributária/regulamentar.

---

## 11. Resiliência, Idempotência e Cache

- **Idempotência:** Mandatória para integrações de Billing e ingestão de Webhooks, assegurando que eventos de pagamento duplicados não gerem extensões indevidas de assinatura.
- **Cache e Busca:** 
  - MVP 1A utilizará Full Text Search nativo do banco para o diretório. 
  - Consultas pesadas da página pública serão otimizadas ou cacheadas (Edge Cache ou Materialized Views) se as métricas de performance exigirem.

---

## 12. Estratégia de Arquivos e Mídia
Arquivos estáticos, logotipos, banners e evidências (documentos de verificação) serão salvos no Supabase Storage (ou S3-compatible).
- **Assets Públicos:** Logos, fotos de empresas, banners.
- **Assets Privados:** Documentos probatórios (RG, certificados maçônicos) sujeitos a RLS e URLs assinadas de curtíssima duração.

---

## 13. Riscos e Trade-offs

- **Extensibilidade vs Complexidade:** Usar o padrão Core -> Plugin Genérico -> Extensão mantém a fundação limpa, mas aumenta a barreira inicial para desenvolvedores que precisam navegar em três camadas para implementar um fluxo de venda de planos maçônicos.
- **PWA vs Nativo:** Adiar o App Nativo reduz _time-to-market_ e custo, mas impede explorar tráfego orgânico de App Stores no curto prazo.
- **Event-Driven:** Adoção de eventos melhora o desacoplamento, mas dificulta o rastreio síncrono. Onde a consistência imediata for vital (ex: Autenticação), fluxos orquestrados e síncronos serão preferidos. A autenticação é um fluxo síncrono de infraestrutura. O gateway valida identidade, sessão e contexto do tenant. A autorização de domínio permanece responsabilidade de cada bounded context, evitando acoplamento desnecessário entre módulos.

---

## 14. Decisões Arquiteturais e ADRs Necessários

As seguintes decisões não serão travadas neste documento e deverão gerar ADRs (Architecture Decision Records) específicos durante a modelagem:
1. **ADR-002: Modelo Físico de Renovação:** Avaliar se renovações manterão a mesma linha de `Subscription` adicionando períodos (SubscriptionPeriods) ou se gerarão uma nova tupla `Subscription` por ciclo (2026, 2027).
2. **ADR-003: Estratégia de Pseudonimização:** Escolha do método de tracking ético de visitantes para analytics do anunciante (Cookie vs Session ID).

---

## 15. Restrições e Diretrizes para o Schema SQL (Próxima Fase)

Ao avançar para o Documento 02 (Schema SQL), as seguintes regras impostas por esta Arquitetura não podem ser violadas:
- O CRM da plataforma e o Gestor de Leads do anunciante **NÃO** podem compartilhar a mesma tabela física, pois pertencem a bounded contexts de operação e tenant diferentes.
- A condição de fundador, o status de verificação maçônica e os planos vigentes devem possuir persistência independente e não compor um campo único do tipo `badge`.
- Toda tabela pertencente aos Bounded Contexts de negócio deverá obrigatoriamente possuir `tenant_id` e políticas RLS restritas ao seu contexto de permissão.

---

## 16. Extensão Arquitetural: Masonic Business Link Policy

Este módulo de extensão define como o vínculo comercial maçônico se integra à arquitetura da plataforma sem contaminar o Kernel da Fundação CivicOS.

### 16.1 Composição de Serviços e Módulos
A arquitetura do vínculo opera através da composição desacoplada dos seguintes componentes:
1. **Business Directory (Foundation):** Fornece o Aggregate Root `Business` neutro (dados cadastrais de mercado).
2. **Masonic Domain Extension (Plugin):** Gerencia os vínculos institucionais e comerciais (`BusinessMasonicLink`) suportando as 8 categorias de persistência (`owner`, `equity_partner`, `family_owner`, `employee`, `executive`, `sales_representative`, `authorized_agent`, `institutional_partner`).
3. **Credential Engine:** Valida evidências, credenciais de irmãos e declarações institucionais.
4. **Moderation Service:** Gerencia o ciclo de vida unificado de 10 estados (`draft`, `pending_verification`, `under_review`, `correction_requested`, `approved`, `active`, `rejected`, `suspended`, `expired`, `revoked`).
5. **Authorization & Consent Service:** Administra autorizações empresariais auditáveis com escopos (`company_listing`, `brand_usage`, etc.) e preferências de consentimento granular de exibição.
6. **Contest Management Engine:** Processa contestações formais contra vínculos ou denúncias maliciosas sem suspensão automática prévia.
7. **Search and Ranking Engine:** Aplica a regra de ranking em 7 níveis onde o vínculo maçônico opera exclusivamente como critério secundário de desempate.
8. **Consent & Privacy (LGPD):** Controla a expiração de URLs pré-assinadas de evidências e o descarte seguro de arquivos.

### 16.2 Desacoplamento do Aggregate Root `Business`
- **Independência de Domínio:** O vínculo maçônico **NÃO** fica embutido ou serializado como campo interno no Aggregate `Business` da Fundação.
- **Relação 1:N Externa:** O modelo admite múltiplos vínculos por empresa (`Business 1 ── N BusinessMasonicLink`), cada qual com seu ciclo de vida independente.
- **Temporalidade e Verificabilidade:** Todo vínculo é temporal (prazo de vigência e histórico imutável) e verificável via `Credential Engine`.
- **Diferenciação Semântica:** O estado `approved` (validação de moderação) é distinto do estado `active` (aprovado + validade vigente + autorização e consentimento ativos). Apenas o estado `active` concede elegibilidade de exibição no guia.
