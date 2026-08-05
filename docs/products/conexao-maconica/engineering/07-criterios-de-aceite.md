# Documento 07 — Critérios de Aceite da Aplicação

**Versão:** 1.0.0
**Status:** Em Homologação Documental
**Base:** `Docs 00, 02, 03, 04, 05, 06 (Congelados)` & `Community Framework v1.0`
**Produto:** Conexão Maçônica
**Plataforma:** CivicOS (`foundation-v1.0`)

---

## 1. Visão Geral e Princípios de Aceite (Versão 1.0)

Este documento estabelece os **Critérios de Aceite Objetivos e Testáveis** para o desenvolvimento do produto **Conexão Maçônica** sobre a plataforma **CivicOS**.

### 1.1 Diretrizes de Governança
1. **Desacoplamento de Implementação**: Os cenários de aceite descrevem o comportamento funcional do usuário e contratos de negócios. Detalhes de tabelas físicas SQL e rotas navegáveis são mapeados exclusivamente na Matriz de Rastreabilidade.
2. **Nomenclatura Canônica de Eventos EDA (Doc 06)**: Eventos de domínio invocados nos critérios seguem rigorosamente os namespaces e versionamento formal do Doc 06 (ex: `billing.payment.approved.v1`, `directory.business.published.v1`).
3. **Agrupamento por Acceptance Packages (AP)**: O Vertical Slice Crítico é organizado em 5 Pacotes de Aceite (`AP-001` a `AP-005`), priorizados por criticidade (`P0 - Critical`, `P1 - High`, `P2 - Medium`), servindo como base direta para o backlog de desenvolvimento.
4. **Padrão de Especificação Gherkin (Given / When / Then)**: Todos os cenários operacionais são expressos na sintaxe Gherkin para automação via BDD (*Behavior-Driven Development*).

---

## 2. Critérios Transversais Reutilizáveis (Global Acceptance Criteria)

Os critérios abaixo aplicam-se obrigatoriamente a todas as interfaces e serviços da aplicação:

### 2.1 Autenticação, Sessão e Contexto do Usuário
- **CRIT-TRN-001 (Sessão Única JWT)** `[Priority: P0]`: Toda requisição autenticada deve transportar o token JWT no header `Authorization: Bearer <token>`.
- **CRIT-TRN-002 (Expiração e Refresh)** `[Priority: P0]`: A sessão expirada deve ser renovada silenciosamente via token de refresh sem perda do estado de rascunho de formulários em andamento.
- **CRIT-TRN-003 (Logout Limpo)** `[Priority: P1]`: O encerramento da sessão deve revogar os tokens locais, limpar a sessão da aplicação e redirecionar para a tela de login (`PUB-011`).

### 2.2 Autorização RBAC e Restrições de Perfil
- **CRIT-TRN-004 (Checagem Dupla Client/Server)** `[Priority: P0]`: O componente UI de permissão oculta elementos visuais, mas o servidor deve obrigatoriamente validar a permissão RBAC em **100% dos endpoints**.
- **CRIT-TRN-005 (Anti-Self-Approval)** `[Priority: P0]`: Em operações restritas com aprovação (ex: `credential:verify`, `founder:qualify`, `payment:refund`), o servidor deve rejeitar requisições onde o solicitante for o próprio aprovador com erro `HTTP 422 Unprocessable Entity`.
- **CRIT-TRN-006 (Acesso Negado Padrão)** `[Priority: P1]`: Qualquer tentativa de acesso não autorizado deve exibir a mensagem padrão de permissão negada (`AUX-005`) com registro auditável.

### 2.3 Tenancy, Isolamento Multi-Tenant e Cross-Tenant Safety
- **CRIT-TRN-007 (Invariante do Contexto do Tenant)** `[Priority: P0]`: Toda requisição deve resolver a instância ativa da comunidade via subdomínio/host ou identificador de tenant.
- **CRIT-TRN-008 (Isolamento de Dados por Sessão)** `[Priority: P0]`: As regras de acesso devem isolar estritamente os registros ao tenant ativo. A tentativa de leitura ou escrita entre instâncias diferentes deve retornar zero linhas ou erro de acesso.

