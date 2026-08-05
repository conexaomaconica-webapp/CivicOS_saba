# 14 — Contracts & Electronic Signatures Engine

**Módulo:** Community Framework
**Escopo:** Módulo genérico de geração de contratos, snapshots imutáveis, assinatura eletrônica, pacote probatório, armazenamento seguro, governança de estados e RBAC

---

## 1. Propósito e Visão Geral

O módulo **Contracts & Electronic Signatures** é uma funcionalidade genérica do **Community Framework** encarregada da geração, versionamento, coleta de assinaturas eletrônicas, guarda probatória e auditoria de instrumentos contratuais entre a administração de uma `Community Instance` e seus anunciantes/parceiros.

A contratação de planos comerciais não se resume à exibição de um termo estático. Trata-se de um processo formal em que o contrato gerado reflete de forma exata e imutável os dados cadastrais, comerciais e financeiros combinados no momento da contratação.

---

## 2. Flexibilidade de Fluxo e Onboarding Gate Policy

O framework não engessa a ordem dos passos para todas as comunidades. Cada `Community Template` define sua **`OnboardingGatePolicy`**, que estabelece a sequência de travas permitidas:

```yaml
# Exemplos de combinações suportadas no Template:

Modelo 1 (Padrão Comercial):
  Contrato → Pagamento → Documentos → Análise Modertória → Publicação

Modelo 2 (Pré-validação Documental):
  Documentos preliminares → Contrato → Pagamento → Análise → Publicação

Modelo 3 (Pré-análise Institucional):
  Pré-análise comunitária → Contrato → Pagamento → Ativação Imediata
```

### Trava de Ativação Consolidada e Separação de Publicação

Independente da ordem, a assinatura operacional só passa para `subscription_status = active` quando **todos** os portões configurados no `OnboardingGatePolicy` daquele template forem 100% satisfeitos.

> 💡 **Diferenciação entre Ativação Comercial e Publicação Pública**:
> O status `subscription_status = active` atesta que o vínculo financeiro e contratual está válido e pago. Ele **não força automaticamente `publication_status = published`**. A empresa pode possuir uma assinatura ativa enquanto seu cadastro estiver aguardando revisão documental ou moderação (`publication_status = unpublished`).

---

## 3. Modos de Assinatura e Gestão de Signatários

O módulo suporta diferentes modalidades de representação jurídica configuráveis no template contratual:

- **`SINGLE_PARTY` (Aceite Unilateral do Anunciante)**: A plataforma manifesta aceite prévio pela disponibilização do modelo público; apenas o representante legal do anunciante assina.
- **`BILATERAL` (Assinatura Dupla)**: Exige a assinatura do anunciante e a assinatura do representante legal da `Community Instance`.
- **`MULTI_PARTY` (Múltiplos Signatários)**: Exige a assinatura de múltiplos sócios do anunciante ou testemunhas institucionais.

### Ordem e Ciclo de Vida da Solicitação de Assinatura

- **`signingOrder`**:
  - `SEQUENTIAL`: As partes assinam em ordem estrita (ex: Anunciante → Representante da Plataforma).
  - `PARALLEL`: Todos os signatários recebem o convite e podem assinar simultaneamente.
- **Gestão Operacional de Signatários**:
  - **Expiração**: Solicitações de assinatura não concluídas dentro do prazo (default: 14 dias) expiram automaticamente (`expired`).
  - **Reenvio**: Permitido o reenvio de lembretes ou links de assinatura.
  - **Substituição de Signatário**: Antes da conclusão da primeira assinatura, é possível substituir o e-mail/CPF do representante indicado se houver erro material no cadastro.

---

## 4. Separação Estrita de Instrumentos Jurídicos

O sistema trata cada instrumento legal de forma independente, com registros e versionamentos próprios:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                    INSTRUMENTOS JURÍDICOS DA INSTÂNCIA                 │
│                                                                        │
│  ┌────────────────────────┐  ┌──────────────────────────────────────┐  │
│  │   Contrato Comercial   │  │             Termos de Uso            │  │
│  │ (Vínculo de Assinatura)│  │    (Regras Gerais da Plataforma)     │  │
│  └────────────────────────┘  └──────────────────────────────────────┘  │
│               │                                  │                     │
│  ┌────────────────────────┐  ┌──────────────────────────────────────┐  │
│  │ Política de Privacidade│  │      Consentimentos LGPD Opt-In      │  │
│  │   (Tratamento Dados)   │  │   (Comunicações e Marketing)         │  │
│  └────────────────────────┘  └──────────────────────────────────────┘  │
│               │                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │             Autorização de Publicação e Uso de Marca             │  │
│  │    (Uso de Logo, Informações Comerciais e Divulgação no Guia)    │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Invalidação de Contratos Gerados por Alteração Material

