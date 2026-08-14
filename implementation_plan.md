# Plano de implementação — ecossistema White Label

Status atual: **Fase 1B concluída para revisão**. Não iniciar Home, Guia ou templates visuais.

Documentos normativos, na ordem:

1. [`FASE_1_CONTRATOS_AUTORIDADE_E_LEITURA_PUBLICA.md`](docs/products/conexao-maconica/engineering/FASE_1_CONTRATOS_AUTORIDADE_E_LEITURA_PUBLICA.md) — contenção e autoridades;
2. [`FASE_1B_DESIGN_SYSTEM_WHITE_LABEL.md`](docs/products/conexao-maconica/engineering/FASE_1B_DESIGN_SYSTEM_WHITE_LABEL.md) — Core compartilhado, tema configurável e módulos de produto;
3. `CONEXAO_MACONICA_PAGINAS_PUBLICAS.md` — somente após aprovação da fundação, aplicação do backend e homologação de RLS.

Sequência: Fase 1A → 1B → 1C (SQL proposto, sem aplicação remota) → 2 (backend controlado) → 3 (shell/Core) → 4 (páginas Conexão) → 5 (Tenant Admin) → 6 (segundo produto sem módulos maçônicos).

## Registro histórico — não executar

Status anterior: **substituído pelas Fases 1A e 1B**. Não iniciar a Fase A visual, Home, Guia ou templates a partir do conteúdo abaixo.

O plano normativo atual, a matriz RLS e os contratos propostos estão em [`docs/products/conexao-maconica/engineering/FASE_1_CONTRATOS_AUTORIDADE_E_LEITURA_PUBLICA.md`](docs/products/conexao-maconica/engineering/FASE_1_CONTRATOS_AUTORIDADE_E_LEITURA_PUBLICA.md). As migrations propostas são 040 e 041, posteriores à última migration confirmada no workspace (`039_lgpd_retention_rhid_uploads.sql`), e não foram aplicadas ao Supabase remoto.

## Escopo e guardrails

A Fase A usa exclusivamente o schema atualmente presente no repositório e limita-se ao frontend do guia público. Nesta fase:

- não executar SQL local ou remoto;
- não criar, renomear ou aplicar migrations;
- não alterar dados de tenant;
- não simular serviços, campanhas, analytics ou leads inexistentes;
- não expor dados que dependam de uma política pública de RLS ainda insegura;
- preservar isolamento por tenant em toda consulta da aplicação.

## Decisões de autoridade

### Empresa Fundadora

A autoridade canônica é o estado final estabelecido pelas migrations 030–033. O selo pode ser concedido **somente** quando `founder_allocations.status = 'granted'` para a empresa e o tenant correspondentes.

`founder_qualifications.status = 'active'` é apenas informação complementar e nunca concede o selo isoladamente. Os estados `reserved`, checkout pendente, pagamento pendente, `expired`, `refund_required`, reembolso, revogação ou pagamento tardio inválido nunca concedem reconhecimento.

Como o schema atual não oferece uma projeção pública segura dessa autoridade, a Fase A não consulta nem exibe o selo de Fundadora. Uma futura view/RPC pública deverá retornar apenas o resultado booleano já autorizado, sem expor registros financeiros.

### Plano efetivo e entitlements

`businesses.plan_tier` representa apenas a configuração comercial, não a autorização atual de recursos. A UI deve trabalhar com:

```ts
type EffectiveBusinessPlan = {
  configuredTier: "bronze" | "prata" | "ouro";
  subscriptionStatus: string | null;
  effectiveTier: "bronze" | "prata" | "ouro" | null;
  entitlements: Record<string, boolean | number>;
};
```

Não existe downgrade automático para Bronze. Assinatura inativa, vencida, cancelada ou desconhecida produz `effectiveTier: null`, salvo regra comercial explícita do tenant. Aparência, destaque e recursos derivam de `effectiveTier + entitlements`, nunca de `plan_tier` isoladamente.

O acesso público atual não permite resolver assinatura e entitlements com segurança. Portanto, na Fase A anônima, a apresentação é básica quando não houver uma projeção pública autorizada.