### 2.4 Escopo por Empresa e Organização
- **CRIT-TRN-010 (Separação Business vs Organization)** `[Priority: P0]`: Operações comerciais da empresa utilizam privilégios de empresa (`business:*`). Operações institucionais de Lojas/Potências utilizam privilégios de organização (`organization:*`).
- **CRIT-TRN-011 (Delegação e Co-propriedade)** `[Priority: P1]`: Um co-proprietário possui direitos operacionais plenos, mas não pode transferir a titularidade principal nem excluir a empresa permanentemente.

### 2.5 LGPD, Consentimento e Minimização de Dados
- **CRIT-TRN-012 (Registro de Aceite com Hash)** `[Priority: P0]`: Todo aceite de termos e políticas (`legal_docs:accept`) deve gravar o registro do consentimento com o identificador da versão e o hash SHA-256 da minuta.
- **CRIT-TRN-013 (Pseudonimização de Acessos)** `[Priority: P1]`: O armazenamento bruto de IP e agentes de navegação é proibido. Registros analíticos públicos utilizam identificadores pseudonimizados por tenant.
- **CRIT-TRN-014 (Exportação e Revogação LGPD)** `[Priority: P2]`: O titular pode solicitar a exportação de seus dados (`privacy:export_own`) e revogar consentimentos opcionais (`privacy:revoke_consent`).

### 2.6 Auditoria Geral e Rastreabilidade
- **CRIT-TRN-015 (Registro Imutável em Trilha de Auditoria)** `[Priority: P0]`: Toda ação de escrita em entidades críticas (empresas, contratos, faturas, permissões, selos e temas) deve disparar um registro imutável de auditoria contendo tenant, ator, ação, recurso, valores anteriores/novos e marca temporal.

### 2.7 Acessibilidade e Conformidade WCAG 2.1 AA
- **CRIT-TRN-016 (Contraste Mínimo)** `[Priority: P1]`: O contraste de texto para fundos no tema claro e escuro deve ser superior a **4.5:1** para texto normal e **3.0:1** para componentes gráficos.
- **CRIT-TRN-017 (Navegação por Teclado e Foco)** `[Priority: P1]`: 100% dos elementos interativos devem ser focáveis via tecla `Tab` com indicador de foco visual visível.
- **CRIT-TRN-018 (Leitores de Tela e ARIA)** `[Priority: P1]`: Inputs devem possuir rotulagem acessível e modais devem aplicar atributos ARIA adequados.

### 2.8 Responsividade e Experiência Mobile (Capacitor PWA)
- **CRIT-TRN-019 (Layout Fluido)** `[Priority: P0]`: A interface deve se adaptar a telas de 320px a 2560px sem rolagem horizontal indesejada.
- **CRIT-TRN-020 (Touch Targets)** `[Priority: P1]`: Elementos clicáveis em telas sensíveis ao toque devem possuir área mínima de **44x44px**.

### 2.9 Suporte a Temas (Light/Dark Mode) e Governança Visual
- **CRIT-TRN-021 (Contrato Semântico de Tokens)** `[Priority: P0]`: A estilização deve consumir exclusivamente os tokens semânticos do Design System (`--color-surface-base`, `--color-text-primary`, `--color-primary-500`), sendo proibido o uso de cores fixas arbitrárias.

### 2.10 Gestão de Estados de Interface (Loading, Empty, Error, Permission Denied)
- **CRIT-TRN-022 (Auxiliares Obrigatórios)** `[Priority: P1]`:
  - Carregamentos ativam visualização de estrutura em esqueleto (`AUX-001`).
  - Listas sem resultados renderizam estado vazio (`AUX-002`).
  - Conteúdo não encontrado renderiza 404 (`AUX-003`).
  - Falhas de comunicação renderizam 500 (`AUX-004`).
  - Bloqueios de permissão renderizam 403 (`AUX-005`).

### 2.11 Validação de Formulários
- **CRIT-TRN-023 (Validação e Mensagens Inline)** `[Priority: P0]`: Validações de formato (CNPJ, CPF, E-mail, CEP) devem ocorrer em tempo real com exibição de erros junto ao campo correspondente.

### 2.12 Upload de Arquivos e Armazenamento Privado
- **CRIT-TRN-024 (Sanitização e Acesso Seguro)** `[Priority: P0]`: Arquivos enviados devem ser validados quanto ao tipo de mídia (imagem/PDF), tamanho máximo (10MB) e armazenados em repositório privado com acesso público via links temporários assinados.

