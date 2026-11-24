# Templates de E-mail do Supabase Auth — Padrão Conexão Maçônica

Estes 6 templates HTML seguem exatamente o padrão visual de `brandedEmailHtml` (`apps/web/src/lib/email/send-email.ts` e `apps/web/src/lib/auth/password-recovery-email.ts`):
- Cabeçalho bordô (`#5d1523`) com a logomarca oficial (`https://conexaomaconica.com.br/logoconexao_red_vert.png`)
- Cartão branco sobre fundo `#faf7f2`
- Botão principal `#5d1523` apontando para `/auth/confirm?token_hash={{ .TokenHash }}&type=...` (compatível com qualquer navegador ou aplicativo de e-mail)
- Assinatura institucional da Conexão Maçônica

Cole o **Assunto (Subject)** e o **HTML (Body)** correspondentes em **Supabase Dashboard → Authentication → Email Templates**.

---

## 1. Confirm sign up (`confirm-sign-up`)
**Subject:** `Confirme seu cadastro | Conexão Maçônica`

```html
<!doctype html><html lang="pt-BR"><body style="margin:0;background:#faf7f2;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf7f2;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e7e5e4;border-radius:16px;overflow:hidden">
<tr><td align="center" bgcolor="#5d1523" style="background-color:#5d1523;padding:24px 20px;text-align:center;">
  <img src="https://conexaomaconica.com.br/logoconexao_red_vert.png" alt="Conexão Maçônica" width="240" height="51" style="width:240px;max-width:260px;height:auto;display:block;margin:0 auto;border:0;" />
</td></tr>
<tr><td style="padding:28px 24px">
<h1 style="margin:0 0 16px;font-size:20px;color:#5d1523">Confirme sua inscrição</h1>
<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#292524">Seja bem-vindo(a) à Conexão Maçônica! Recebemos o seu cadastro na plataforma.</p>
<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#292524">Clique no botão abaixo para confirmar seu endereço de e-mail e ativar sua conta.</p>
<p style="margin:22px 0"><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/login" style="display:inline-block;background:#5d1523;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:13px 22px;border-radius:10px">Confirmar meu cadastro</a></p>
<p style="margin:0 0 6px;font-size:12px;color:#78716c;word-break:break-all">Se o botão não abrir, copie este endereço no navegador:<br>{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/login</p>
<p style="margin:14px 0 0;font-size:12px;color:#78716c">Se você não realizou este cadastro, ignore este e-mail com segurança.</p>
<div style="margin-top:28px;padding-top:20px;border-top:1px solid #e7e5e4;">
  <p style="margin:0;font-size:15px;font-weight:bold;color:#5d1523;">Conexão Maçônica</p>
  <p style="margin:4px 0 0;font-size:13px;font-style:italic;color:#78716c;">&ldquo;Tradição que une! Conexão que fortalece!&rdquo;</p>
  <p style="margin:6px 0 0;font-size:13px;color:#44403c;"><strong>Tel:</strong> 75 981524838</p>
</div>
</td></tr></table></td></tr></table></body></html>
```

---

## 2. Invite user (`invite-user`)
**Subject:** `Você foi convidado para a Conexão Maçônica`

```html
<!doctype html><html lang="pt-BR"><body style="margin:0;background:#faf7f2;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf7f2;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e7e5e4;border-radius:16px;overflow:hidden">
<tr><td align="center" bgcolor="#5d1523" style="background-color:#5d1523;padding:24px 20px;text-align:center;">
  <img src="https://conexaomaconica.com.br/logoconexao_red_vert.png" alt="Conexão Maçônica" width="240" height="51" style="width:240px;max-width:260px;height:auto;display:block;margin:0 auto;border:0;" />
</td></tr>
<tr><td style="padding:28px 24px">
<h1 style="margin:0 0 16px;font-size:20px;color:#5d1523">Convite de acesso</h1>
<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#292524">Você recebeu um convite para criar sua conta e acessar a plataforma Conexão Maçônica.</p>
<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#292524">Clique no botão abaixo para aceitar o convite e definir sua senha de acesso.</p>
<p style="margin:22px 0"><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite" style="display:inline-block;background:#5d1523;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:13px 22px;border-radius:10px">Aceitar convite e criar senha</a></p>
<p style="margin:0 0 6px;font-size:12px;color:#78716c;word-break:break-all">Se o botão não abrir, copie este endereço no navegador:<br>{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite</p>
<p style="margin:14px 0 0;font-size:12px;color:#78716c">Se você não esperava este convite, pode ignorar este e-mail.</p>
<div style="margin-top:28px;padding-top:20px;border-top:1px solid #e7e5e4;">
  <p style="margin:0;font-size:15px;font-weight:bold;color:#5d1523;">Conexão Maçônica</p>
  <p style="margin:4px 0 0;font-size:13px;font-style:italic;color:#78716c;">&ldquo;Tradição que une! Conexão que fortalece!&rdquo;</p>
  <p style="margin:6px 0 0;font-size:13px;color:#44403c;"><strong>Tel:</strong> 75 981524838</p>
</div>
</td></tr></table></td></tr></table></body></html>
```