Um contrato gerado que ainda se encontra pendente de assinatura (`awaiting_signature`) deve ser **automaticamente invalidado** se houver alteração em qualquer dado material.

### 5.1 Distinção entre Estados `superseded` e `voided`

- **`superseded` (Substituído)**: O contrato não-assinado foi substituído por uma nova versão válida gerada por alteração de dados cadastrais ou comerciais. Registra obrigatoriamente `superseded_by_contract_id`.
- **`voided` (Anulado)**: O contrato foi anulado e não produz qualquer efeito jurídico devido a cancelamento administrativo, erro jurídico ou recusa das partes. Registra `voided_by`, `voided_at` e `void_reason`.

### 5.2 Dados Materiais que Invalidam o Contrato
- CNPJ ou CPF do anunciante / razão social.
- Nome ou CPF do representante legal indicado.
- Plano comercial selecionado, versão do preço ou desconto aplicado.
- Frequência de cobrança, vigência contratual ou `BillingPolicy`.
- Cláusulas contratuais ou benefícios inclusos.

### 5.3 Fluxo de Invalidação
```text
Contrato gerado (awaiting_signature)
  ↓
Alteração de dado material detectada no formulário
  ↓
Status do contrato anterior → superseded (rastreia superseded_by_contract_id)
  ↓
Cancelamento da solicitação no Signature Provider
  ↓
Geração de um NOVO contrato (novo ID e novo hash)
  ↓
Nova solicitação de assinatura enviada ao anunciante
```

> 🛑 **Regra de Ouro**: Alterações não-materiais (ex: atualização de telefone comercial ou link de rede social que não constem na minuta jurídica) **não invalidam** o contrato gerado. Contratos já **assinados (`signed`) NUNCA podem ser alterados ou editados**; exigem aditivo ou novo contrato.

---

## 6. Conceito de Snapshot Imutável e Armazenamento Estruturado

Para garantir a reconstituição exata da origem do contrato sem depender exclusivamente do PDF binário, o sistema armazena tanto o arquivo final quanto a sua estrutura de origem:

1. **`template_version`**: Código e versão exata do template Markdown/HTML utilizado.
2. **`variables_map`**: Objeto JSON estruturado contendo todos os valores injetados no documento.
3. **`rendered_content_source`**: O código-fonte compilado em HTML antes da conversão para PDF.
4. **`final_pdf` & `document_hash`**: O arquivo PDF binário e seu hash SHA-256 imutável de prova interna.
5. **`public_validation_code`**: Código opaco e curto (ex: `CM-8F72K9Q4`) usado exclusivamente para a URL pública de validação.
6. **`evidence_bundle`**: Arquivo de evidências em JSON/PDF contendo IPs, timestamps, user-agents, método de autenticação, comprovantes 2FA e webhooks assinados.
7. **`linked_terms_versions`**: IDs e hashes das versões vigentes dos Termos de Uso e Políticas de Privacidade no momento da contratação.

---

## 7. Modalidades de Assinatura Eletrônica e Base Legal

### 7.1 Enquadramento Jurídico (Legislação Brasileira)
- **Medida Provisória nº 2.200-2/2001**: Reconhece a validade jurídica de documentos eletrônicos e admite qualquer meio de comprovação de autoria e integridade aceito pelas partes (Art. 10, § 2º).
- **Lei nº 14.063/2020**: Classifica assinaturas em Simples, Avançada e Qualificada. A regulamentação pública não invalida os acordos privados fundamentados na MP 2.200-2/2001.

### 7.2 Modalidades Suportadas
1. **Assinatura Eletrônica Avançada (`ELECTRONIC_ADVANCED`) — RECOMENDADA**:
   - Assinatura vinculada ao signatário através de autenticação da conta, confirmação por e-mail/SMS/2FA, IP, timestamp e hash SHA-256 do documento.
2. **Assinatura Eletrônica Qualificada (`ELECTRONIC_QUALIFIED`)**:
   - Assinatura via certificado digital padrão ICP-Brasil (e-CPF / e-CNPJ).
3. **Assinatura Eletrônica Simples (`ELECTRONIC_SIMPLE`)**:
   - Aceite de termos de adesão via clique único com log de conta e IP.

> ⚠️ **Nota de Governança**: A modalidade exigida para cada Community Template e a redação dos contratos devem ser validadas pelo advogado responsável pela operação antes do lançamento oficial em produção.

---

## 8. Signature Provider Adapter & Critérios de Seleção

Todas as integrações com fornecedores externos de assinatura eletrônica implementam uma interface neutra:

```ts
interface ElectronicSignatureProvider {
  createSignatureRequest(
    input: CreateSignatureRequestInput
  ): Promise<CreateSignatureRequestResult>;

  getSignatureStatus(
    requestId: string
  ): Promise<SignatureStatusResult>;

  cancelSignatureRequest(
    requestId: string
  ): Promise<void>;

  downloadSignedDocument(
    requestId: string
  ): Promise<SignedDocumentResult>;

  validateWebhook(
    payload: unknown,
    headers: Record<string, string>
  ): Promise<SignatureWebhookEvent>;
}
```

