# Virada da página inicial · Homologação em Preview real da Vercel (17/11/2026)

Status: **homologação parcial concluída; faltam o teste de virada por horário e o de rollback na Vercel (dependem de ação no painel).**
Parecer provisório: **GO** para a lógica, rotas, cache, SEO e layout; **NO-GO para o agendamento em Production** até fechar os dois testes pendentes e a sua aprovação.

## Ambiente testado
- Preview da branch `preview/home-switch-jsonld` (commit `c5e635a`, que contém o `0b89c9a` da preparação), com `HOME_SWITCH_MODE=on` **somente no escopo Preview**. Production não foi alterada: segue com o recurso desligado.
- Acesso por bypass de automação da Vercel (segredo usado apenas por variável de ambiente nos testes, nunca gravado em arquivo).
- Limite do ambiente: o endereço do Preview **não é domínio cadastrado do tenant**, então o Guia aparece com textos padrão e **sem empresas**. Por isso comparações de conteúdo com a produção não valem no Preview; valem rotas, redirecionamentos, cabeçalhos, cache, metadados e estrutura.

## Resultados (Vercel real)

| Verificação | Resultado |
|---|---|
| `/` serve o Guia | OK |
| `/guia` | 308 para `/` |
| `/guia?q=otica`, `/guia?cidade=...` | 308 mantendo os parâmetros (`/?q=otica`) |
| `/institucional` | 200, landing, canonical próprio, indexável |
| Filtros em `/` | `noindex, follow`, canonical aponta para a página inicial |
| Cache-Control de `/`, `/guia`, `/institucional`, `/guia/empresas`, `/conexoes` | `private, no-cache, no-store`; **o 308 também** |
| `X-Vercel-Cache` (3 requisições seguidas em `/`, `/institucional`, `/guia`) | `MISS` em todas: a CDN não guarda o HTML |
| Sitemap | `/` e `/institucional` presentes; `/guia` ausente |
| JSON-LD do Guia em `/` | `BreadcrumbList` com 1 item, `WebSite` em `/` |
| JSON-LD da landing em `/institucional` | **corrigido** (ver abaixo): `WebPage` e `Event` em `/institucional` |
| Layout 375/768/1440 px | 1 cabeçalho, 1 rodapé, sem rolagem horizontal, 0 erros de console |
| Busca na página inicial | leva a `/guia/empresas?q=...`, como antes |
| `/login`, `/forgot-password`, `/register`, `/anunciar/passo-1`, `/guia/lojas`, `/guia/eventos`, `/guia/beneficios` | 200 |
| `/auth/confirm` sem token ou inválido | 307 para `/forgot-password?erro=link_invalido` |
| `/auth/callback` com `next` externo | não redireciona para o site externo |

## Defeito encontrado e corrigido (commit `c5e635a`)
Depois da virada, a landing em `/institucional` declarava `WebPage` e `Event` com `url="/"` (a raiz, que passa a ser o Guia). Além disso, esses esquemas eram **constantes de módulo**, calculadas uma vez ao subir o servidor, e não acompanhariam a virada por horário. Agora são montados a cada requisição. Verificado na Vercel: `WebPage` e `Event` em `/institucional`, caminho de navegação "Início → /  |  Institucional → /institucional". 4 testes novos, inclusive atravessando as 10h no mesmo processo.

## Pendente (exige ação no painel da Vercel)
1. **Virada automática por horário na Vercel (confirmada pelo responsável, observada no navegador em 17/11 às 17h05; não houve verificação automatizada de antes/depois):** em Preview, `HOME_SWITCH_MODE=scheduled` e `HOME_SWITCH_AT` alguns minutos à frente, redeploy, e observar a troca acontecer sozinha, sem novo deploy.
2. **Rollback em navegador real:** depois da virada, voltar `HOME_SWITCH_MODE=off`, redeploy e conferir que `/guia` volta a responder 200, sem redirecionamento persistente no mesmo navegador.
3. **Links de empresas e categorias** com dados reais: não dá para testar no Preview (sem tenant). Cobertos pelo teste local e pelos testes unitários.
4. **Aplicativo Android:** só análise de código (pacote próprio do Capacitor, sem `server.url`).

## Riscos remanescentes
- A virada depende do relógio do servidor da Vercel e de as variáveis estarem presentes no deploy de Production.
- 6 links internos ainda apontam para `/guia` (funcionam via 308); limpeza pós-lançamento.
- 30 falhas preexistentes de testes, classificadas em `docs/testing/` e no relatório anterior; nenhuma envolve rotas ou a virada.
