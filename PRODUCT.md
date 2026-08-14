# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Multilateral — três públicos com valor equivalente:

- **Quem busca**: o irmão maçom (e membros da comunidade) que procura serviços, negócios e relacionamento comercial com outros irmãos.
- **Quem anuncia**: o empresário maçom que publica seu negócio, escolhe plano (bronze/prata/ouro), acumula selos de confiança e captura contatos.
- **Quem administra**: o admin da loja/obediência (socio_admin) que governa o portal regional — moderação, verificação de vínculo, valores de assinatura e identidade visual do portal (white-label).

## Product Purpose

A plataforma CivicOS permite criar ecossistemas digitais privados baseados em confiança. A primeira vertical, **Conexão Maçônica**, é a plataforma de descoberta, geração de negócios e relacionamento comercial para a comunidade maçônica. Sucesso significa um maçom encontrar rapidamente um irmão de confiança para o serviço que precisa, e um empresário maçom crescer sua clientela dentro da comunidade.

## Positioning

Dois mecanismos se combinam e nenhum diretório comum consegue copiá-los juntos:

1. **Confiança verificada**: o vínculo maçônico é verificado e moderado (selos, credenciais, ciclo de vida de 10 estados do vínculo) — a entrada na rede é auditada, não autodeclarada.
2. **Relação comercial entre irmãos**: a rede é privada e fechada; o valor está na indicação e na parceria entre membros, não no alcance público.

## Operating Context

- A comunidade maçônica opera por hierarquias (lojas, obediências/grandes orientes) e por rituais de confiança — o produto respeita a etiqueta e o vocabulário maçônicos.
- Portal regional por tenant: cada obediência/loja administra seu subdomínio (slug), seus valores de anuidade e sua identidade.
- Fluxos centrais: verificação de vínculo (moderação admin), publicação de negócios (4 passos + planos + cupons e fundador/programa de fundadores), relacionamento comercial (favoritos, contatos, contratos com consentimento LGPD), conteúdo (artigos, eventos, banners, popups).
- Identidade em **3 camadas** (decisão de produto): Camada 0 = identidade da plataforma (CivicOS); Camada 1 = identidade do cliente (tenant, resolvida por subdomínio/header/cookie e injetada como CSS vars); Camada 2 = white-label self-service no Brand Studio (logo, favicon, nome, cor primária, accent, fonte, raio, densidade, modo de cor).

## Capabilities and Constraints

- **Arquitetura plugin-first**: kernel (packages/core) + plugins de domínio (business-directory, community-directory, conexao-maconica); apps web e mobile (shell Capacitor) são hosts.
- **Multi-tenancy com RLS**: tenants, tenant_members, roles (master, socio_admin, anunciante, usuario_comum), `has_tenant_admin_access` como guarda de autorização.
- **Tokens de identidade**: sistema OKLCH em `packages/ui/src/tokens/tokens.css`; tokens de status (success/warning/danger) e piso de contraste WCAG AA 4.5:1 são **protegidos** e nunca mudam por tenant.
- **LGPD**: vínculo maçônico é dado pessoal sensível (art. 5º II) — consentimento com hash, contratos, exportação/revogação e trilha de auditoria são requisitos (skills lgpd-revisao, moderacao-fluxo).
- Restrição não decidida: upload de logo/favicon (bucket de storage) — hoje o Brand Studio aceita URLs.

## Brand Commitments

- Nomes vinculantes: **CivicOS** (plataforma) e **Conexão Maçônica** (primeiro cliente/vertical).
- Identidade em 3 camadas é compromisso de produto (acima), não sugestão de tema.
- Etiqueta maçônica como restrição de linguagem e funcionamento (respeito à hierarquia e à privacidade do vínculo).
- Conexão Maçônica — cores semente definidas pela plataforma: bordô #4A0E1A + dourado #C9A227 (radius lg), editáveis pelo admin.

## Evidence on Hand

- `PRODUCT-VISION.md`, `ARCHITECTURE.md`, `CONSTITUTION.md`, `ROADMAP.md`, `CHANGELOG.md`, `docs/`.
- Manifestos de plugin (`plugins/*/plugin.json`), seed determinístico (`supabase/seed.sql`), migrations 001–034, smoke do Gate 1 (`supabase/gate1-smoke.sql`).
- `apps/web` com 39 rotas, suíte de 106 testes (vitest), design-lab como laboratório de sistema.
- **Ausências que não devem ser fabricadas**: nenhum cliente real além dos seeds de desenvolvimento; nenhum depoimento, case ou dado de mercado.

## Product Principles

1. **Confiança antes de escala**: entrada na rede exige verificação e moderação; nenhum atalho autodeclarado.
2. **O tenant é dono do portal**: identidade, valores e conteúdo regionais pertencem ao cliente; a plataforma fornece o motor e protege o piso (contraste, status, LGPD).
3. **LGPD é fronteira de sistema**: dado sensível sem consentimento verificável não trafega, não fica retido sem prazo e pode ser exportado/revogado.
4. **Isolamento por contratos**: plugins acessam o kernel por contratos e permissões; a apresentação (rotas, navegação, widgets) é declarada, não acoplada.
5. **Falha visível e recuperável**: erros nomeiam o problema e a recuperação; SSR nunca quebra por falha de resolução (tenant, kernel).

## Accessibility & Inclusion

- Idioma padrão do produto: português (pt-BR), inclusive vocabulário maçônico.
- Contraste WCAG AA (4.5:1, texto) é piso técnico de identidade — tokens de status protegidos garantem legibilidade em qualquer marca.