### Critérios de Avaliação para Escolha do Fornecedor
- Qualidade da API e SDKs disponíveis.
- Suporte a webhooks assinados com garantia de idempotência.
- Relatório probatório de auditoria detalhado (Folha de Assinaturas).
- Autenticação por código via e-mail / SMS / WhatsApp.
- Suporte a múltiplos signatários e ordem sequencial.
- Suporte a assinatura avançada e certificado ICP-Brasil.
- Facilidade de exportação do PDF assinado e evidências em lote.
- Conformidade total com a LGPD e armazenamento em território nacional.
- SLA de disponibilidade de serviço (mínimo 99.9%).
- Estratégia de saída (ausência de lock-in em caso de substituição do fornecedor).

---

## 9. Matriz de Estados Independentes

| Dimensão de Estado | Valores Possíveis |
|---|---|
| **`contract_status`** | `draft`, `generated`, `awaiting_signature`, `partially_signed`, `signed`, `voided`, `superseded` |
| **`signature_status`** | `pending`, `sent`, `viewed`, `partially_signed`, `completed`, `expired`, `declined` |
| **`payment_status`** | `pending`, `approved`, `rejected`, `refunded`, `cancelled` |
| **`subscription_status`** | `pending_contract`, `pending_payment`, `pending_documents`, `under_review`, `active`, `past_due`, `suspended`, `cancelled`, `expired` |
| **`verification_status`** | `unverified`, `pending_documentation`, `under_review`, `approved`, `rejected` |
| **`publication_status`** | `unpublished`, `published`, `suspended`, `archived` |

---

## 10. Matriz de Segurança e Permissões RBAC

| Perfil de Usuário | Contrato PDF | Resumo Comercial | Evidências / IPs | Dados dos Signatários | Ações de Cancelamento |
|---|:---:|:---:|:---:|:---:|:---:|
| **Anunciante (Dono)** | Download / Leitura | Leitura | Próprias | Próprios | Solicitar Cancelamento |
| **Tenant Admin** | Download / Leitura | Leitura | Não | Leitura Comercial | Iniciar Aditivo / Cancelar |
| **Financeiro** | Resumo Financeiro | Leitura | Não | Não | Registrar Pagamento |
| **Moderador** | Confirmação Status | Leitura | Não | Não | Aprovação Cadastro |
| **Jurídico / Compliance** | Total | Total | Total | Total | Emissão de Aditivos |
| **Platform Master** | Total (Auditado) | Total (Auditado) | Total (Auditado) | Total (Auditado) | Ações Elevadas |

---

## 11. Especificação do Elemento PDF e URL Pública de Validação Opaque

Todo PDF de contrato gerado pela plataforma possui os seguintes atributos visuais e de segurança:

- **Cabeçalho/Rodapé**: Identificação da `Community Instance` e da plataforma CivicOS.
- **Página Numerada**: Formato padrão `Página X de Y`.
- **Identificadores Únicos**: Número do Contrato e Versão do Template.
- **Carimbo de Integridade Interna**: Hash SHA-256 impresso no rodapé interno do documento (`document_hash`).
- **Código Público Opaco (`public_validation_code`)**: Código curto e revogável impresso para validação pública (ex: `CM-8F72K9Q4`).
- **URL Pública de Validação**: Link de verificação de autenticidade (ex: `https://[instancia].civicos.app/verificar-contrato/CM-8F72K9Q4`).

### Nível de Exposição da Página Pública de Verificação
A página pública de verificação é deliberadamente **restrita** para proteção de privacidade:
- **Exibe exclusivamente**: Número do contrato, status de autenticidade (Válido / Invalidado / Revogado), data de assinatura, versão do template, hash parcial e comunidade emissora.
- **NÃO EXIBE**: CPF, CNPJ integral (quando não necessário), endereço, valor financeiro, signatários completos, conteúdo do PDF ou arquivos de evidências técnicas.

---

## 12. Retenção de Dados e LGPD

- **Contrato Assinado Final**: Mantido pelo prazo prescricional legal/contratual (mínimo 5 anos).
- **Pacote Probatório de Assinatura**: Retenção alinhada à exigência probatória de defesa jurídica.
- **Solicitações Incompletas / Expiradas**: Expurgo ou arquivamento após 90 dias.
- **Rascunhos Invalidados (`superseded` / `voided`)**: Armazenamento reduzido para fins de auditoria interna (180 dias).

---

## 13. Prioridade e Sprint Sugerida

- **Prioridade**: P1 — Crítica.
- **Sprint Sugerida**: Sprint 1.0.6 (Formalização do Módulo de Contratos e Assinaturas).