### 2.13 Desempenho e Core Web Vitals
- **CRIT-TRN-025 (Métricas Alvo)** `[Priority: P1]`: Maior renderização de conteúdo (LCP) < 2.5s, tempo de resposta a interações < 100ms e deslocamento de layout (CLS) < 0.1.

### 2.14 Event-Driven Architecture (EDA) e Idempotência
- **CRIT-TRN-026 (Registro Concorrente de Eventos)** `[Priority: P0]`: A alteração do estado da entidade e o registro do evento de domínio devem ocorrer de forma atômica na mesma transação.
- **CRIT-TRN-027 (Processamento Idempotente)** `[Priority: P0]`: Consumidores de eventos devem validar a execução prévia. Processamentos duplicados devem ser ignorados sem gerar erros.

### 2.15 Observabilidade e Tracing
- **CRIT-TRN-028 (Rastreabilidade Distribuída)** `[Priority: P1]`: Eventos e requisições devem carregar identificadores de rastreamento (`trace_id` e `correlation_id`) em toda a cadeia de execução.

### 2.16 Proteção e Segurança da Informação
- **CRIT-TRN-029 (Prevenção de Vulnerabilidades)** `[Priority: P0]`: Proteção ativa contra injeção de código, sanitização de textos ricos e tratamento de tokens de sessão seguros.

### 2.17 Cobertura de Testes Automatizados
- **CRIT-TRN-030 (Qualidade de Código)** `[Priority: P1]`: Testes unitários para regras de domínio, testes de integração para rotas de serviço e testes ponta a ponta para a jornada principal.

### 2.18 Definition of Done (DoD) Global
- **CRIT-TRN-031 (Critério de Conclusão)** `[Priority: P0]`: Uma funcionalidade é considerada concluída somente se:
  1. Cumprir 100% dos cenários especificados;
  2. Possuir validação de testes automatizados;
  3. Apresentar verificação de código limpa sem erros de estilo/tipagem;
  4. Gerar registros de auditoria e eventos previstos;
  5. Obter homologação visual no Design System v1.0.

---

## 3. Requisitos Não-Funcionais (Non-Functional Requirements — NFRs)

Especificação declarativa das restrições técnicas de infraestrutura e operação:

| ID NFR | Categoria | Parâmetro Alvo / Restrição Técnica | Mecanismo de Validação |
|---|---|---|---|
| **NFR-001** | Disponibilidade | **99.5% de Uptime mensal** para serviços de leitura do guia público. | Monitoramento de disponibilidade de rotas sintéticas. |
| **NFR-002** | Tempo de Resposta | **p95 < 200ms** para leitura de API e **p95 < 500ms** para escritas de formulários. | Métricas de latência no servidor de aplicação. |
| **NFR-003** | Escalabilidade | Suporte a **500 requisições simultâneas por segundo (RPS)** sem degradação de LCP. | Testes de carga antes do lançamento de instâncias. |
| **NFR-004** | Backup & Redundância | Backup diário automatizado com retenção rotativa de 30 dias. | Teste periódico de restauração em ambiente isolado. |
| **NFR-005** | RPO (Recovery Point) | **RPO < 5 minutos** em caso de falha física no banco primário. | Replicação síncrona/assíncrona do banco relacional. |
| **NFR-006** | RTO (Recovery Time) | **RTO < 1 hora** para restauração total dos serviços da plataforma. | Plano de contingência e failover automatizado. |
| **NFR-007** | Rate Limiting | Máximo de **100 requisições/minuto por IP** para rotas públicas e **300 req/min** autenticadas. | Bloqueio de tráfego abusivo no gateway da plataforma. |
| **NFR-008** | Limite de Upload | Limite máximo de **10MB por arquivo** para documentos e mídias de empresas. | Validação no cliente e rejeição imediata na API de upload. |
| **NFR-009** | Timeout de API | Timeout máximo de **10 segundos** para execução de endpoints síncronos. | Encerramento automático de conexões pendentes pelo gateway. |
| **NFR-00A** | Latência da Mensageria | Processamento assíncrono de eventos pelo worker em **menos de 2 segundos** pós-gravação. | Monitoramento do tempo de retenção de eventos na fila. |

---

## 4. Matriz de Riscos Técnicos e Mitigações (Risk Matrix)

