# Conexão Maçônica — Especificação das Páginas Públicas

> **Execução visual suspensa.** Este documento não deve ser executado isoladamente.
> Antes das páginas, aprovar a Fase 1B em
> [`FASE_1B_DESIGN_SYSTEM_WHITE_LABEL.md`](FASE_1B_DESIGN_SYSTEM_WHITE_LABEL.md),
> concluir a Fase 1C e homologar os contratos públicos/RLS. Layouts e componentes
> serão do White Label Core; cores e conteúdo maçônicos serão configuração/módulo
> do Conexão Maçônica.

> Documento operacional para uso pelo agente no Google Antigravity IDE.
>
> Escopo: Home pública, Guia de Empresas por categoria e página pública da empresa com variantes Bronze, Prata e Ouro/Fundador.

## 1. Objetivo

Ajustar as páginas existentes do Conexão Maçônica para reproduzir com fidelidade visual e funcional as referências aprovadas, preservando a arquitetura atual, o isolamento multi-tenant e os dados reais do Supabase.

As cinco referências visuais são:

1. Home pública;
2. Guia/listagem de empresas por categoria;
3. Página dedicada da empresa — Plano Bronze;
4. Página dedicada da empresa — Plano Prata;
5. Página dedicada da empresa — Plano Ouro/Empresa Fundadora.

As imagens devem ser disponibilizadas ao agente na conversa ou copiadas para uma pasta de referências do repositório. Não inventar caminhos caso os arquivos não estejam presentes.

## 2. Instrução principal ao agente

Você é um Product Designer e Engenheiro Full Stack trabalhando no projeto Conexão Maçônica.

Não crie uma aplicação paralela e não substitua a arquitetura existente. Primeiro inspecione o projeto, identifique rotas, componentes, design system, tipos, serviços, consultas, tabelas, RPCs, buckets, RLS e entitlements atuais. Em seguida, implemente os ajustes nas páginas existentes, reutilizando e refatorando componentes quando necessário.

Não inicie criando migrations. A primeira entrega obrigatória é a auditoria descrita na seção seguinte.

## 3. Fase 0 — Auditoria técnica obrigatória

Antes de alterar o código, produzir uma matriz de lacunas com as colunas:

| Requisito | Estado | Rota/componente atual | Dados/tabelas/RPCs | RLS | Entitlement | Painel de origem | Ação recomendada | Risco |
|---|---|---|---|---|---|---|---|---|

Estados permitidos:

- `existente`;
- `parcial`;
- `ausente`;
- `em conflito`.

Auditar especialmente:

- empresa e endereço;
- categorias e subcategorias;
- responsável e vínculo com a comunidade;
- contatos e redes sociais;
- logo, capa, fotos e vídeos;
- serviços;
- benefícios, cupons e campanhas;
- avaliações, comentários e moderação;
- favoritos e compartilhamentos;
- visualizações e métricas;
- solicitações de orçamento e leads;
- horário de funcionamento;
- mapas, coordenadas e proximidade;
- banners da Home;
- Guia de Lojas Maçônicas;
- busca convencional e busca com IA;
- planos Bronze, Prata e Ouro;
- Empresa Fundadora;
- Empresa Verificada;
- painel do anunciante;
- painel do Tenant Admin;
- estados de loading, vazio e erro;
- SEO e compartilhamento social.

Ao concluir a auditoria:

1. listar o que pode ser implementado apenas no frontend;
2. listar o que exige consulta/RPC nova;
3. listar o que exige ajuste de RLS;
4. listar o que realmente exige migration;
5. apontar possíveis duplicidades com estruturas existentes;
6. propor a ordem segura de execução.

Não criar tabelas, enums, RPCs ou migrations antes de verificar as estruturas atuais.

## 4. Regras obrigatórias do projeto

