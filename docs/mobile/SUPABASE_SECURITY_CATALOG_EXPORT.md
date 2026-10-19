# Exportação segura do catálogo Supabase — P0-B

Este procedimento coleta apenas metadados para a auditoria de segurança. Ele não autoriza correções, migrations, testes de acesso ou alterações no projeto.

## Procedimento

1. Confirme no SQL Editor que o projeto selecionado é `rwvztwsjcjljphqttiws` e que a URL exibida corresponde a `https://rwvztwsjcjljphqttiws.supabase.co`.
2. Revise [`supabase/audits/p0b_security_catalog_readonly.sql`](../../supabase/audits/p0b_security_catalog_readonly.sql) antes de executar.
3. Execute as consultas no SQL Editor, preferencialmente uma seção por vez, para manter os resultados identificáveis.
4. Exporte somente os resultados das seções 01–10 em CSV ou texto estruturado. Preserve o nome da seção em cada arquivo.
5. Não exporte dados de tabelas de negócio, usuários, e-mails, tokens, secrets ou corpos de funções.
6. Para a configuração Auth, forneça somente nomes/valores não sensíveis de hooks, expiração de sessão e allowlist de redirects. Nunca inclua chaves ou tokens.
7. Revise os arquivos exportados e remova qualquer valor pessoal ou secreto antes de disponibilizá-los para a auditoria.

## O que não executar

- `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `ALTER`, `CREATE`, `DROP`, `GRANT` ou `REVOKE`;
- migrations, seeds, funções de teste ou consultas de negócio;
- testes negativos diretamente em produção;
- exportação de `pg_get_functiondef`, `prosrc`, secrets, JWTs ou chaves.

O catálogo exportado comprova configuração, não comportamento completo de autorização. Testes de isolamento, revogação e JWT deverão ocorrer posteriormente em ambiente controlado com dados de teste.
