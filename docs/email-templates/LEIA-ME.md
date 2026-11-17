# E-mails de autenticação com a identidade da Conexão Maçônica

Os e-mails de **recuperar senha, confirmar cadastro, convite, link de acesso, troca de e-mail e código de confirmação** são enviados pelo **Supabase Auth**, não pelo site.

## ORDEM DE APLICAÇÃO (importante)
1. **Primeiro, o deploy do site** com a rota `/auth/confirm` (os modelos novos apontam para ela). Se colar os modelos antes do deploy, o link do e-mail dá página não encontrada.
2. **Depois, configurar o SMTP próprio** (seção 2). Sem isso, o Supabase **só entrega para e-mails da equipe do projeto** (erro `email_address_not_authorized`): clientes reais não recebem o e-mail de recuperação.
3. **Por último, colar os 6 modelos** (seção 1) e testar (seção 4).

## 1. Colar os modelos (Supabase → Authentication → Emails → Templates)

| Aba do Supabase | Arquivo | Assunto (Subject) |
|---|---|---|
| Reset Password | `supabase/recuperar-senha.html` | Redefinir sua senha \| Conexão Maçônica |
| Confirm sign up | `supabase/confirmar-cadastro.html` | Confirme seu e-mail \| Conexão Maçônica |
| Invite user | `supabase/convite.html` | Você foi convidado(a) para a Conexão Maçônica |
| Magic Link | `supabase/link-de-acesso.html` | Seu link de acesso \| Conexão Maçônica |
| Change Email Address | `supabase/troca-de-email.html` | Confirme a troca de e-mail \| Conexão Maçônica |
| Reauthentication | `supabase/codigo-de-confirmacao.html` | Seu código de confirmação \| Conexão Maçônica |

Para cada aba: preencha o **Subject**, apague o corpo atual, cole o HTML do arquivo e salve. Não altere as variáveis entre chaves duplas (`{{ .ConfirmationURL }}`, `{{ .Token }}`, `{{ .Email }}`, `{{ .NewEmail }}`, `{{ .SiteURL }}`): o Supabase as preenche.

Para ver como fica antes de colar, abra os arquivos de `preview/` no navegador (têm valores de exemplo). Capturas em `capturas/`.

## 2. Remetente: configurar SMTP próprio (importante para o lançamento)
Sem SMTP próprio, o Supabase envia de um endereço dele, com **limite muito baixo de e-mails por hora**. Em produção, isso trava recuperação de senha quando há vários pedidos. Configure em **Authentication → Emails → SMTP Settings**:
- **Sender name:** Conexão Maçônica
- **Sender e-mail:** um endereço do domínio da marca (por exemplo, `nao-responda@conexaomaconica.com.br`)
- **Servidor SMTP:** o mesmo provedor que o site já usa para e-mails transacionais (Hostinger ou Resend), com as credenciais SMTP dele. A chave da API do site não serve para isso.
- No DNS do domínio: SPF, DKIM e DMARC do provedor, senão os e-mails caem em spam.

## 3. Conferir as URLs (Authentication → URL Configuration)
- **Site URL:** `https://www.conexaomaconica.com.br`
- **Redirect URLs:** devem incluir a página de redefinir senha do site e a do app (a rota do aplicativo usa o mesmo fluxo).

## 4. Testar
1. Peça "Esqueci a senha" com uma conta de teste.
2. Confira: remetente, assunto, logo visível (fundo vinho), botão funcionando e o link abrindo a tela de nova senha.
3. Teste no Gmail e no Outlook, no celular e no computador.

## Regenerar
Os arquivos são gerados por `scripts/gen-auth-email-templates.cjs` (`node scripts/gen-auth-email-templates.cjs`). Para mudar texto ou cores, edite o script e rode de novo, em vez de editar cada HTML.

## Limites
- O logo é carregado de `https://www.conexaomaconica.com.br/logoconexao_red.png`. Se essa URL mudar, os e-mails perdem a imagem. Alguns clientes de e-mail bloqueiam imagens até o usuário permitir; por isso o cabeçalho vinho com a borda dourada aparece mesmo sem a imagem.
- O logo tem o texto "Conexão" em branco, então só funciona sobre fundo escuro. Não troque o cabeçalho para branco.
- A validade do link de recuperação é a configurada no Supabase. O texto diz "validade limitada" e não cita um número, para não ficar errado se você mudar.
