# Mural de Conexões — primeira versão

## Objetivo
Mostrar experiências reais de membros com negócios anunciantes da família maçônica. A primeira versão é uma galeria editorial com envios autenticados e aprovação; depois poderá crescer para um feed social.

## Página inicial
- Seção “Conexões que acontecem” após o bloco de empresas em destaque e antes do convite para anunciar.
- Grade responsiva de seis publicações recentes ou selecionadas, com foto em proporção uniforme, nome da empresa, cidade e texto curto. O nome do autor só aparece quando ele autorizar.
- Clique abre a publicação com foto, relato e link “Conheça esta empresa”. Botão “Ver todas” abre `/conexoes`.
- Visitantes podem ver publicações aprovadas; “Compartilhe sua conexão” leva ao login/cadastro quando necessário. Nenhuma publicação pendente aparece em página pública ou metadados de busca.

## Controle de ativação
- Em `/admin/configuracoes`, criar um controle **“Mural de Conexões”** que somente `master` pode alterar. O estado inicial será desligado até a primeira publicação aprovada e a ativação deliberada.
- `active`: seção na home, galeria, detalhes e envio funcionam normalmente. `paused`: remove imediatamente seção, galeria, detalhe público, links de navegação e botão de envio; novos uploads e criação de posts são recusados no servidor, mesmo por URL ou API direta. Publicações e imagens já enviadas permanecem armazenadas, sem exclusão automática.
- Durante a pausa, autor autenticado pode ver o estado de suas publicações e solicitar exclusão/retirada; admin e master mantêm acesso à fila, histórico e pedidos de retirada. Itens pendentes conservam o status; aprovação fica bloqueada até reativação para evitar publicação acidental.
- Ao reativar, publicações antes aprovadas voltam a ser exibidas, exceto as ocultadas, removidas ou com retirada solicitada. A fila pendente volta a operar normalmente. Mostrar ao master a contagem de aprovadas e pendentes antes da confirmação da reativação.
- Persistir `enabled`, `updated_by`, `updated_at` e motivo opcional em configuração da plataforma, com histórico de mudanças. A checagem deve acontecer no servidor para leitura pública, envio, upload e aprovação. Invalidar cache da home e das rotas públicas ao alternar, para o desligamento ser imediato.
- Um link compartilhado de publicação durante a pausa exibe página neutra “Mural temporariamente indisponível”, sem foto ou relato. Fotos aprovadas não devem ficar acessíveis em URLs públicas permanentes independentes do estado; servir mídia por rota controlada ou URL assinada curta, invalidável na pausa.

## Envio
- Somente contas autenticadas com perfil ativo `member`, `admin` ou `master` podem iniciar envio. Contas empresariais isoladas ou visitantes anônimos não enviam pela primeira versão.
- Em `/minha-conta/conexoes/nova`: selecionar empresa anunciante ativa, anexar 1 foto, escrever relato breve opcional, indicar local/data aproximada opcional e escolher se o nome aparece. Aceitar termos específicos de exibição na plataforma; permissão separada e opcional para Instagram.
- Mostrar prévia, orientação para obter autorização de todas as pessoas identificáveis na foto e botão “Enviar para análise”. Não pedir comprovante ou valor de compra. Limitar tamanho e formato, remover metadados de localização e manter original em armazenamento privado até aprovação.
- Em “Minhas publicações”, mostrar estados e motivo de recusa; permitir excluir ou solicitar retirada. Limite inicial sugerido: 3 envios por dia por conta, sujeito a ajuste.

## Moderação
- Estado: `pending` → `approved`/`rejected`; `approved` → `hidden` ou `removed`. Edição substancial de texto/foto retorna a `pending`.
- `admin` e `master` podem aprovar, rejeitar, ocultar e destacar. Quem enviou não pode aprovar seu próprio envio; requer outro moderador. Se não houver outro moderador disponível, o envio permanece pendente.
- Fila `/admin/conexoes` com filtros, foto, autor, empresa, autorizações, data, duplicidade sinalizada, motivo da decisão e histórico de ações. Registrar moderador e horário de cada decisão.
- Publicação administrativa também entra na fila para revisão por outra conta autorizada. Retirada solicitada pelo participante oculta imediatamente enquanto o pedido é processado.

## Modelo sugerido
- `connection_posts`: id, author_user_id, business_id, caption, image_path_private, image_path_public, display_author_name, platform_permission_at, instagram_permission_at, status, rejection_reason, featured_rank, submitted_at, reviewed_by, reviewed_at, hidden_at.
- `connection_post_audit`: post_id, actor_user_id, action, reason, created_at.
- Restringir leituras públicas a aprovadas; autor lê as próprias; moderadores leem a fila. Validar papel e empresa ativa no servidor e nas políticas do banco. Arquivos pendentes ficam privados; aprovação publica uma variante otimizada sem EXIF.
- Não usar o consentimento para publicação na plataforma como autorização automática para Instagram. Guardar a versão dos termos aceita e oferecer processo de retirada.

## Entrega em etapas
1. Galeria pública, detalhe, formulário, armazenamento privado, fila de aprovação e trilha de auditoria.
2. Página completa de conexões, destaques editoriais e métricas de envio, aprovação e cliques em empresas.
3. Após validar adesão, avaliar comentários, reações, marcações e feed personalizado com regras próprias.

## Critérios de aceite
- Anônimo e conta empresarial isolada não conseguem enviar, mesmo chamando endpoint diretamente.
- Membro, admin e master podem enviar; nenhum deles publica sem aprovação de outra conta moderadora.
- Somente itens aprovados aparecem publicamente; ocultação e retirada removem a exibição imediatamente.
- Toda foto pública leva à empresa anunciante correta; foto pendente não é acessível por URL pública.
- Autorização para Instagram é separada, opcional e registrada.
- Apenas master alterna o recurso. Desligar retira conteúdo da home, galeria, detalhes e mídia pública e impede novo envio sem apagar registros; ligar restaura apenas as aprovadas elegíveis.

## Dependências de implementação
Conferir no repositório os nomes atuais dos papéis, a definição de membro ativo, as tabelas de empresas, o armazenamento de imagens e as políticas RLS antes de criar migration e telas.
