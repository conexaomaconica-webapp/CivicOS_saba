# Diretrizes de Segurança de Variáveis de Ambiente e Secrets

**Plataforma:** Conexão Maçônica / CivicOS SABA  
**Data:** Outubro de 2026  
**Fase:** Etapa 1 — Segurança & LGPD

---

## 1. `ANALYTICS_SALT` (Obrigatória em Produção)

### Descrição e Finalidade
A variável de ambiente `ANALYTICS_SALT` é utilizada pelo servidor no cálculo de hashes criptográficos irreversíveis (HMAC-SHA256) dos identificadores temporários dos visitantes. O objetivo é assegurar a anonimização estrita dos acessos e métricas de navegação do Guia Comercial em conformidade com a LGPD (Lei nº 13.709/2018).

### Requisitos de Segurança
- **Tamanho mínimo:** 32 caracteres.
- **Formato recomendado:** Sequência hexadecimal ou base64 criptograficamente aleatória de 256 bits (64 caracteres hexadecimais).
- **Escopo:** Estritamente Server-Side. NUNCA utilize o prefixo `NEXT_PUBLIC_` nesta variável para impedir seu vazamento no client bundle do navegador.
- **Comportamento em Produção:** Se `ANALYTICS_SALT` estiver ausente ou possuir menos de 32 caracteres quando `NODE_ENV === 'production'`, o serviço de analytics interromperá a requisição de registro emitindo uma exceção explícita no servidor, sem expor dados pessoais nem segredos.
- **Ambiente Local/Testes:** Em desenvolvimento (`development` ou `test`), a plataforma utiliza um fallback local claramente rotulado para evitar interrupções de trabalho.

---

## 2. Como Gerar uma Chave Segura

Para gerar um valor único e seguro para `ANALYTICS_SALT`, execute um dos seguintes comandos no terminal local:

### Opção A: Usando OpenSSL (Recomendado)
```bash
openssl rand -hex 32
```

### Opção B: Usando Node.js
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 3. Configuração na Vercel

1. Acesse o dashboard do projeto na **Vercel** (`https://vercel.com/`).
2. Navegue até **Settings** ➔ **Environment Variables**.
3. Adicione a variável:
   - **Key:** `ANALYTICS_SALT`
   - **Value:** *(Cole o hash de 64 caracteres gerado)*
   - **Environment:** Marque `Production`, `Preview` e `Development`.
4. Salve as alterações e execute um novo deploy.

---

> ⚠️ **IMPORTANTE:** NUNCA insira o valor real da secret no arquivo `.env` commitado no repositório GitHub nem em documentos de auditoria. Use o painel de variáveis da hospedagem (Vercel).