| ID Risco | Descrição do Risco | Impacto | Probabilidade | Estratégia de Mitigação Arquitetural |
|---|---|---|---|---|
| **RISK-001** | Gateway de Pagamento Indisponível | Alto | Média | Geração de QR Code PIX estático/contingência com baixa assíncrona pós-reestabelecimento. |
| **RISK-002** | Disparo Duplicado de Webhooks | Médio | Alta | Verificação idempotente de eventos em `event_consumptions` via chave única `(event_id, consumer_name)`. |
| **RISK-003** | Exclusão/Alteração Cross-Tenant | Crítico | Baixa | Imposição rigorosa de RLS no Supabase e validação de Foreign Keys compostas `(tenant_id, business_id)`. |
| **RISK-004** | Replay Duplicado na DLQ | Médio | Média | Exigência de sessão elevada ativa, justificativa auditada e verificação de idempotência no consumidor. |
| **RISK-005** | Repositório de Mídias Indisponível | Médio | Baixa | Servir mídias públicas através de rede de distribuição de conteúdo (CDN) com cache distribuído. |

---

## 5. Acceptance Packages (Vertical Slice Crítico Organizado)

O Vertical Slice Crítico é estruturado em **5 Pacotes de Aceite (`AP-001` a `AP-005`)** que cobrem a jornada de ponta a ponta:

---

### 5.1 Acceptance Package AP-001: Descoberta & Busca Pública

#### CRIT-VSC-001: Navegação da Home e Busca Global `[Priority: P0]` `[AP-001]`
- **Objetivo**: Permitir que visitantes pesquisem empresas no diretório por termo, categoria, localização ou exibição em mapa.
- **Atores**: `public`.
- **Pré-condições**: Instância da comunidade ativa e publicada.
- **Telas Mapeadas**: `PUB-002`, `PUB-003`, `PUB-005`.

```gherkin
Cenário: Busca de empresas cadastradas por termo e categoria
  Dado que o visitante acessa a Home do Guia Comercial
  Quando digitar "Oficina" no campo de busca global
  E selecionar a categoria "Automotivo"
  E acionar a ação de busca
  Então o sistema deve apresentar a lista de empresas ativas correspondentes aos filtros
  E deve permitir alternar para a exibição dos resultados no mapa interativo
```

- **Validações & Estados**: Termo sanitizado; exibe estado em esqueleto (`AUX-001`) durante o carregamento e estado vazio (`AUX-002`) caso não existam resultados.
- **Eventos Disparados**: Dispara evento analítico `analytics.search.performed.v1`.

---

#### CRIT-VSC-002: Exibição do Perfil Público de Empresa Aprovada `[Priority: P0]` `[AP-001]`
- **Objetivo**: Exibir os dados comerciais públicos da empresa, selos de verificação, horários, endereço e meios de contato.
- **Atores**: `public`.
- **Pré-condições**: Empresa com cadastro aprovado e assinatura comercial ativa.
- **Telas Mapeadas**: `PUB-007`.

```gherkin
Cenário: Visualização do perfil público de uma empresa aprovada
  Dado que a empresa "Oficina Maçônica Irmãos" está aprovada e ativa
  Quando o visitante acessar a página pública da empresa
  Então o sistema deve exibir os dados cadastrais, localização, mídias e insígnia de verificação comunitária
  E se a assinatura da empresa estiver suspensa ou inativa, o acesso público deve retornar estado de conteúdo não encontrado (AUX-003)
```

---

### 5.2 Acceptance Package AP-002: Onboarding & Vínculo Comercial

#### CRIT-VSC-003: Cadastro do Anunciante e Criação do Rascunho da Empresa `[Priority: P0]` `[AP-002]`
- **Objetivo**: Registrar o responsável pelo anúncio e criar o rascunho cadastral da empresa.
- **Atores**: Anunciante autenticado (`business:create`).
- **Pré-condições**: Anunciante autenticado na plataforma.
- **Telas Mapeadas**: `ADV-001`, `ADV-002`.

```gherkin
Cenário: Criação de rascunho de empresa na etapa inicial de cadastro
  Dado que o anunciante concluiu a identificação inicial
  Quando preencher os campos de CNPJ, Razão Social, Nome Fantasia, WhatsApp e Categoria
  E declarar sua relação com a empresa (Proprietário ou Representante)
  E acionar a confirmação da etapa
  Então o sistema deve gravar os dados da empresa em formato de rascunho
  E deve vincular o anunciante como titular principal da empresa
  E deve avançar para a próxima etapa do assistente de cadastro
```

