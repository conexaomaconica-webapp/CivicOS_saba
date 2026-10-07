# Relatório de Execução — Etapa 1: Correções de Segurança e LGPD

**Plataforma:** Conexão Maçônica / CivicOS SABA  
**Data de Execução:** 07 de Outubro de 2026  
**Status:** 🟢 Concluído com Sucesso

---

## 1. Resumo das Alterações Realizadas

### A. GA4 — Consentimento Estrito (Consent Mode Básico)
- **Arquivo Alterado:** `apps/web/src/components/analytics/GoogleAnalytics.tsx`
- **Comportamento Anterior:** O script `https://www.googletagmanager.com/gtag/js` e a chamada `gtag('config')` eram executados incondicionalmente no primeiro acesso do visitante, gerando cookies `_ga` e `_ga_*` antes do consentimento.
- **Novo Comportamento:** 
  - No primeiro acesso (sem escolha salva), **nenhum script do Google (gtag.js) é baixado ou executado**, **nenhum cookie `_ga` é criado** e **nenhuma requisição de analytics é emitida**. O banner de consentimento é exibido.
  - Ao clicar **Aceitar**, o consentimento é armazenado como `granted` no `localStorage`, o script `gtag.js` é injetado no DOM e as medições iniciam com `analytics_storage: 'granted'`, mantendo `ad_storage`, `ad_user_data` e `ad_personalization` como `denied`.
  - Ao clicar **Recusar**, o estado `denied` é persistido, os scripts do Google nunca são injetados e a função `clearGaCookies()` expurga eventuais cookies `_ga` existentes.
  - Ao **Revogar** o consentimento, novos scripts deixam de carregar e os cookies do domínio são limpos.

---

### B. Proteção do Bucket de Fotos de Membros (`member-avatars`)
- **Migration Criada:** `supabase/migrations/200_make_member_avatars_private.sql`
- **Arquivos Alterados:**
  - `apps/web/src/lib/member/member-profile-service.ts`
  - `apps/web/src/app/minha-conta/layout.tsx`
  - `apps/web/src/app/minha-conta/perfil/page.tsx`
  - `apps/web/src/app/anunciante/conta/page.tsx`
- **Comportamento Anterior:** O bucket `member-avatars` possuía `public: true`, permitindo que qualquer pessoa visualizasse fotos de perfil diretamente via URL pública sem autenticação.
- **Novo Comportamento:** 
  - O bucket `member-avatars` foi alterado para **`public: false`**.
  - O acesso HTTP direto via `/storage/v1/object/public/member-avatars/` retorna erro de permissão/bucket não público.
  - Foi implementado o helper `getSignedMemberAvatarUrl()`, que gera Signed URLs temporárias (`/storage/v1/object/sign/member-avatars/...?token=...`) com validade de **60 minutos**, exclusivamente no servidor para usuários autenticados ou administradores.
  - **Preservação de Buckets Públicos:** Os buckets `business-assets` e `event-assets` **não sofreram alterações** e permanecem `public: true` para abastecer as páginas públicas e indexáveis do Guia Comercial e de Eventos.

---

### C. Remoção do Fallback Público de `ANALYTICS_SALT`
- **Arquivo Alterado:** `apps/web/src/app/actions/analytics-actions.ts`
- **Documentação Criada:** `docs/security/ENV_SECURITY.md`
- **Comportamento Anterior:** Se a variável `ANALYTICS_SALT` não estivesse definida, o código utilizava uma string hardcoded pública (`civicos_analytics_salt_v1_secure`) do repositório.
- **Novo Comportamento:** 
  - Em ambiente de produção (`NODE_ENV === 'production'`), a função `getAnalyticsSalt()` exige obrigatoriamente a variável `ANALYTICS_SALT` com **no mínimo 32 caracteres**. Se ausente ou inválida, a Server Action aborta com uma exceção de segurança explícita sem expor segredos nem dados de visitantes.
  - Em ambiente local ou de teste (`NODE_ENV !== 'production'`), é utilizado um fallback local isolado (`DEV_FALLBACK_SALT`).

---

## 2. Testes Adicionados e Resultados de Validação

