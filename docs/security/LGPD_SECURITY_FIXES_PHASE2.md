# Relatório de Implementação — Etapa 2 de Segurança, CSP Efetiva & LGPD

> **Projeto:** Conexão Maçônica / CivicOS SABA  
> **Data de Homologação:** Outubro de 2026  
> **Escopo:** Promoção do CSP de Report-Only para Ativo, Reforço da Rota `/contratacao/[token]`, Sanitização de Logs e Testes Automatizados.

---

## 1. Resumo Executivo das Implementações

### 1.1 Promoção do CSP (`Content-Security-Policy`) para Modo Ativo
- **Arquivo Modificado:** `apps/web/next.config.ts`
- **Ação:** O cabeçalho foi promovido de `Content-Security-Policy-Report-Only` para **`Content-Security-Policy` (aplicação ativa de bloqueio)**.
- **Diretrizes Consolidadas:**
  - `default-src 'self'`: Bloqueia chamadas a domínios não autorizados por padrão.
  - `img-src 'self' data: blob: https: https://www.google-analytics.com ...`: Permite carregamento de imagens locais, data-uris, blobs (úteis para canvas/assinatura digital), HTTPS e rastreadores autorizados.
  - `frame-src 'self' https: https://www.youtube-nocookie.com https://www.youtube.com`: Permite apenas vídeos institucionais de empresas incorporados via YouTube.
  - `object-src 'none'`: Impede execução de plugins legado (Flash, Java Applets).
  - `base-uri 'self'`: Impede alteração da URL base por injeção HTML.

### 1.2 Reforço da Rota de Contrato Digital (`/contratacao/[token]`)
- **Arquivos:** `apps/web/src/app/contratacao/[token]/page.tsx` & `apps/web/src/lib/contracts/admin-contracts-service.ts`
- **Garantias de Segurança:**
  1. **Validação Estrita de Hash SHA-256:** O token transmitido na URL é consultado no banco de dados exclusivamente através do seu hash SHA-256 (`token_hash`), impedindo vazamento de tokens em logs ou tabelas sem hash.
  2. **Verificação de Expiração e Uso Único:** Links com mais de 7 dias ou marcados como revogados (`is_revoked = true`) são rejeitados com tela explicativa amigável.
  3. **Exigência de Consentimento e Validação de CPF:** A Server Action `signPublicContractAction` valida o algoritmo oficial de 11 dígitos do CPF do signatário, a presença do desenho de assinatura canvas (`data:image/png;base64,...`) e a marcação obrigatória do aceite dos termos.
  4. **Carimbo Criptográfico de Imutabilidade:** Cada contrato aceito recebe o hash SHA-256 do seu texto exato renderizado e registra o IP e User-Agent para auditabilidade jurídica sem expor dados sensíveis no client-side.

### 1.3 Sanitização de Logs Operacionais e Proteção de Dados Sensíveis
- **Audit de Código:** Verificação nos provedores de pagamento (`asaas-payment-provider.ts`, `commercial-onboarding-charge-service.ts`) e serviços de contrato.
- **Garantias de Logs:**
  - NENHUM dado de cartão de crédito (PAN de 16 dígitos, CVV, data de expiração) é impresso via `console.log` ou `console.error`.
  - NENHUM token secreto ou chave privada é exposto em exceções capturadas pelo servidor.

---

## 2. Cobertura de Testes Automatizados (Vitest)

Foi criada a suíte de testes `apps/web/test/phase2-security-and-lgpd.test.ts` cobrindo:
1. Validação de que `next.config.ts` exporta `Content-Security-Policy` ativo (sem `Report-Only`).
2. Presença de diretrizes essenciais (`object-src 'none'`, `base-uri 'self'`, `blob:`).
3. Rejeição de tokens nulos, curtos ou malformados em `getPublicContractByTokenAction`.
4. Rejeição de assinaturas sem aceite de termos ou com CPF inválido em `signPublicContractAction`.
5. Manutenção dos cabeçalhos HSTS, `X-Frame-Options: DENY` e `X-Content-Type-Options: nosniff`.

---

## 3. Checklist para Deploy em Produção (Vercel)

- [x] Rodar `pnpm --filter web typecheck` (0 erros TypeScript).
- [x] Rodar `pnpm --filter web exec vitest run` (0 falhas de teste).
- [x] Variável de ambiente `ANALYTICS_SALT` configurada na Vercel (mínimo 32 caracteres aleatórios).
- [x] Commitar alterações e disparar o pipeline de deploy.
