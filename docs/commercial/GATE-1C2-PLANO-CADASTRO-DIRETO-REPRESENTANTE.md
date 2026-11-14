# Gate 1C.2 — Cadastro direto de representante com senha temporária (PLANO, sem código)

Status: **plano para aprovação**. Nada implementado. Não toca em Asaas, checkout, faturamento nem regras financeiras.

## Decisões já tomadas pelo responsável

1. O cadastro do representante terá **duas opções**: (A) **convite** (já existe) e (B) **acesso direto com senha temporária**.
2. A senha temporária exige **troca obrigatória no primeiro login** e **prazo de validade**.
3. O representante usa **somente a web** (desktop e web mobile responsivo). Não haverá área do representante nos apps iOS/Android.
   Exceção consciente à regra de paridade das 4 plataformas (AGENTS.md §8), a ser registrada no relatório.

## Fluxo (B) — acesso direto

1. A equipe (permissão `representatives.manage`) escolhe "Acesso direto" no cadastro e informa os dados do representante.
2. O servidor cria o usuário via service role (`auth.admin.createUser`, e-mail confirmado) com senha temporária **gerada pelo servidor** (aleatória, 14+ caracteres). A equipe não digita a senha.
3. A senha é exibida **uma única vez** para a equipe (botão copiar, `Cache-Control: no-store`). Nunca é gravada em banco, auditoria ou log.
4. O representante nasce em `pending_review` (não vende até a equipe ativar).
5. No primeiro login o representante é levado a `/representante/definir-senha` e **não acessa mais nada** até trocar a senha. Em seguida aceita o contrato/termos (`contract_version`, `contract_accepted_at`).
6. A equipe revisa e ativa (ato manual, como hoje).

### Prazo de validade
- Padrão **72 h**, configurável pela equipe no cadastro (24 h a 7 dias).
- Senha temporária **expirada**: o login é encerrado com a mensagem "senha temporária expirada, solicite uma nova à equipe". A equipe usa **"Gerar nova senha temporária"** (invalida a anterior, nova validade, auditado).

### Regras de segurança
- **Nunca sobrescrever a senha de usuário existente.** Se o e-mail já tem conta (ex.: anunciante), o modo (B) é recusado e a equipe usa o convite (A), que apenas vincula a conta.
- A marca de "troca pendente" e a validade ficam em `app_metadata` (só o servidor altera) e espelhadas em `commercial_representatives`.
- Troca de senha por server action: exige a senha temporária atual, política mínima de senha, nova senha diferente da temporária. Só então limpa a marca (service role).
- Bloqueio global: usuário autenticado com troca pendente é redirecionado para `/representante/definir-senha` em qualquer rota (verificação barata no middleware, sem consulta ao banco).
- Limite de tentativas de login (rate limit) e aviso de bloqueio.
- Auditoria (sem a senha): `REPRESENTATIVE_DIRECT_CREATED`, `TEMP_PASSWORD_REGENERATED`, `FIRST_LOGIN_PASSWORD_CHANGED`, `TEMP_PASSWORD_EXPIRED`, `CONTRACT_ACCEPTED`.
- O envio da senha ao representante é feito pela equipe por canal próprio (o sistema ainda não envia e-mail).

## Fluxo (A) — convite (mantido)
Sem alteração de comportamento: vínculo quando o e-mail verificado coincide; ativação manual.

## Alterações previstas

| Item | Detalhe |
|---|---|
| Migration 240 (aditiva) + rollback | `commercial_representatives.access_mode` (`invite`/`temp_password`), `temp_password_expires_at`, `password_changed_at`; sem alterar RLS existente |
| `representatives-service.ts` | novo modo no `createRepresentativeAction`; ação de regenerar senha |
| Serviço de definição de senha | server action de troca + aceite do contrato |
| `/representante/definir-senha` | nova página (RSC + client mínimo), `noindex` |
| Middleware | redirecionamento por flag de troca pendente |
| `/comercial/representantes` | seletor de modo, exibição única da senha, estado "senha temporária pendente/expirada", botão regenerar |
| Testes | PGlite da migration 240; Vitest dos serviços e do middleware; regressão de que o modo (B) nunca altera conta existente |

## Fora desta etapa (decidir depois)
- **1C.3:** material de vendas e proposta com link pré-preenchido para o cliente concluir e pagar (o cliente aceita os termos e paga; o representante nunca registra a empresa nem toca em pagamento).
- **1D / 1E:** estornos, categorias de representante, regras de comissão, fechamento e repasses (não autorizados).

## Critérios de aceite
1. Senha temporária nunca aparece em log, auditoria ou banco.
2. Sem troca de senha, o representante não acessa nenhuma rota além de definir-senha.
3. Senha expirada não permite acesso.
4. E-mail com conta existente não tem a senha alterada.
5. Módulo desativado: nada muda no cadastro e no login atuais.
6. `pnpm --filter web typecheck` e Vitest do módulo sem regressão; baseline de 30 falhas pré-existentes inalterado.

## Pendência de confirmação
A leitura de "as duas opções" foi **convite + senha temporária**. Se a segunda opção desejada for "link para o representante definir a própria senha", o desenho acima comporta como terceiro modo.
