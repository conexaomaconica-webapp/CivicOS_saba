# 25. PRESENTATION PLATFORM SPEC

O *Presentation Platform* (AC-7) é o limite arquitetural (Edge) entre a lógica de negócio do SaaS Operating System e a camada de interface (ex: Next.js).

## Princípio Fundamental: Isolamento do React

Nenhum componente da Interface de Usuário (React, Mobile, CLI) acessará dinamicamente os registros internos da plataforma.

A interface deverá consumir **apenas** o `PresentationSnapshot` (uma fotografia imutável, congelada e resolvida).

## O Presentation Resolver

A orquestração e filtragem do conteúdo a ser apresentado são de responsabilidade do `PresentationResolver`. Ele atua recebendo um `PresentationContext` (que contém informações do Tenant, Usuário logado, Permissões e Licenciamento/Capabilities resolvidas) e cruzando essas informações com os registros de UI brutos (RouteRegistry, WidgetRegistry, etc.).

O resultado será um snapshot contendo exclusivamente aquilo que a Sessão do momento possui permissão e capability para enxergar.

Se uma rota exige a capability `business-directory` e o Tenant não tem essa capability, a rota será sumariamente omitida do Snapshot. Não é um erro, é a ocultação da UI em tempo real baseada no plano comercial.

## Resiliência de Boot (Navigation Graph)

O Boot será validado pelo `NavigationGraph`.
1. **Erros Estruturais:** (Ex: Ciclos de menus, Widgets vinculados a slots que não existem, conflitos de rotas) causarão `BOOT ABORT`. O Kernel não subirá corrompido.
2. **Erros Referenciais:** (Ex: O menu "Relatórios" aponta para uma rota `/relatorios` que não foi registrada por nenhum Plugin Ativo). Não abortam o boot. A plataforma entra em estado de saúde `DEGRADED`, o item problemático é removido da árvore (Dropped), e o `DiagnosticsEngine` recebe um `WARNING` instruindo a correção.
