# Virada da página inicial · 24/11/2026 às 10h (Brasília)

Status: **preparada e homologada localmente. NÃO ativada.** Nenhum deploy, nenhuma variável de ambiente e nenhum agendamento foram alterados em produção.
Parecer: **GO para a preparação; a ativação depende da sua aprovação e dos passos de homologação em Preview listados abaixo.**

## 1. O que muda e o que não muda

| Endereço | Hoje (e enquanto o interruptor estiver desligado) | Depois da virada |
|---|---|---|
| `/` | Landing atual | **Guia**, sem nenhuma alteração visual |
| `/guia` | Guia | **308** para `/` (mantém `?q=`, `?cidade=`, etc.) |
| `/institucional` | 404, fora do índice (sem conteúdo duplicado) | Landing atual, integral, com canonical próprio |
| `/guia/empresas`, `/guia/<empresa>`, `/guia/lojas`, `/conexoes`... | iguais | iguais |

O aplicativo Android **não carrega `/` nem `/guia` do site**: é um pacote próprio do Capacitor (`webDir: dist`, sem `server.url`). Os links que ele usa são de empresas (`/guia/<empresa>`, `conexaomaconica://guia/<empresa>`), que não mudam.

## 2. O interruptor (feature flag)

Lido **no servidor, a cada requisição** (`lib/site/home-switch.ts`), de duas variáveis de ambiente (não são `NEXT_PUBLIC`):

| Variável | Valores |
|---|---|
| `HOME_SWITCH_MODE` | `off` (padrão), `on`, `scheduled` |
| `HOME_SWITCH_AT` | só no modo `scheduled`: ISO 8601 **com fuso**. Valor oficial: `2026-11-24T10:00:00-03:00` |

- **Sem nada configurado = tudo como hoje.** Valor desconhecido, data sem fuso ou ilegível = **desligado** (falha fechada).
- **A data exige fuso explícito** porque o servidor roda em UTC: "10h" sem fuso seria ambíguo.

### Agendamento automático às 10h: é possível e é seguro?
**Sim.** No modo `scheduled` não existe tarefa agendada, cron nem pessoa envolvida: a cada requisição o código compara o horário do servidor com `HOME_SWITCH_AT`. Às 10h00 de Brasília (13h00 UTC), a **primeira requisição** já recebe o Guia em `/`. Isso foi testado com relógio simulado (um segundo antes: como hoje; às 10h em ponto: virada, na mesma execução do servidor, sem novo deploy).

Limites que você precisa conhecer:
1. **A configuração entra por variável de ambiente da Vercel, e mudar variável só vale em um novo deploy.** Ou seja: o horário é automático, mas **o ajuste das variáveis precisa estar feito e implantado antes**.
2. A mudança depende do **relógio do servidor** (confiável na Vercel).
3. Não depende do Antigravity, do seu computador, nem de alguém estar online às 10h.

## 3. Roteiro (nada abaixo foi executado)

**Até 23/11 · preparação**
1. Aprovar e fazer o deploy deste código **sem** definir nenhuma variável. O site continua exatamente como hoje (modo `off`).
2. **Homologar em Preview** (variável só no ambiente Preview): `HOME_SWITCH_MODE=on`. Conferir `/`, `/guia` (308), `/institucional`, busca, categorias, o app e o sitemap.
3. Antes de 24/11, em **Production**: `HOME_SWITCH_MODE=scheduled` e `HOME_SWITCH_AT=2026-11-24T10:00:00-03:00`, e novo deploy. O site fica igual a hoje até as 10h.

**24/11 às 10h · ativação**: automática. Sem ação.

**24/11 após 10h · verificação** (leitura pública):
```
curl -sI "https://www.conexaomaconica.com.br/guia?q=otica"   # 308 -> /?q=otica
curl -s  https://www.conexaomaconica.com.br/ | grep -o "Tradição que une"
curl -s -o /dev/null -w "%{http_code}\n" https://www.conexaomaconica.com.br/institucional   # 200
curl -s https://www.conexaomaconica.com.br/sitemap.xml | grep -o "institucional"
```
Depois: reenviar o sitemap no Search Console e conferir o app, os links compartilhados e as estatísticas.

