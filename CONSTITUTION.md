# CivicOS Constitution

Este documento é a fundação da plataforma CivicOS. Ele estabelece as regras arquiteturais invioláveis que garantem que o sistema continue seguro, modular e evolutivo à medida que novos plugins e ecossistemas são construídos sobre ele.

## Artigo 1: Isolamento do Kernel
**Plugins não conhecem Runtime.**
O Kernel deve ser completamente invisível para os Plugins. Nenhuma lógica, componente ou entidade dentro do diretório `plugins/` deve importar arquivos diretamente do `@saas/core` (especialmente de pacotes internos).
* **Permitido:** `Plugin -> SDK`
* **Permitido:** `SDK -> Kernel Runtime`
* **Proibido:** `Plugin -> Kernel interno`

## Artigo 2: Agnosticismo de Infraestrutura
**Domínio não conhece Infraestrutura.**
As regras de negócio (core domain) não podem ter conhecimento sobre como os dados são armazenados, sobre o provedor de nuvem ou sobre mecanismos de transporte específicos.
* A infraestrutura só pode ser conectada por meio de **Ports** ou **Adapters** explicitamente definidos pelas interfaces de domínio.

## Artigo 3: Comunicação por Capacidades
**Toda capacidade deve ser exposta através do SDK.**
Se um Plugin precisa interagir com outro Plugin ou usar recursos do sistema (como envio de notificações, cobrança ou consulta de identidade), ele não pode fazer chamadas diretas ou importar o outro plugin. Tudo deve ser intermediado pelos Contratos do SDK, utilizando o EventBus e requisições de `Capabilities`.

## Artigo 4: Governança Contínua
**Toda mudança estrutural exige teste de fronteira.**
Qualquer nova camada adicionada ou mudança na forma como as peças se conectam exige a atualização dos testes arquiteturais permanentes que protegem estas diretrizes. Nenhuma quebra constitucional pode chegar à branch `main`.