- **Validações**: Validação algorítmica de CNPJ e verificação de duplicidade de CNPJ ativo no mesmo tenant.

---

#### CRIT-VSC-004: Gate de Autorização Empresarial Condicional `[Priority: P0]` `[AP-002]`
- **Objetivo**: Exigir declaração formal de autorização empresarial revogável quando o responsável não for proprietário/sócio direto.
- **Atores**: Anunciante autenticado (`business:update`).
- **Pré-condições**: Rascunho da empresa criado no cadastro.
- **Telas Mapeadas**: `ADV-007b`.

```gherkin
Cenário: Interrupção do cadastro para representante sem autorização anexada
  Dado que o anunciante declarou ser "Representante Comercial / Procurador"
  E não possui registro de sócio no CNPJ
  Quando tentar avançar para a escolha do plano comercial
  Então o sistema deve interromper o avanço e apresentar o formulário de Autorização Empresarial
  E não deve permitir o prosseguimento até que a autorização válida seja registrada com hash de integridade
```

```gherkin
Cenário: Prosseguimento direto para Proprietário ou Sócio
  Dado que o anunciante declarou ser "Proprietário / Sócio Direto"
  Quando confirmar os dados empresariais
  Então o sistema deve liberar o avanço direto para a etapa de Escolha do Plano Comercial
```

---

### 5.3 Acceptance Package AP-003: Contratação & Pagamento

#### CRIT-VSC-005: Seleção do Plano Comercial e Resumo `[Priority: P0]` `[AP-003]`
- **Objetivo**: Permitir a escolha da oferta de anúncio comercial e apresentar o resumo financeiro da contratação.
- **Atores**: Anunciante autenticado (`subscription:create`).
- **Pré-condições**: Rascunho da empresa salvo e autorização válida (se aplicável).
- **Telas Mapeadas**: `ADV-003`, `ADV-004`.

```gherkin
Cenário: Escolha do plano comercial anual
  Dado que o anunciante acessa a etapa de seleção de planos
  Quando escolher a oferta "Plano Profissional Anual"
  E confirmar a seleção
  Então o sistema deve registrar a escolha da assinatura em formato rascunho
  E deve apresentar o resumo dos valores e condições contratuais na etapa seguinte
```

---

#### CRIT-VSC-006: Aceite e Assinatura Eletrônica de Contrato `[Priority: P0]` `[AP-003]`
- **Objetivo**: Apresentar a minuta contratual personalizada e colher a assinatura eletrônica com hash de integridade.
- **Atores**: Anunciante titular (`contract:sign`).
- **Pré-condições**: Resumo comercial aprovado na etapa anterior.
- **Telas Mapeadas**: `ADV-005`.

```gherkin
Cenário: Assinatura eletrônica da minuta de contrato comercial
  Dado que a minuta contratual foi gerada com base nas condições comerciais vigentes
  Quando o anunciante confirmar o aceite dos termos
  E informar seu nome completo e identificador pessoal para assinatura
  Então o sistema deve gerar o hash SHA-256 de integridade do documento
  E deve atualizar o status do contrato para assinado
  E deve disponibilizar a navegação para o checkout de pagamento
```

- **Evento EDA Disparado**: Grava o evento `legal.contract.signed.v1`.

---

#### CRIT-VSC-007: Processamento de Checkout e Confirmação de Pagamento `[Priority: P0]` `[AP-003]`
- **Objetivo**: Processar a cobrança do plano comercial e ativar os registros financeiros correspondentes.
- **Atores**: Anunciante titular (`payment:create`).
- **Pré-condições**: Contrato comercial no status assinado.
- **Telas Mapeadas**: `ADV-006`.

```gherkin
Cenário: Confirmação de pagamento da fatura de anúncio
  Dado que o anunciante submeteu os dados de pagamento na etapa de checkout
  Quando o provedor de pagamento confirmar a liquidação do valor
  Então o sistema deve registrar a fatura como paga
  E deve atualizar o status da assinatura comercial para ativa
  E deve liberar o avanço para a etapa de envio de evidências
```

- **Evento EDA Disparado**: Grava o evento `billing.payment.approved.v1`.

---

#### CRIT-VSC-008: Submissão de Evidências e Entrada na Fila de Análise `[Priority: P1]` `[AP-003]`
- **Objetivo**: Receber documentos de comprovação comunitária e enviar a empresa para a fila de moderação.
- **Atores**: Anunciante (`credential:evidence:upload`).
- **Pré-condições**: Pagamento da assinatura confirmado.
- **Telas Mapeadas**: `ADV-007`, `ADV-008`.

