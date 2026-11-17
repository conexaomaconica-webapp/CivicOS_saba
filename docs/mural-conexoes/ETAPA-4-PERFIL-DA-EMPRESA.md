# Mural de Conexões · Etapa 4 · Conexões no perfil da empresa

Status: implementada localmente, sem commit, sem deploy, sem migrations remotas. Produção: NO-GO (ver pendências).

## O que muda
- Perfil público `/guia/[slug]`: nova seção **"Conexões desta empresa"**, depois de todas as informações da empresa e antes do rodapé.
  - Até **2** conexões (as mais recentes), contador total e link "Ver todas as conexões (N)" para `/conexoes?empresa=<slug>`.
  - Sem foto, sem curtidas, sem denúncia (discreta; não concorre com as informações comerciais). Cada cartão leva à página individual.
  - Aparece só em empresa **publicada** e fora do modo de pré-visualização. Sem conexões, com erro ou exceção: a seção **não aparece** (o perfil nunca quebra).
- `/conexoes?empresa=<slug>`: lista filtrada pela empresa (combina com busca, tipo, ordem e paginação). Mostra "Mostrando as conexões de <empresa>" e "Ver todas as empresas". Página filtrada continua fora do índice (noindex, canonical `/conexoes`).
- Página individual `/conexoes/[id]`: a imagem de prévia (Open Graph/Twitter) agora é **sempre a institucional**, mesmo com foto aprovada (a autorização da foto cobre o mural, não redes sociais). A foto continua aparecendo na própria página.

## Banco
- **Migration 247** (`247_public_connections_list_by_business.sql`): substitui `public_connections_list` (6 args, migration 245) pela versão de 7 args com `p_business_slug` opcional. Remove a assinatura antiga para não haver sobrecarga ambígua. As regras de visibilidade são idênticas às da 245; o filtro só restringe.
- Rollback: `supabase/rollbacks/connections/247_rollback.sql` (volta à função de 6 args).
- Ordem de aplicação: 244 (opcional, vitrines) → 245 → 246 → 247. A 247 exige a 245 já aplicada.
- Compatibilidade sem a 247: `/conexoes` sem filtro continua funcionando (repete a chamada sem `p_business_slug`); com `?empresa=` mostra o estado de erro; a seção do perfil some. O aplicativo publicado não usa essa função.

## Cache e revogação
- `/guia/[slug]`, `/conexoes` e `/conexoes/[id]` são `force-dynamic`; não há cache próprio da aplicação nem `revalidate` para esses conteúdos. A consulta é feita a cada requisição e aplica as regras no banco, então retirar o consentimento tira a conexão de todas as telas imediatamente. Não há imagem de conexão nos metadados.
- Fotos continuam em bucket público (já era assim antes do Mural): quem tem a URL da imagem a acessa. Retirar a conexão remove a página e a listagem, não apaga o arquivo. Ponto a decidir antes da produção.

## Testes
- `pnpm test:connections-by-business` (PGlite, 6 casos), 245 (14) e 246 (10) continuam passando.
- Vitest: `connections-business.test.tsx` (novo), `connections-page`, `connection-page`, `connections-showcase`.
- `scripts/verify-connections-rpc.mjs` inclui a chamada filtrada por empresa (rodar em projeto de teste, só leituras).
