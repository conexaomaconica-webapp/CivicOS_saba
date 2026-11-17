// Gera os modelos de e-mail de autenticação do Supabase com a identidade da Conexão Maçônica.
// Saída: docs/email-templates/supabase/*.html (para colar no painel) e docs/email-templates/preview/*.html (valores de exemplo).
// Os modelos usam as variáveis do Supabase (Go template): {{ .TokenHash }}, {{ .Token }}, {{ .Email }}, {{ .NewEmail }}, {{ .SiteURL }}.
// Layout igual ao e-mail transacional do site (apps/web/src/lib/email/send-email.ts): cabeçalho vinho com logo, cartão branco, botão vinho.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'docs/email-templates/supabase');
const previewDir = path.join(root, 'docs/email-templates/preview');
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(previewDir, { recursive: true });

const WINE = '#4b161b';
const GOLD = '#c59b27';
// O logo tem o texto "Conexão" em branco: só funciona sobre fundo vinho (por isso o cabeçalho colorido).
const LOGO = 'https://www.conexaomaconica.com.br/logoconexao_red.png';

// Link do servidor (rota /auth/confirm do site): confirma o token no servidor, funciona em qualquer navegador/aparelho e não depende
// da lista de Redirect URLs do painel. {{ .SiteURL }} precisa ser o domínio oficial.
const confirmUrl = (type, next) => `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=${type}&amp;next=${next}`;