- Stack: Next.js 15, App Router, TypeScript strict, Tailwind CSS, shadcn/ui, Lucide React, Supabase, TanStack Query, React Hook Form e Zod.
- Preservar a arquitetura multi-tenant.
- Todo dado empresarial, usuário, plano, selo, banner, campanha, avaliação, métrica ou configuração sensível deve respeitar o `tenant_id`.
- Não comprometer autenticação, RLS, RBAC, entitlements, pagamentos ou migrations aplicadas.
- RBAC define autoridade; entitlements definem recursos do plano. Um não substitui o outro.
- Respeitar `business_id` em permissões empresariais.
- Não usar dados mockados no produto final.
- Toda informação em produção deve vir do Supabase.
- Quando não houver conteúdo, mostrar estado vazio adequado.
- Não inventar empresas, números, avaliações, visualizações, descontos ou campanhas.
- Não simular busca com IA.
- Preservar URLs, parâmetros e comportamentos atuais quando estiverem corretos.
- Não remover funcionalidade existente sem justificar.
- Não expor documento de verificação ou dado maçônico sensível.
- Não fazer perguntas, exceto diante de bloqueio técnico real.

## 5. Identidade visual do tenant

Usar como tokens configuráveis do tenant Conexão Maçônica:

| Token | Valor |
|---|---|
| Bordô Real | `#7A1F2E` |
| Dourado | `#C9A227` |
| Dourado Claro | `#E8C767` |
| Marfim | `#F3EEDD` |
| Cards | Branco quente |
| Texto | Vinho escuro ou carvão |

Direção visual:

- títulos editoriais elegantes;
- interface e formulários com sans-serif moderna e legível;
- marketplace contemporâneo, confiável e acolhedor;
- geometria maçônica apenas como detalhe discreto;
- hierarquia forte, respiro e CTAs claros.

Evitar:

- excesso de símbolos maçônicos;
- aparência medieval;
- estética de criptomoeda;
- aparência de dashboard administrativo nas páginas públicas;
- sombras pesadas;
- elementos decorativos sem função;
- valores de cor hardcoded que impeçam o white label.

## 6. Home pública

A Home deve ser uma plataforma de descoberta e geração de negócios.

Implementar ou ajustar:

- header com logo, navegação, favoritos, notificações, usuário e localização;
- busca inteligente em posição dominante;
- busca por texto, empresa, serviço, categoria e localização;
- banner/carrossel administrável pelo tenant;
- categorias em destaque;
- empresas patrocinadas;
- mapa interativo;
- resultados por proximidade;
- Guia de Lojas Maçônicas;
- filtros de lojas por cidade, potência, rito e dia de reunião;
- faixa de confiança, privacidade e LGPD;
- loading skeleton;
- estado vazio;
- estado de erro com ação de recuperação.

Separar conceitualmente:

- **Empresas:** negócios, produtos, serviços e benefícios;
- **Lojas Maçônicas:** organizações maçônicas e informações institucionais.

Os banners, categorias destacadas, patrocinadores e ordem das seções não devem ficar fixos no código quando já houver ou puder existir configuração do tenant.

## 7. Guia de empresas por categoria

Ao selecionar uma categoria, abrir ou atualizar a rota existente de listagem.

A tela deve conter:

- breadcrumb;
- nome e descrição da categoria;
- busca com localização;
- quantidade real de resultados;
- ordenação;
- alternância entre lista e mapa;
- filtros por cidade, subcategoria, vínculo, distância e destaques;
- paginação;
- cards horizontais responsivos.

Cada card deve mostrar, quando houver dados públicos:

- imagem da empresa;
- nome;
- categoria;
- nome do responsável;
- vínculo: irmão, cunhada ou sobrinho(a);
- endereço;
- avaliação;
- visualizações;
- favoritar;
- ver no mapa;
- ver empresa.

No mobile:

- transformar cards em composição vertical quando necessário;
- abrir filtros em `Sheet` ou `Drawer`;
- impedir overflow horizontal;
- manter ações essenciais acessíveis.

## 8. Regra dos selos e planos

Os conceitos são independentes:

- **Empresa Verificada:** cadastro validado;
- **Plano Bronze, Prata ou Ouro:** plano comercial;
- **Empresa Fundadora:** reconhecimento permanente e histórico.

Regras:

- nunca tratar Empresa Fundadora como plano;
- nunca usar Plano Ouro como prova de verificação;
- nunca fundir Ouro, Fundadora e Verificada em um único selo;
- uma empresa pode ser Fundadora e também possuir um plano;
- Fundadora não deve ser descrita como anúncio pago;
- Ouro pode receber destaque comercial apenas quando corresponder à busca e às regras do tenant.

Tratamentos:

