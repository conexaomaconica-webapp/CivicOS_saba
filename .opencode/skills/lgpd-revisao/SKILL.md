---
name: lgpd-revisao
description: Use when designing, reviewing, or altering any feature that collects, stores, exports, or deletes personal or sensitive data in the Conexão Maçônica product (CivicOS). Mandatory for masonic affiliation links (sensitive data under LGPD art. 5 II), contracts, uploads, consents, privacy screens, audit trails. Applies CRIT-TRN-012 (consent with hash), CRIT-TRN-013 (pseudonymization), CRIT-TRN-014 (export/revoke), and data retention. Trigger on keywords like LGPD, privacidade, consentimento, dado sensível, vínculo maçônico, exportar dados, revogar, aceite, termos, privacy, GDPR, retenção, apagamento, documento, upload.
---

# Revisão de Proteção de Dados (LGPD) — Conexão Maçônica

Checklist obrigatório antes de qualquer feature que toque dado pessoal ou
sensível no produto Conexão Maçônica (CivicOS). A característica central do
produto — **vínculo maçônico** — é **dado pessoal sensível** (LGPD art. 5º, II:
convicção filosófica), o que eleva a exigência de tratamento.

Base normativa do projeto: `CRIT-TRN-012`, `CRIT-TRN-013`, `CRIT-TRN-014` no Doc 07,
`INF-006 (LGPD Base)` e `USR-007 (Gestão de Privacidade & LGPD)` no backlog.

## 1. Classificação do dado

Para cada campo novo, classificar antes de desenhar a tabela/UI:

| Categoria | Exemplos neste produto | Exigência |
|---|---|---|
| **Sensível** | Vínculo maçônico (loja, potência, rito), filiação institucional, credenciais de verificação | Consentimento explícito e destacado; finalidade específica; **minimização**; tratamento rigoroso |
| **Pessoal comum** | Nome, e-mail, telefone, endereço comercial, CNPJ | Finalidade + licitude (contrato/legítimo interesse) |
| **Documental/probatório** | Upload de comprovantes de vínculo (`ADV-007`) | Minimização + retenção limitada + acesso restrito |

Toda tabela que referencia vínculo maçônico deve ser tratada como repositório de
dado sensível, não como "cadastro comum".

## 2. Checklists por critério do projeto

### CRIT-TRN-012 — Registro de aceite com hash `[P0]`
- Todo aceite de termos/políticas (`legal_docs:accept`) grava: versão do documento, hash SHA-256 da minuta, conta, data.
- Aceite de dado sensível é **explícito e destacado** (checkbox/não pré-marcado), separado de termos gerais.
- Nunca guardar só "aceitou"; sempre a versão + hash (imutável).

### CRIT-TRN-013 — Pseudonimização `[P1]`
- Nunca armazenar IP/agente de navegação brutos.
- Registros analíticos públicos usam identificadores pseudonimizados por tenant (RHID).
- Logs de acesso/auditoria não devem conter dados pessoais brutos desnecessários.

### CRIT-TRN-014 — Exportação e revogação `[P2]`
- O titular pode exportar os próprios dados (`privacy:export_own`).
- Pode revogar consentimentos **opcionais** (`privacy:revoke_consent`).
- A revogação de consentimento de vínculo maçônico impacta `active →` estado não exibível no guia (vínculo exige consentimento ativo, ver skill `moderacao-fluxo`).

## 3. Retenção e exclusão (política por tipo)

- **Contrato / financeiro**: retenção legal (ex: 5 anos) por obrigação fiscal — justifica manter após pedido de exclusão.
- **Dados sensíveis de vínculo**: manter **apenas enquanto a finalidade exigir**; após revogação/expurgo, remover ou reter mínimo necessário com base legal.
- **Documentos/provas de vínculo**: minimizar (armazenar hash/token + referência, não o documento inteiro quando possível) e definir prazo de expurgo (compõe `XS-003` — expurgo de rascunhos inativos).
- Ao apagar entidades, preservar trilha de auditoria imutável (`CRIT-TRN-015`) e referências de atores via `ON DELETE SET NULL` — nunca apagamento em cascata de dados auditáveis.

## 4. O que conferir na implementação

- [ ] Consentimento sensível explícito, destacado e registrado com hash (não pré-marcado)
- [ ] Sem IP/agente bruto em banco; pseudonimização por tenant nos logs analíticos
- [ ] Export/revoke acessíveis ao titular (tela `USR-007`)
- [ ] Uploads de vínculo: tamanho ≤ 10MB (NFR-008), restrição de acesso (RLS tenant), minimização; nunca expor em rota pública
- [ ] Retenção documentada por tipo de dado; prazo de expurgo definido
- [ ] Trilha de auditoria preservada ao apagar
- [ ] Nenhum dado sensível em metadata/URL/JSON-LD públicos (ex: não emitir loja/potência de afiliação em schema `LocalBusiness` sem consentimento — coordenar com skill `seo-conteudo`)
- [ ] Consentimento registrado em `legal_consents` com hash; eventos canônicos de LGPD emitidos

## 5. Restrições explícitas

- **Nunca** armazenar IP/UA brutos, dados de navegação cru em analytics, ou cópia integral de documentos sensíveis sem justificativa e retenção definida.
- **Nunca** tratar vínculo maçônico como campo comum sem consentimento destacado e finalidade declarada.
- **Nunca** emitir dados sensíveis em rotas públicas, metadados, JSON-LD, sitemap ou eventos sem consentimento e necessidade.