### Responsável público

O responsável segue a cadeia:

```text
empresa
→ vínculo empresarial/autoridade
→ perfil
→ vínculo maçônico autorizado
→ consentimento vigente de exposição pública
```

Priorizar `business_masonic_links` (ou entidade empresarial equivalente). `owner_id` e `masonic_affiliations` são apenas complementares e não comprovam autorização pública. Nome, fotografia e vínculo não aparecem na Fase A enquanto não houver projeção segura com consentimento vigente.

## Segurança pública e RLS

A migration 035 existente precisa de correção futura, fora da Fase A:

- `business_reviews USING (true)` é inseguro e o schema atual nem possui status de moderação. Até existir status e política/view/RPC que retorne somente avaliações publicadas, o frontend público não deve consultar ou exibir avaliações/agregados;
- `businesses` deve ser publicamente legível somente quando a empresa estiver ativa, `publication_status = 'published'`, pertencer ao tenant solicitado e esse tenant estiver ativo;
- `tenants USING (true)` expõe a linha inteira. A leitura anônima deve migrar para view/RPC com apenas identificador público, slug, nome, status e branding não sensível;
- filtros no frontend são defesa adicional, não substituem RLS segura nem impedem acesso direto à API.

Nenhuma dessas correções será materializada em migration nesta fase.

## Branding do tenant

Não executar atualização automática. Antes de qualquer mudança futura, apresentar tenant identificado, branding atual, SQL final, impacto e resultado esperado. O SQL candidato deve usar um único `tenant_id` e preservar propriedades existentes:

```sql
UPDATE public.tenants
SET settings = jsonb_set(
  COALESCE(settings, '{}'::jsonb),
  '{branding}',
  COALESCE(settings->'branding', '{}'::jsonb)
    || jsonb_build_object(
      'primaryColor', '#7A1F2E',
      'accentColor', '#C9A227',
      'colorMode', 'light'
    ),
  true
)
WHERE id = :tenant_id
RETURNING id, slug, settings->'branding';
```

## Entregas da Fase A

- rota pública do guia com resolução de tenant e filtro explícito por tenant, empresa ativa e publicada;
- busca e categorias sobre os resultados retornados;
- cards e página de detalhe com estados seguros para imagem, contato, endereço e coordenadas ausentes;
- CTA rotulado “Falar no WhatsApp” ou “Solicitar pelo WhatsApp”; não prometer registro de lead;
- mapa/pins apenas para resultados já carregados, distância marcada como aproximada e ação de abrir rota;
- nenhuma ordenação ou alegação global de “mais próximos” calculada após paginação;
- apresentação premium somente com plano efetivo e entitlement comprovados;
- SEO por rota, dados estruturados compatíveis com o conteúdo visível e layout responsivo a 390 px.

## Fora da Fase A

- `NNN_business_services.sql`;
- `NNN_business_campaigns_benefits.sql`;
- `NNN_business_analytics.sql`;
- `NNN_business_leads.sql`;
- RPC/view geoespacial com PostGIS ou consulta server-side equivalente;
- projeções públicas seguras para tenant, avaliações, plano efetivo, Fundadora e responsável autorizado.

Os números definitivos das migrations só serão escolhidos no momento da criação. A sequência atualmente observada termina em `038_lgpd_privacy_export_deletion.sql`, mas isso deve ser reconfirmado contra branches paralelas antes de reservar o próximo número.

## Verificação obrigatória

Além de lint, typecheck e build:

- rota pública anônima e usuário autenticado;
- tenant solicitado e outro tenant;
- empresa ativa e publicada;
- empresa ativa porém não publicada;
- avaliação pendente/não moderada não exposta;
- empresa sem contato, imagem ou coordenadas;
- assinatura inativa sem downgrade implícito;
- Fundadora com pagamento confirmado (`granted`);
- reserva de Fundador pendente sem selo;
- viewport mobile de 390 px;
- ausência de vazamento entre tenants.

Os cenários que exigem políticas ou dados ainda inexistentes devem permanecer explicitamente marcados como bloqueados, nunca aprovados por mocks que não exercitem RLS real.
