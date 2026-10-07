# Categorias do guia — normalização para SEO

Levantamento de 2026-10-08 (banco oficial, somente leitura). Decisão de negócio pendente: ver "O que preciso que você decida".

## Como o código trata hoje (já implementado na Sprint 4)

- A URL de categoria é `/guia/{estado}/{cidade}/{categoria}`, e o `{categoria}` vem de **um único lugar**: `categorySlug()` em
  `lib/seo/geo-slugs.ts`. Ele remove acentos, ignora maiúsculas e aplica uma lista curta de **apelidos sem dúvida**
  (hoje: `ótica`/`óticas` => `optica`).
- Empresas cadastradas como "Ótica" e "Óptica" caem na **mesma página** (teste automatizado cobre isso).
- Das 49 categorias da tabela `categories`, **nenhuma colide** depois de normalizar acento e caixa. O risco real não é
  grafia, é **significado parecido** (abaixo): cada nome gera uma página própria, e páginas quase iguais competem entre si.
- Uma página de cidade + categoria só é indexada com 2 ou mais empresas (regra da Sprint 1/2). Hoje cada categoria em uso
  tem 1 empresa, então todas ficam `noindex` até haver volume. Por isso, **mesclar categorias antes de crescer é barato**;
  depois que houver centenas de empresas e URLs indexadas, mesclar exige redirect 301.

## Categorias em uso hoje

| Categoria | Origem | Empresas |
|---|---|---|
| Óptica | criada na aprovação da empresa (texto livre) | 1 |
| Psicólogo | criada na aprovação da empresa | 1 |
| Segurança e terceirização | criada na aprovação da empresa | 1 |
| Alimentos e Bebidas | lista inicial | 1 (rascunho) |

## Grupos de significado parecido na lista inicial

Cada linha é um grupo que talvez devesse ser **uma só categoria** (ou uma categoria com subitens):

| Tema | Nomes hoje |
|---|---|
| Saúde | Saude · Saúde e Bem-estar · Medicina e Saude · Odontologia · Psicologia e Terapias · Psicólogo · Nutricao e Qualidade de Vida |
| Segurança | Seguranca · Seguranca e Monitoramento · Segurança e terceirização |
| Negócios e consultoria | Negocios · Negocios e Empreendedorismo · Consultoria · Consultoria Empresarial |
| Construção e imóveis | Construcao Civil · Construcao e Imoveis · Imóveis e Construção · Imobiliarias e Corretores |
| Jurídico | Juridico · Advocacia e Servicos Juridicos |
| Tecnologia | Tecnologia · Tecnologia da Informacao |
| Alimentação | Alimentacao · Alimentos e Bebidas |
| Automotivo | Automotivo · Automoveis e Oficinas |
| Eventos | Eventos e Cultura · Eventos e Entretenimento |
| Turismo | Turismo e Viagens · Hotelaria e Turismo |
| Serviços gerais | Serviços · Servicos Residenciais · Servicos Tecnicos · Outros Profissionais e Servicos · Profissionais |

Problemas de qualidade do nome (aparecem em títulos e páginas): a lista inicial está **sem acento** (`Seguranca`, `Medicina e
Saude`, `Educacao e Treinamentos`), enquanto as categorias criadas pela aprovação têm acento (`Óptica`, `Psicólogo`). O nome
da categoria aparece no título e no texto da página, então vale corrigir.

## O que preciso que você decida

1. **Lista final de categorias.** Sugestão: uma categoria "principal" por tema da tabela acima (por exemplo "Saúde", "Segurança",
   "Jurídico"), mantendo as específicas (Óptica, Psicólogo, Odontologia) como subitens ou como categorias próprias quando
   houver empresas suficientes (3 ou mais em uma cidade).
2. **Corrigir os acentos** dos nomes da lista inicial.
3. **Como tratar as criadas na aprovação:** hoje o admin digita o nome livremente. Recomendo, na Sprint 7, a tela de aprovação
   sugerir as categorias existentes antes de criar uma nova (evita "Ótica" x "Óptica", "Psicólogo" x "Psicóloga").

Quando você decidir, a mudança é feita assim: (a) migration que renomeia/mescla as categorias e atualiza os vínculos
`business_categories`; (b) apelidos novos em `CATEGORY_SLUG_ALIASES` para os nomes antigos apontarem para a página nova;
(c) redirect 301 das URLs antigas, se alguma já estiver indexada. Nada disso foi feito: **nenhum dado de categoria foi alterado**.