---

## 3. Magic link or OTP (`magic-link-or-otp`)
**Subject:** `Seu link de acesso | Conexão Maçônica`

```html
<!doctype html><html lang="pt-BR"><body style="margin:0;background:#faf7f2;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf7f2;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e7e5e4;border-radius:16px;overflow:hidden">
<tr><td align="center" bgcolor="#5d1523" style="background-color:#5d1523;padding:24px 20px;text-align:center;">
  <img src="https://conexaomaconica.com.br/logoconexao_red_vert.png" alt="Conexão Maçônica" width="240" height="51" style="width:240px;max-width:260px;height:auto;display:block;margin:0 auto;border:0;" />
</td></tr>
<tr><td style="padding:28px 24px">
<h1 style="margin:0 0 16px;font-size:20px;color:#5d1523">Acesso rápido à sua conta</h1>
<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#292524">Use o botão abaixo para entrar na Conexão Maçônica sem precisar digitar sua senha, ou informe o código temporário:</p>
<p style="margin:0 0 18px;font-size:24px;font-weight:bold;letter-spacing:4px;color:#5d1523;background:#faf7f2;border:1px solid #e7e5e4;border-radius:10px;padding:12px 16px;text-align:center;">{{ .Token }}</p>
<p style="margin:22px 0"><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=magiclink" style="display:inline-block;background:#5d1523;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:13px 22px;border-radius:10px">Entrar na Conexão Maçônica</a></p>
<p style="margin:0 0 6px;font-size:12px;color:#78716c;word-break:break-all">Se o botão não abrir, copie este endereço no navegador:<br>{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=magiclink</p>
<p style="margin:14px 0 0;font-size:12px;color:#78716c">Este código e link têm validade curta e são de uso pessoal.</p>
<div style="margin-top:28px;padding-top:20px;border-top:1px solid #e7e5e4;">
  <p style="margin:0;font-size:15px;font-weight:bold;color:#5d1523;">Conexão Maçônica</p>
  <p style="margin:4px 0 0;font-size:13px;font-style:italic;color:#78716c;">&ldquo;Tradição que une! Conexão que fortalece!&rdquo;</p>
  <p style="margin:6px 0 0;font-size:13px;color:#44403c;"><strong>Tel:</strong> 75 981524838</p>
</div>
</td></tr></table></td></tr></table></body></html>
```

---

## 4. Change email address (`change-email-address`)
**Subject:** `Confirme seu novo e-mail | Conexão Maçônica`

```html
<!doctype html><html lang="pt-BR"><body style="margin:0;background:#faf7f2;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf7f2;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e7e5e4;border-radius:16px;overflow:hidden">
<tr><td align="center" bgcolor="#5d1523" style="background-color:#5d1523;padding:24px 20px;text-align:center;">
  <img src="https://conexaomaconica.com.br/logoconexao_red_vert.png" alt="Conexão Maçônica" width="240" height="51" style="width:240px;max-width:260px;height:auto;display:block;margin:0 auto;border:0;" />
</td></tr>
<tr><td style="padding:28px 24px">
<h1 style="margin:0 0 16px;font-size:20px;color:#5d1523">Confirme a alteração de e-mail</h1>
<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#292524">Recebemos uma solicitação para atualizar o endereço de e-mail da sua conta na Conexão Maçônica para <strong>{{ .NewEmail }}</strong>.</p>
<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#292524">Clique no botão abaixo para confirmar a mudança.</p>
<p style="margin:22px 0"><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email_change" style="display:inline-block;background:#5d1523;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:13px 22px;border-radius:10px">Confirmar novo e-mail</a></p>
<p style="margin:0 0 6px;font-size:12px;color:#78716c;word-break:break-all">Se o botão não abrir, copie este endereço no navegador:<br>{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email_change</p>
<p style="margin:14px 0 0;font-size:12px;color:#78716c">Se você não solicitou esta alteração, entre em contato com nossa equipe imediatamente.</p>
<div style="margin-top:28px;padding-top:20px;border-top:1px solid #e7e5e4;">
  <p style="margin:0;font-size:15px;font-weight:bold;color:#5d1523;">Conexão Maçônica</p>
  <p style="margin:4px 0 0;font-size:13px;font-style:italic;color:#78716c;">&ldquo;Tradição que une! Conexão que fortalece!&rdquo;</p>
  <p style="margin:6px 0 0;font-size:13px;color:#44403c;"><strong>Tel:</strong> 75 981524838</p>
</div>
</td></tr></table></td></tr></table></body></html>
```

