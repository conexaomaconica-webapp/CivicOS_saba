# 26. UI EXTENSION SPEC

Especificação dos pontos de extensão da Interface de Usuário orientada a Plugins.
A interface do CivicOS é montada como um quebra-cabeças dinâmico, onde os plugins declaram Widgets para ocupar determinados Slots.

## 1. Widgets e Slots

A plataforma não encadeia hardcoded a renderização. A tela declara um *Slot* vazio. Plugins declaram seus componentes (*Widgets*) mirados para esses Slots.

Um registro de Widget compreende as seguintes características:
- `slot`: Ex: `"dashboard.main"`
- `priority`: Número usado para ordenação no slot. Widgets com prioridade maior renderizam primeiro (ou no topo).
- `weight`: Usado quando há limites de tamanho ou grid no Slot (peso relativo de espaço).
- `region`: Opcional. Permite refinar onde dentro do Slot o Widget fica (ex: `header`, `body`, `footer`).
- `lazy`: Boolean. Se `true`, a UI instrui o Client a fazer fetch do componente sob demanda (code splitting).
- `cacheable`: Boolean. Se `true`, a resposta SSR pode ser memoizada no frontend para este componente, pois ele não muda com alta latência.
- `visibility`: Regras customizadas adicionais de ocultação por layout/media query.

## 2. Layouts

Layouts são apenas mais um tipo de componente extensível. Não há apenas um layout rígido. Os plugins também fornecem templates estruturais: `AdminLayout`, `LandingLayout`. Eles podem ser solicitados pelas rotas.

## 3. Override & Prioridade

Se dois plugins fornecerem layouts com o mesmo ID, ou dois plugins fornecerem o mesmo Widget para um Slot de limite único, o sistema de licenciamento (Capabilities) e o Plugin Runtime resolvendo prioridade de versão definirá quem sobrepõe (Override).