```gherkin
Cenário: Envio de documentação comprobatória para moderação
  Dado que o anunciante anexou as evidências comunitárias necessárias
  Quando confirmar a submissão dos documentos
  Então o sistema deve alterar o status da empresa para aguardando análise
  E deve disponibilizar o registro na Fila de Moderação Administrativa
  E deve apresentar a tela de acompanhamento de análise ao anunciante
```

- **Evento EDA Disparado**: Grava o evento `directory.business.submitted.v1`.

---

### 5.4 Acceptance Package AP-004: Moderação & Publicação

#### CRIT-VSC-009: Análise Administrativa e Solicitação de Correções `[Priority: P0]` `[AP-004]`
- **Objetivo**: Permitir que operadores analisem cadastros de empresas e solicitem ajustes quando necessário.
- **Atores**: Administrador do tenant (`business:moderate`).
- **Pré-condições**: Empresa no status aguardando análise.
- **Telas Mapeadas**: `ADM-002`, `ADM-003`.

```gherkin
Cenário: Solicitação de ajuste cadastral pelo moderador
  Dado que o Administrador identifica a necessidade de correção nos dados da empresa
  Quando acionar a opção de solicitar correção
  E registrar o parecer detalhando os ajustes necessários
  Então o sistema deve atualizar o status da empresa para correção solicitada
  E deve disponibilizar os campos apontados para re-edição no painel do anunciante
  E deve enviar notificação com o parecer do operador
```

---

#### CRIT-VSC-010: Aprovação Cadastral e Publicação Oficial `[Priority: P0]` `[AP-004]`
- **Objetivo**: Aprovar o cadastro e publicar a empresa oficialmente no guia da comunidade.
- **Atores**: Administrador do tenant com validação de Anti-Self-Approval (`business:moderate`).
- **Pré-condições**: Cadastro em análise, pagamento confirmado e operador distinto do anunciante.
- **Telas Mapeadas**: `ADM-002`.

```gherkin
Cenário: Aprovação e publicação de anúncio no diretório
  Dado que o Administrador valida a conformidade dos dados e mídias
  E o Administrador não é o titular responsável pelo cadastro
  Quando confirmar a aprovação da empresa
  Então o sistema deve alterar o status da empresa para aprovada
  E deve publicar o perfil no guia comercial tornando-o acessível na busca pública
  E deve registrar o evento de publicação na camada de mensageria
```

- **Evento EDA Disparado**: Grava o evento `directory.business.published.v1`.

---

#### CRIT-VSC-011: Rejeição Fundamentada de Cadastro `[Priority: P1]` `[AP-004]`
- **Objetivo**: Recusar cadastros que descumpram os termos de uso ou diretrizes comunitárias.
- **Atores**: Administrador do tenant (`business:moderate`).
- **Telas Mapeadas**: `ADM-002`.

```gherkin
Cenário: Recusa motivada de cadastro comercial
  Dado que o cadastro viola as diretrizes de publicação do tenant
  Quando o Administrador selecionar a opção de rejeição
  E registrar a justificativa motivada da recusa
  Então o sistema deve alterar o status da empresa para rejeitada
  E deve notificar o anunciante com o motivo do indeferimento
  E deve manter o histórico da decisão registrado para auditoria sem exclusão do banco
```

---

### 5.5 Acceptance Package AP-005: Gestão do Anunciante & Governança Operacional

#### CRIT-VSC-012: Acesso e Gestão no Dashboard do Anunciante `[Priority: P0]` `[AP-005]`
- **Objetivo**: Permitir a gestão contínua de dados, mídias e acompanhamento de contatos de clientes.
- **Atores**: Anunciante titular (`business:update`).
- **Telas Mapeadas**: `ADV-009`.

```gherkin
Cenário: Acesso ao painel de gestão da empresa aprovada
  Dado que a empresa está publicada e ativa
  Quando o anunciante autenticado acessar o Dashboard
  Então o sistema deve apresentar o resumo do anúncio, métricas de visualização e opções de edição cadastral
```

---