## 4. Reversão (do mais rápido ao mais lento)
1. **Instant Rollback da Vercel** para o deploy anterior à configuração de `scheduled` (segundos, sem build). Volta ao estado de hoje.
2. Definir `HOME_SWITCH_MODE=off` em Production e implantar (alguns minutos).
3. O código com o interruptor desligado é idêntico ao de hoje: não há nada a desfazer no banco.

**O 308 não fica preso nos navegadores:** a resposta sai com `Cache-Control: no-store` (verificado em modo de produção), então quem passou pela virada volta ao normal logo após o rollback. O Google trata 308 como permanente, o que é o desejado para o SEO.

## 5. Arquivos alterados

Movidos (histórico preservado, conteúdo igual): `app/(public)/guia/page.tsx` -> `guia/guia-home.tsx` e `app/(public)/page.tsx` -> `_home/landing-home.tsx`. Eles precisaram sair dos arquivos de página porque o Next só aceita certas exportações nesses arquivos e agora as duas páginas são compartilhadas.

Novos: `lib/site/home-switch.ts`, `components/public/home-switch-context.tsx`, `app/(public)/page.tsx` (seletor), `app/(public)/guia/page.tsx` (guarda/redirecionamento), `app/(public)/institucional/page.tsx`.

Alterados: `app/(public)/layout.tsx`, `PublicShell`, `LaunchExperience`, `DirectoryHeader`, `DirectoryCategories`, `app/sitemap.ts`, `lib/seo/sitemap-entries.ts`, `lib/seo/business-breadcrumb.ts`, `lib/seo/revalidate-public-seo.ts`, `guia/[slug]/page.tsx`.

Metadados: o canonical, o Open Graph e o JSON-LD do Guia passam a apontar para `/` depois da virada; o caminho de navegação das empresas fica "Início > Cidade > Categoria > Empresa" (sem "Guia", que seria o mesmo endereço de "Início"); o sitemap passa a listar `/` e `/institucional` e deixa de listar `/guia`. `robots.txt` não muda.

## 6. Resultados dos testes

| Verificação | Resultado |
|---|---|
| Interruptor (modos, fuso, falha fechada, horário exato, rollback) | 15 de 15 |
| Páginas `/`, `/guia`, `/institucional` nos 3 estados (desligado, ligado, agendado com relógio simulado) | 11 de 11 |
| Casco (cabeçalho, rodapé, navegação inferior), sitemap e breadcrumb | 10 de 10 |
| Typecheck e build de produção | passaram; as três rotas são dinâmicas |
| Site local, estado desligado: `/` landing, `/guia` Guia, `/institucional` 404 | confirmado |
| Site local, estado ligado: `/` Guia, `/guia` 308 com filtros, `/institucional` landing | confirmado |
| **Conteúdo do Guia: `/guia` (antes) vs `/` (depois)** | **idêntico** (mesmo hash do texto visível) |
| **Conteúdo da landing: `/` (antes) vs `/institucional` (depois)** | **idêntico** |
| Capturas 375/768/1440 px, Guia antes vs depois | diferença de 0%, 0,003% e 0,071% dos pixels |
| Capturas da landing antes vs depois | 0% de diferença |
| Navegação real no estado ligado (busca) | funciona, sem erros de console |

## 7. Riscos e o que NÃO foi testado
- **Preview real da Vercel:** não testado (sem acesso ao projeto). Os testes locais usaram o servidor de desenvolvimento e o de produção local.
- **Aplicativo Android:** análise de código apenas (pacote próprio, sem `server.url`). Não abri o app.
- **Links internos para `/guia`:** 6 links da página inicial (por exemplo "Início" do cabeçalho) ainda apontam para `/guia`. Funcionam, com um salto 308. Pode ser limpo depois do lançamento.
- **Google Search Console, e-mails e links já compartilhados:** `/guia` passa a redirecionar para `/`, o que é o esperado. A reindexação leva dias.
- **Relógio:** a virada depende do horário do servidor da Vercel.
- **Estatísticas:** a página inicial passa a ser o Guia, então as métricas de visita à landing e ao Guia mudam de endereço.
- **Dados:** os testes locais leram o banco oficial (somente leitura). Os visitantes de teste são identificados como automatizados e não gravam estatística.

## 8. Parecer
**GO** para a preparação. **A ativação só deve ocorrer depois** do deploy desta preparação (desligada), da homologação em Preview e da sua aprovação explícita das variáveis de ambiente.
