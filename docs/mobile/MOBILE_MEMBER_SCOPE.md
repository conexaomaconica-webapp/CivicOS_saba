# Escopo funcional mobile — experiência de membro

Status: adendo normativo ao P0-A/P0-B.

Android e iOS são exclusivamente uma experiência de membro. Usuários `member`, `admin`, `master` e responsáveis por empresas usam a mesma navegação, desde que autenticados e autorizados no tenant canônico Conexão Maçônica.

## Incluído no mobile

- descoberta de empresas e categorias;
- benefícios publicados;
- favoritos, indicações e conexões do membro;
- Mural de Conexões;
- gerenciamento do próprio perfil;
- referência opcional à empresa vinculada e ao seu perfil público publicado, quando o vínculo estiver validado.

## Exclusivo da Web

Cadastro e edição de empresas, dados comerciais, fotos, planos, contratos, assinatura, pagamentos, renovações, dashboards, confirmações como empresa e administração.

O mobile não terá portal de anunciante, painel de empresa, menu administrativo, DTOs comerciais ou endpoints de gestão. Nenhuma role administrativa desbloqueia essas áreas no aplicativo. Papéis e vínculos continuam sendo validados no backend para as operações pertinentes, especialmente na Web.

Este adendo não autoriza login mobile, migrations, grants, policies, Auth, deploy ou alterações remotas.