#### CRIT-VSC-013: Anulação Jurídica de Contrato por Sessão Elevada `[Priority: P1]` `[AP-005]`
- **Objetivo**: Anular formalmente contratos em situações excepcionais mediante autorização elevada.
- **Atores**: Administrador do tenant com sessão elevada ativa (`contract:void`, `support:elevated_session:use`).
- **Telas Mapeadas**: `ADM-010`, `ADM-011`.

```gherkin
Cenário: Anulação de contrato assinado via autorização de segurança elevada
  Dado que o Administrador possui token de sessão elevada ativo
  Quando acionar a anulação de um contrato assinado informando o parecer motivado
  Então o sistema deve atualizar o status do contrato para anulado
  E deve registrar a operação na trilha imutável de auditoria
  E deve preservar a cópia do documento assinado e o histórico financeiro sem exclusão física
```

- **Evento EDA Disparado**: Grava o evento `legal.contract.annulled.v1`.

---

#### CRIT-VSC-014: Conciliação Financeira Manual `[Priority: P1]` `[AP-005]`
- **Objetivo**: Permitir a confirmação manual de pagamentos em caso de indisponibilidade de avisos automáticos.
- **Atores**: Administrador financeiro com sessão elevada (`payment:reconcile`).
- **Telas Mapeadas**: `ADM-012`.

```gherkin
Cenário: Baixa e conciliação manual de cobrança bancária
  Dado que o aviso automático de confirmação de pagamento não foi recebido
  Quando o Administrador financeiro confirmar a conciliação manual informando o código da transação
  Então o sistema deve atualizar a fatura correspondente para liquida
  E deve confirmar a ativação da assinatura comercial vinculada
```

---

#### CRIT-VSC-015: Suspensão e Reativação Operacional de Assinatura `[Priority: P1]` `[AP-005]`
- **Objetivo**: Gerenciar a suspensão por pendência e a reativação da exibição do anúncio pós-regularização.
- **Atores**: Administrador do tenant (`tenant:suspend`, `subscription:reactivate`).
- **Telas Mapeadas**: `ADM-009`.

```gherkin
Cenário: Reativação de exibição comercial após regularização financeira
  Dado que a assinatura comercial estava suspensa por pendência financeira
  E a fatura pendente foi devidamente liquidada
  Quando o Administrador acionar a reativação da assinatura
  Então o sistema deve alterar o status da assinatura para ativa
  E deve restabelecer a exibição pública do perfil da empresa no guia comercial
```

- **Evento EDA Disparado**: Grava o evento `subscription.reactivated.v1`.

---

#### CRIT-VSC-016: Replay Auditado de Eventos na Fila de Falhas (DLQ) `[Priority: P1]` `[AP-005]`
- **Objetivo**: Inspecionar falhas de mensageria e reprocessar eventos pendentes via painel sanitizado.
- **Atores**: Agente de suporte ou master com sessão elevada (`event:dlq:inspect`, `event:dlq:replay`, `event:dlq:discard`).
- **Telas Mapeadas**: `CTL-006`.

```gherkin
Cenário: Re-execução de evento retido na fila de falhas sanitizada
  Dado que um evento falhado consta na visualização de mensageria da Torre de Controle
  Quando o operador de suporte com sessão elevada acionar a re-execução do evento informando a justificativa técnica
  Então o sistema deve reencaminhar o evento para o consumidor correspondente
  E se o processamento obtiver sucesso, deve atualizar o status do registro na fila de falhas para resolvido
  E deve registrar a justificativa e o operador responsável na trilha de auditoria
```

---

## 6. Matriz de Registro de Lacunas de Arquitetura (`GAP-DOC07-XXX`)

| ID da Lacuna | Descrição da Lacuna Identificada | Documento Afetado | Impacto Arquitetural | Decisão Necessária |
|---|---|---|---|---|
| **GAP-DOC07-001** | Ausência de especificação do limite de tempo para expiração automática de rascunhos de onboarding no status `draft`. | Doc 02 / Doc 05 | Acúmulo de registros orfãos na tabela de empresas. | Definir job de expurgo para rascunhos inativos há mais de 30 dias. |
| **GAP-DOC07-002** | Necessidade de padronizar a estrutura do payload de notificação Push no container Capacitor Mobile. | Doc 04 / Doc 06 | Incompatibilidade de schema entre mensagens Web e Mobile. | Especificar o envelope estendido para mensagens de dispositivos móveis. |
| **GAP-DOC07-003** | Mapeamento explícito de webhook de notificação de contratação para CRM externo. | Doc 06 | Atraso na sincronização do funil de vendas. | Adicionar consumidor outbox para disparo de webhooks de parceiros CRM. |