---

## 5. Reset password (`reset-password`)
**Subject:** `Crie uma nova senha | Conexão Maçônica`

```html
<!doctype html><html lang="pt-BR"><body style="margin:0;background:#faf7f2;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf7f2;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e7e5e4;border-radius:16px;overflow:hidden">
<tr><td align="center" bgcolor="#5d1523" style="background-color:#5d1523;padding:24px 20px;text-align:center;">
  <img src="https://conexaomaconica.com.br/logoconexao_red_vert.png" alt="Conexão Maçônica" width="240" height="51" style="width:240px;max-width:260px;height:auto;display:block;margin:0 auto;border:0;" />
</td></tr>
<tr><td style="padding:28px 24px">
<h1 style="margin:0 0 16px;font-size:20px;color:#5d1523">Crie uma nova senha</h1>
<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#292524">Recebemos um pedido para redefinir a senha da sua conta na Conexão Maçônica.</p>
<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#292524">Use o botão abaixo para criar uma nova senha. O link é pessoal e tem validade curta.</p>
<p style="margin:22px 0"><a href="{{ .SiteURL }}/auth/redefinir?token_hash={{ .TokenHash }}" style="display:inline-block;background:#5d1523;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:13px 22px;border-radius:10px">Criar nova senha</a></p>
<p style="margin:0 0 6px;font-size:12px;color:#78716c;word-break:break-all">Se o botão não abrir, copie este endereço no navegador:<br>{{ .SiteURL }}/auth/redefinir?token_hash={{ .TokenHash }}</p>
<p style="margin:14px 0 0;font-size:12px;color:#78716c">Se você não fez este pedido, ignore este e-mail: sua senha continua a mesma.</p>
<div style="margin-top:28px;padding-top:20px;border-top:1px solid #e7e5e4;">
  <p style="margin:0;font-size:15px;font-weight:bold;color:#5d1523;">Conexão Maçônica</p>
  <p style="margin:4px 0 0;font-size:13px;font-style:italic;color:#78716c;">&ldquo;Tradição que une! Conexão que fortalece!&rdquo;</p>
  <p style="margin:6px 0 0;font-size:13px;color:#44403c;"><strong>Tel:</strong> 75 981524838</p>
</div>
</td></tr></table></td></tr></table></body></html>
```

---

## 6. Reauthentication (`reauthentication`)
**Subject:** `Código de verificação de segurança | Conexão Maçônica`

```html
<!doctype html><html lang="pt-BR"><body style="margin:0;background:#faf7f2;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf7f2;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e7e5e4;border-radius:16px;overflow:hidden">
<tr><td align="center" bgcolor="#5d1523" style="background-color:#5d1523;padding:24px 20px;text-align:center;">
  <img src="https://conexaomaconica.com.br/logoconexao_red_vert.png" alt="Conexão Maçônica" width="240" height="51" style="width:240px;max-width:260px;height:auto;display:block;margin:0 auto;border:0;" />
</td></tr>
<tr><td style="padding:28px 24px">
<h1 style="margin:0 0 16px;font-size:20px;color:#5d1523">Confirme sua identidade</h1>
<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#292524">Para concluir uma alteração sensível na sua conta da Conexão Maçônica, informe o código de verificação abaixo:</p>
<p style="margin:0 0 18px;font-size:26px;font-weight:bold;letter-spacing:5px;color:#5d1523;background:#faf7f2;border:1px solid #e7e5e4;border-radius:10px;padding:14px 16px;text-align:center;">{{ .Token }}</p>
<p style="margin:14px 0 0;font-size:12px;color:#78716c">Se você não iniciou esta ação, recomendamos alterar sua senha imediatamente.</p>
<div style="margin-top:28px;padding-top:20px;border-top:1px solid #e7e5e4;">
  <p style="margin:0;font-size:15px;font-weight:bold;color:#5d1523;">Conexão Maçônica</p>
  <p style="margin:4px 0 0;font-size:13px;font-style:italic;color:#78716c;">&ldquo;Tradição que une! Conexão que fortalece!&rdquo;</p>
  <p style="margin:6px 0 0;font-size:13px;color:#44403c;"><strong>Tel:</strong> 75 981524838</p>
</div>
</td></tr></table></td></tr></table></body></html>
```