- **Arquivo de Testes Criado:** `apps/web/test/phase1-security-and-lgpd.test.ts`
- **Cenários Testados:**
  1. GA4: Visitante novo sem cookies `_ga`.
  2. GA4: Aceitar consentimento (`cm_analytics_consent = granted`).
  3. GA4: Recusar consentimento (`cm_analytics_consent = denied`) com limpeza de cookies.
  4. GA4: Retorno ao site após aceite ou recusa.
  5. GA4: Revogação de consentimento.
  6. Storage: Extração de caminhos relativos em `extractMemberAvatarStoragePath()`.
  7. Storage: Geração de Signed URLs via `getSignedMemberAvatarUrl()`.
  8. Analytics: Lançamento de erro de produção se `ANALYTICS_SALT` estiver ausente.

### Resultados da Validação Executada
```bash
pnpm --filter web typecheck
➔ 0 erros de compilação (tsc --noEmit)

pnpm --filter web exec vitest run
➔ 138 arquivos de teste aprovados (910 testes passando de 910)
```

---

## 3. Impacto sobre SEO e Pontos de Regressão

- **Impacto sobre SEO:** **ZERO impacto negativo**. 
  - As páginas públicas do Guia Comercial, Empresas, Cidades, Categorias e Eventos mantêm os buckets `business-assets` e `event-assets` públicos.
  - O robô do Googlebot continua com acesso desimpedido ao HTML, CSS, JavaScript e `sitemap.xml`.
  - A restrição de privacidade aplica-se estritamente ao bucket `member-avatars`, cujas fotos de perfil ficam em áreas fechadas que possuem diretivas `noindex`.
- **Possíveis Pontos de Atenção:**
  - Se um membro trocar a foto de perfil, a nova Signed URL é gerada imediatamente com 60 minutos de vigência. Após 60 minutos, qualquer recarga de página na Área do Membro renova a Signed URL automaticamente via Server Component.

---

## 4. Variáveis de Ambiente Necessárias na Vercel

Você precisa configurar a seguinte variável de ambiente no painel da Vercel:

| Variável | Escopo | Descrição | Exemplo de Valor |
| :--- | :--- | :--- | :--- |
| `ANALYTICS_SALT` | Server-side (`Production` & `Preview`) | Salt secreto para HMAC de anonimização de visitantes (mínimo 32 caracteres). | *Gere usando `openssl rand -hex 32`* |

---

## 📋 CHECKLIST MANUAL DO EDUARDO
*(Passos a serem executados fora do código no painel da Vercel e do Supabase)*

- [ ] **1. Gerar a Secret de Analytics:**
  - No seu terminal local, execute: `openssl rand -hex 32`
  - Copie a string gerada de 64 caracteres.

- [ ] **2. Configurar Variável na Vercel:**
  - Acesse o painel da **Vercel** ➔ selecione o projeto **Conexão Maçônica / Web**.
  - Vá em **Settings** ➔ **Environment Variables**.
  - Adicione a variável `ANALYTICS_SALT` com a string gerada.
  - Marque os ambientes **Production** e **Preview**.
  - Clique em **Save**.

- [ ] **3. Executar a Migration no Supabase de Produção:**
  - Acesse o painel do **Supabase** ➔ selecione o projeto de Produção.
  - Vá no **SQL Editor**.
  - Copie e execute o conteúdo do arquivo [`supabase/migrations/200_make_member_avatars_private.sql`](file:///c:/saas-platform/supabase/migrations/200_make_member_avatars_private.sql):
    ```sql
    UPDATE storage.buckets
    SET public = false
    WHERE id = 'member-avatars';

    DROP POLICY IF EXISTS "Permitir leitura pública no member-avatars" ON storage.objects;
    DROP POLICY IF EXISTS "member_avatars_public_read" ON storage.objects;
    DROP POLICY IF EXISTS "member_avatars_authenticated_read" ON storage.objects;

    CREATE POLICY "member_avatars_authenticated_read"
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'member-avatars'
        AND (
          (storage.foldername(name))[1] = auth.uid()::TEXT
          OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role IN ('admin', 'superadmin', 'platform_admin', 'master')
          )
        )
      );
    ```

- [ ] **4. Fazer Novo Deploy / Redeploy na Vercel:**
  - Promova um novo deploy ou clique em **Redeploy** na Vercel para carregar a nova variável `ANALYTICS_SALT`.

- [ ] **5. Teste Manual Final de Confirmação:**
  - Acesse a plataforma em uma aba anônima: confirme que a tag do Google Analytics só carrega no inspetor do navegador **após clicar em Aceitar**.
  - Tente acessar uma URL direta antiga de foto de membro (`/storage/v1/object/public/member-avatars/...`) sem estar logado: confirme que o Supabase retorna erro HTTP de acesso negado.