- Bronze: cobre/bronze discreto;
- Prata: cinza metálico ou perolado;
- Ouro: dourado e maior destaque comercial;
- Fundadora: bordô e dourado com caráter histórico;
- Verificada: selo próprio de confiança, preferencialmente verde.

## 9. Página dedicada da empresa

Usar a rota existente equivalente a:

```text
/empresa/[slug]
```

Não criar três páginas duplicadas. Criar uma base compartilhada e aplicar variantes conforme plano, entitlements e reconhecimento.

Contrato conceitual:

```ts
type BusinessPublicPageVariant = "bronze" | "silver" | "gold";

type BusinessPublicContext = {
  variant: BusinessPublicPageVariant;
  isFounder: boolean;
  isVerified: boolean;
  entitlements: Record<string, boolean | number>;
};
```

Todos os templates devem suportar, quando cadastrado e permitido:

- logo;
- capa ou imagem principal;
- nome e categoria;
- selo de verificação;
- plano;
- reconhecimento de Fundadora;
- responsável;
- vínculo;
- endereço;
- visualizações;
- avaliações;
- Instagram;
- Facebook;
- e-mail;
- WhatsApp;
- telefone;
- como chegar;
- sobre;
- benefício, desconto ou campanha;
- comentários moderados;
- mapa;
- compartilhar;
- favoritar;
- horário;
- status aberto/fechado;
- serviços;
- solicitação de orçamento.

Se um contato ou campo opcional não estiver cadastrado, ocultar a ação. Não mostrar botão quebrado, placeholder enganoso ou informação inventada.

### 9.1 Template Bronze

- layout simples e confiável;
- uma imagem principal;
- informações essenciais;
- contatos;
- sobre;
- responsável;
- benefício;
- comentários;
- mapa;
- solicitação de orçamento;
- pouca decoração;
- sem vídeo ou recurso premium falso.

### 9.2 Template Prata

Incluir tudo do Bronze e acrescentar, conforme entitlement:

- capa maior;
- galeria;
- serviços destacados;
- avaliações detalhadas;
- tempo médio de resposta real;
- campanha ou benefício com maior visibilidade;
- navegação interna;
- maior destaque para orçamento.

### 9.3 Template Ouro/Fundador

Usar estrutura premium, mantendo Ouro e Fundadora como estados independentes.

Acrescentar, conforme entitlement e existência de dados:

- hero premium;
- galeria ampliada;
- fotos e vídeos;
- benefício ou cupom destacado;
- serviços em evidência;
- eventos, campanhas e novidades;
- depoimentos;
- indicações reais da comunidade;
- contato persistente;
- CTAs de WhatsApp e orçamento;
- tempo médio de resposta;
- maior presença na listagem.

## 10. Matriz inicial de recursos

Validar comercialmente e converter em entitlements reais. Não hardcodar limites nos componentes.

| Recurso | Bronze | Prata | Ouro |
|---|---:|---:|---:|
| Página pública | Sim | Sim | Sim |
| Contatos e redes | Sim | Sim | Sim |
| Sobre e responsável | Sim | Sim | Sim |
| Mapa e rota | Sim | Sim | Sim |
| Avaliações | Sim | Sim | Sim |
| Imagem principal | Sim | Sim | Sim |
| Galeria | Limitada | Ampliada | Premium |
| Serviços destacados | Limitado | Sim | Ampliado |
| Benefício/campanha | Básico | Destacado | Premium |
| Solicitação de orçamento | Sim | Sim | Sim |
| Vídeo | Não | Conforme regra | Sim |
| Eventos e novidades | Não | Limitado | Sim |
| Analytics | Básico | Intermediário | Completo |
| Destaque no guia | Normal | Intermediário | Prioritário |
| Destaque patrocinado na Home | Não | Conforme campanha | Sim |
| Tempo médio de resposta | Não | Sim | Sim |
| Indicações da comunidade | Não | Opcional | Sim |

## 11. Dados e capacidades a verificar

### 11.1 Dados básicos

- slug;
- nome fantasia e razão social;
- descrição curta e Sobre;
- categoria e subcategoria;
- endereço normalizado;
- latitude e longitude;
- contatos e redes;
- horário estruturado;
- status de publicação;
- plano e entitlements;
- verificação;
- reconhecimento de Fundadora.

### 11.2 Responsável e vínculo