---

## 7. Matriz de Rastreabilidade Transversal (Requisitos x Telas x RBAC x Eventos x Aceite)

| ID do Critério | Pacote de Aceite | Requisito Funcional | Tela / Rota (Doc 04) | Permissão RBAC (Doc 03) | Evento EDA (Doc 06) | Tabela Banco (Doc 02) |
|---|---|---|---|---|---|---|
| **CRIT-VSC-001** | `AP-001` | Busca e Descoberta Comercial | `PUB-002`, `PUB-003`, `PUB-005` | `public` | `analytics.search.performed.v1` | `businesses`, `categories` |
| **CRIT-VSC-002** | `AP-001` | Exibição de Perfil Público | `PUB-007` | `public` | N/A | `businesses`, `business_locations` |
| **CRIT-VSC-003** | `AP-002` | Cadastro Inicial do Anunciante | `ADV-001`, `ADV-002` | `business:create` | `directory.business.drafted.v1` | `businesses`, `business_members` |
| **CRIT-VSC-004** | `AP-002` | Gate de Autorização Empresarial| `ADV-007b` | `business:update` | N/A | `business_authorizations` |
| **CRIT-VSC-005** | `AP-003` | Seleção de Plano Comercial | `ADV-003`, `ADV-004` | `subscription:create` | `subscription.drafted.v1` | `subscriptions`, `plan_versions` |
| **CRIT-VSC-006** | `AP-003` | Assinatura Eletrônica Contratual | `ADV-005` | `contract:sign` | `legal.contract.signed.v1` | `legal_contracts`, `signatures` |
| **CRIT-VSC-007** | `AP-003` | Processamento de Checkout | `ADV-006` | `payment:create` | `billing.payment.approved.v1` | `invoices`, `payments` |
| **CRIT-VSC-008** | `AP-003` | Submissão de Evidências | `ADV-007`, `ADV-008` | `credential:evidence:upload` | `directory.business.submitted.v1`| `credential_issuances` |
| **CRIT-VSC-009** | `AP-004` | Moderação Administrativa | `ADM-002`, `ADM-003` | `business:moderate` | `directory.business.correction_requested.v1`| `businesses`, `audit_logs` |
| **CRIT-VSC-010** | `AP-004` | Aprovação e Publicação | `ADM-002` | `business:moderate` | `directory.business.published.v1` | `businesses`, `outbox_events` |
| **CRIT-VSC-011** | `AP-004` | Rejeição de Anúncio | `ADM-002` | `business:moderate` | `directory.business.rejected.v1` | `businesses`, `audit_logs` |
| **CRIT-VSC-012** | `AP-005` | Painel do Anunciante | `ADV-009` | `business:update` | N/A | `businesses`, `subscriptions` |
| **CRIT-VSC-013** | `AP-005` | Anulação Jurídica de Contrato | `ADM-010`, `ADM-011` | `contract:void` | `legal.contract.annulled.v1` | `legal_contracts`, `audit_logs` |
| **CRIT-VSC-014** | `AP-005` | Reconciliação Financeira | `ADM-012` | `payment:reconcile` | `billing.payment.approved.v1` | `invoices`, `payments` |
| **CRIT-VSC-015** | `AP-005` | Reativação de Assinatura | `ADM-009` | `subscription:reactivate` | `subscription.reactivated.v1` | `subscriptions`, `businesses` |
| **CRIT-VSC-016** | `AP-005` | Replay e Gestão de DLQ | `CTL-006` | `event:dlq:replay` | N/A | `failed_event_queue`, `outbox` |

---

## 8. Próximos Passos e Transição para a Sprint Visual 0.1

Com a inclusão e congelamento formal dos **Critérios de Aceite (Doc 07 v1.0)**, toda a documentação conceitual e técnica da plataforma (**Docs 00 a 07**) atinge nota máxima de integridade e rastreabilidade.

A próxima etapa autorizada é o início do **Sprint Visual 0.1 (Spike Visual Controlado em `/design-lab`)**, focado exclusivamente na homologação visual de UI/UX, prototipagem de 3 telas piloto com dados inteiramente simulados (*mocks*), teste de troca de temas, responsividade mobile e congelamento do **Design System v1.0**.