function layout({ preheader, heading, paragraphs, button, code, footnote, url }) {
  const body = paragraphs.map((t) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#292524">${t}</p>`).join('\n');
  const action = button
    ? `<p style="margin:26px 0"><a href="${url}" style="display:inline-block;background:${WINE};color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:14px 26px;border-radius:10px;border:1px solid ${GOLD}">${button}</a></p>
<p style="margin:0 0 6px;font-size:12px;line-height:1.5;color:#78716c;word-break:break-all">Se o botão não abrir, copie este endereço e cole no navegador:<br><a href="${url}" style="color:#78716c">${url}</a></p>`
    : '';
  const codeBlock = code
    ? `<p style="margin:22px 0;text-align:center"><span style="display:inline-block;background:#faf7f2;border:1px solid ${GOLD};border-radius:10px;padding:14px 26px;font-size:28px;letter-spacing:6px;font-weight:bold;color:${WINE};font-family:'Courier New',monospace">{{ .Token }}</span></p>`
    : '';
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<title>${heading} | Conexão Maçônica</title>
</head>
<body style="margin:0;background:#faf7f2;font-family:Arial,Helvetica,sans-serif">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#faf7f2">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf7f2;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e7e5e4;border-radius:16px;overflow:hidden">
<tr><td align="center" bgcolor="${WINE}" style="background-color:${WINE};padding:26px 20px;text-align:center;border-bottom:3px solid ${GOLD}">
<img src="${LOGO}" alt="Conexão Maçônica" width="230" style="width:230px;max-width:100%;height:auto;display:block;margin:0 auto;border:0;outline:none;text-decoration:none">
</td></tr>
<tr><td style="padding:30px 26px 26px">
<h1 style="margin:0 0 18px;font-size:22px;line-height:1.3;color:${WINE}">${heading}</h1>
${body}
${action}${codeBlock}
<p style="margin:18px 0 0;font-size:13px;line-height:1.5;color:#57534e">${footnote}</p>
</td></tr>
<tr><td style="padding:18px 26px 22px;background:#faf7f2;border-top:1px solid #e7e5e4;text-align:center">
<p style="margin:0;font-size:13px;font-style:italic;color:${WINE}">&ldquo;Tradição que une. Conexão que fortalece.&rdquo;</p>
<p style="margin:8px 0 0;font-size:11px;line-height:1.5;color:#78716c">Dúvidas? Escreva para <a href="mailto:contato@conexaomaconica.com.br" style="color:#78716c">contato@conexaomaconica.com.br</a><br><a href="{{ .SiteURL }}" style="color:#78716c">{{ .SiteURL }}</a></p>
</td></tr>
</table>
</td></tr></table>
</body>
</html>
`;
}

const templates = [
  {
    file: 'recuperar-senha',
    supabase: 'Reset Password (recovery)',
    subject: 'Redefinir sua senha | Conexão Maçônica',
    preheader: 'Crie uma nova senha para acessar sua conta.',
    heading: 'Redefinir sua senha',
    paragraphs: [
      'Recebemos um pedido para redefinir a senha da conta <strong>{{ .Email }}</strong>.',
      'Clique no botão abaixo para criar uma nova senha. O link tem validade limitada e só pode ser usado uma vez.',
    ],
    button: 'Criar nova senha',
    url: confirmUrl('recovery', '/update-password'),
    footnote: 'Se você não fez este pedido, pode ignorar este e-mail: sua senha continua a mesma e ninguém acessa sua conta sem ela.',
  },
  {
    file: 'confirmar-cadastro',
    supabase: 'Confirm sign up (confirmation)',
    subject: 'Confirme seu e-mail | Conexão Maçônica',
    preheader: 'Falta só um passo para ativar sua conta.',
    heading: 'Confirme seu e-mail',
    paragraphs: [
      'Bem-vindo(a) à Conexão Maçônica! Para ativar sua conta com o e-mail <strong>{{ .Email }}</strong>, confirme seu endereço no botão abaixo.',
    ],
    button: 'Confirmar meu e-mail',
    url: confirmUrl('signup', '/'),
    footnote: 'Se você não criou uma conta na Conexão Maçônica, pode ignorar este e-mail com segurança.',
  },
  {
    file: 'convite',
    supabase: 'Invite user (invite)',
    subject: 'Você foi convidado(a) para a Conexão Maçônica',
    preheader: 'Aceite o convite e crie seu acesso.',
    heading: 'Você recebeu um convite',
    paragraphs: [
      'Você foi convidado(a) para participar da Conexão Maçônica com o e-mail <strong>{{ .Email }}</strong>.',
      'Clique no botão abaixo para aceitar o convite e definir seu acesso.',
    ],
    button: 'Aceitar convite',
    url: confirmUrl('invite', '/update-password'),
    footnote: 'Se você não esperava este convite, pode ignorar este e-mail.',
  },
  {
    file: 'link-de-acesso',
    supabase: 'Magic Link (magic_link)',
    subject: 'Seu link de acesso | Conexão Maçônica',
    preheader: 'Use o link para entrar na sua conta.',
    heading: 'Seu link de acesso',
    paragraphs: ['Use o botão abaixo para entrar na sua conta <strong>{{ .Email }}</strong>. O link tem validade limitada e só pode ser usado uma vez.'],
    button: 'Entrar na minha conta',
    url: confirmUrl('magiclink', '/'),
    footnote: 'Se você não pediu este acesso, ignore este e-mail. Ninguém entra na sua conta sem o link.',
  },
  {
    file: 'troca-de-email',
    supabase: 'Change Email Address (email_change)',
    subject: 'Confirme a troca de e-mail | Conexão Maçônica',
    preheader: 'Confirme o novo e-mail da sua conta.',
    heading: 'Confirme a troca de e-mail',
    paragraphs: [
      'Recebemos um pedido para trocar o e-mail da sua conta de <strong>{{ .Email }}</strong> para <strong>{{ .NewEmail }}</strong>.',
      'Para concluir a troca, confirme no botão abaixo.',
    ],
    button: 'Confirmar novo e-mail',
    url: confirmUrl('email_change', '/'),
    footnote: 'Se você não fez este pedido, não confirme e fale com o suporte da Conexão Maçônica.',
  },
  {
    file: 'codigo-de-confirmacao',
    supabase: 'Reauthentication (reauthentication)',
    subject: 'Seu código de confirmação | Conexão Maçônica',
    preheader: 'Use o código abaixo para confirmar sua identidade.',
    heading: 'Código de confirmação',
    paragraphs: ['Para confirmar sua identidade e concluir a alteração solicitada, digite o código abaixo:'],
    code: true,
    footnote: 'Este código tem validade curta. Se você não solicitou, ignore este e-mail e considere trocar sua senha.',
  },
];

const SAMPLE = {
  '{{ .TokenHash }}': 'EXEMPLO_TOKEN_HASH',
  '{{ .Token }}': '482915',
  '{{ .Email }}': 'maria@exemplo.com.br',
  '{{ .NewEmail }}': 'maria.nova@exemplo.com.br',
  '{{ .SiteURL }}': 'https://www.conexaomaconica.com.br',
};

const index = [];
for (const t of templates) {
  const html = layout(t);
  const requiredVar = t.code ? '{{ .Token }}' : '{{ .TokenHash }}';
  if (!html.includes(requiredVar)) throw new Error(`${t.file}: variável obrigatória ausente (${requiredVar})`);
  fs.writeFileSync(path.join(outDir, `${t.file}.html`), html);
  let preview = html;
  for (const [k, v] of Object.entries(SAMPLE)) preview = preview.split(k).join(v);
  if (/\{\{/.test(preview)) throw new Error(`${t.file}: variável do Supabase sem valor de exemplo`);
  fs.writeFileSync(path.join(previewDir, `${t.file}.html`), preview);
  index.push({ file: `${t.file}.html`, supabase: t.supabase, subject: t.subject });
}
fs.writeFileSync(path.join(root, 'docs/email-templates/index.json'), JSON.stringify(index, null, 2));
console.log(`ok: ${templates.length} modelos gerados em docs/email-templates/supabase`);