Usar relação verificável entre pessoa e empresa. Não manter o vínculo apenas como texto solto.

Considerar:

- pessoa;
- empresa;
- função empresarial;
- vínculo;
- autorização;
- consentimento de exposição;
- status e vigência.

Não publicar loja, potência, cargo maçônico ou dado sensível sem consentimento e regra explícita.

### 11.3 Mídia

Verificar suporte para:

- logo;
- capa;
- galeria;
- miniatura de vídeo;
- URL de vídeo;
- ordem;
- texto alternativo;
- moderação.

Usar Supabase Storage com políticas por tenant e empresa. Para o MVP, preferir vídeo por URL com miniatura em vez de hospedar arquivos pesados sem necessidade.

### 11.4 Serviços

Os serviços devem ser entidades reais, ordenáveis, ativáveis e limitadas por entitlement.

### 11.5 Benefícios e campanhas

Verificar ou implementar suporte para:

- título e descrição;
- tipo de benefício;
- valor/regra do desconto;
- código do cupom;
- início e término;
- elegibilidade;
- limite de resgate;
- status;
- banner;
- registro de resgate.

### 11.6 Avaliações

Implementar ou validar:

- nota de 1 a 5;
- comentário;
- autor;
- status de moderação;
- denúncia;
- resposta da empresa;
- prevenção de duplicidade;
- média calculada apenas com avaliações publicadas.

### 11.7 Favoritos e compartilhamento

- favorito único por usuário e empresa;
- compartilhamento com Web Share API no mobile;
- copiar link no desktop;
- URL canônica e Open Graph;
- métricas sem armazenar dados pessoais desnecessários.

### 11.8 Visualizações e conversões

Não incrementar visualização no simples render do React.

Prever eventos reais e deduplicados:

```text
profile_view
whatsapp_click
phone_click
email_click
route_click
instagram_click
facebook_click
favorite_add
share_click
quote_request
benefit_view
benefit_redeem
```

Aplicar proteção contra bots, duplicidade e abuso. Agregar métricas quando apropriado.

### 11.9 Orçamentos e leads

O botão de orçamento deve criar lead real, notificar a empresa e mostrar confirmação ao usuário. O lead deve ter estados como novo, visualizado, contatado, convertido, encerrado e spam.

### 11.10 Horário

Armazenar horários de forma estruturada e calcular `Aberto agora` considerando timezone, intervalos, dias fechados e horários especiais.

### 11.11 Mapas

Verificar provedor atual antes de adicionar outro. Suportar:

- endereço normalizado;
- geocodificação;
- coordenadas;
- pin;
- rota;
- carregamento progressivo;
- fallback sem coordenadas;
- busca por proximidade.

## 12. Busca e ranking

A busca convencional deve funcionar antes da IA:

- nome;
- categoria;
- subcategoria;
- descrição;
- serviço;
- cidade e UF;
- proximidade;
- benefícios.

A IA deve apenas interpretar intenção e gerar filtros para buscar registros reais. Nunca deve inventar empresas.

O ranking deve considerar relevância, status publicado, localização, correspondência de categoria, qualidade do perfil e regras comerciais. Ouro não deve aparecer fora da categoria apenas por ser patrocinado. Fundadora não deve dominar permanentemente o ranking por ser reconhecimento histórico.

## 13. Painéis que alimentam as páginas

### 13.1 Painel do anunciante

Permitir gerenciar, conforme permissões e entitlements:

- dados básicos;
- responsável;
- contatos;
- endereço e mapa;
- horário;
- logo e capa;
- galeria;
- serviços;
- benefícios, cupons e campanhas;
- eventos;
- respostas às avaliações;
- leads e orçamentos;
- métricas;
- plano, limites e upgrade;
- situação da verificação;
- preview da página pública.

### 13.2 Tenant Admin

Permitir administrar:

- banners;
- categorias destacadas;
- empresas patrocinadas;
- ordem das seções;
- módulos ativos;
- regras de aprovação;
- conteúdo institucional;
- identidade visual e white label.

## 14. Componentização esperada

Avaliar e criar/refatorar apenas quando fizer sentido na convenção atual:

- `PublicHeader`;
- `AISearchBar`;
- `BannerCarousel`;
- `CategoryGrid`;
- `SponsoredBusinessSection`;
- `BusinessResultCard`;
- `BusinessBadge`;
- `BusinessContactActions`;
- `BusinessHero`;
- `BusinessOwnerCard`;
- `BusinessBenefitCard`;
- `BusinessGallery`;
- `BusinessServices`;
- `BusinessReviews`;
- `BusinessLocationMap`;
- `MasonicLodgeGuide`;
- `EmptyState`;
- `ErrorState`;
- `LoadingSkeleton`.

Não forçar esses nomes se o projeto tiver padrão melhor.

## 15. Responsividade

Validar pelo menos:

- desktop: `1440px`;
- tablet: `768px`;
- mobile: `390px`.

No mobile:

- filtros em Sheet/Drawer;
- cards adaptados sem perder informação;
- contatos prioritários acessíveis;
- mapa sem bloquear rolagem;
- CTAs dentro da viewport;
- nenhum overflow horizontal;
- menu móvel adequado;
- áreas de toque acessíveis.

## 16. Acessibilidade, desempenho e SEO

- HTML semântico;
- teclado e foco visível;
- contraste WCAG AA;
- `aria-label` em ícones;
- texto alternativo;
- `prefers-reduced-motion`;
- `next/image`;
- prevenção de layout shift;
- lazy loading de mapa, vídeo e galeria;
- metadata dinâmica;
- canonical;
- Open Graph;
- dados estruturados `LocalBusiness` quando aplicável.

## 17. Segurança

Validar RLS para garantir:

- leitura pública apenas de empresas publicadas;
- isolamento por tenant;
- anunciante alterando apenas empresas autorizadas;
- avaliações alteradas apenas pelo autor;
- moderação restrita;
- contatos e leads protegidos;
- métricas privadas;
- uploads limitados à empresa;
- documentos de verificação privados;
- consentimento para nome, foto, vínculo e endereço;
- rate limiting em views, avaliações, leads e cupons.

## 18. Ordem de implementação

1. Auditar implementação existente;
2. Produzir matriz de lacunas;
3. Fechar contratos funcionais e entitlements;
4. Propor mudanças de backend realmente necessárias;
5. Validar migrations propostas antes de aplicá-las;
6. Ajustar painel do anunciante e Tenant Admin;
7. Implementar Home;
8. Implementar Guia por categoria;
9. Implementar perfil único com variantes;
10. Integrar dados reais;
11. Implementar loading, vazio e erro;
12. Validar responsividade, acessibilidade, RLS e SEO;
13. Executar lint, typecheck, testes e build;
14. Corrigir erros causados pelas alterações;
15. Comparar visualmente com as referências.

## 19. Critérios de aceite

A entrega somente estará concluída quando:

- não existir página paralela desnecessária;
- não houver dados mockados em produção;
- todas as consultas respeitarem tenant e permissões;
- Ouro, Fundadora e Verificada estiverem separados;
- Bronze, Prata e Ouro forem variantes de uma base reutilizável;
- contatos inexistentes forem omitidos;
- mapas e rotas tiverem fallback;
- cards e filtros funcionarem no mobile;
- estados vazios, loading e erro estiverem implementados;
- lint, typecheck, testes e build passarem;
- as páginas forem comparadas com as referências em desktop e mobile;
- eventuais pendências de backend forem documentadas, sem simulação.

## 20. Relatório final obrigatório

Ao concluir cada fase, apresentar:

- resumo do que foi feito;
- rotas alteradas;
- componentes criados/refatorados;
- tabelas, views, RPCs e buckets utilizados;
- migrations criadas, com justificativa e dependências;
- alterações de RLS;
- entitlements utilizados;
- pendências reais;
- resultado de lint, typecheck, testes e build;
- screenshots desktop e mobile;
- confirmação de ausência de mocks no produto final.

## 21. Comando inicial sugerido para o agente

```text
Leia integralmente o arquivo CONEXAO_MACONICA_PAGINAS_PUBLICAS.md e trate-o como especificação funcional desta tarefa. Comece exclusivamente pela Fase 0 — Auditoria técnica obrigatória. Não implemente, não crie migrations e não modifique o banco nesta primeira etapa. Inspecione o repositório e entregue a matriz de lacunas solicitada, com evidências por arquivo, rota, componente, tabela, RPC, RLS e entitlement. Aguarde a validação da auditoria antes de seguir para mudanças estruturais.
```
