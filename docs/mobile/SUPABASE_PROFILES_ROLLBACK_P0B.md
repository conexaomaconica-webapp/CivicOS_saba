# Recuperação e Rollback — Remediação de `public.profiles` (P0-B)

## Princípio

Rollback funcional não significa restaurar a exposição global. Nunca reativar automaticamente policy `USING (true)` nem grants amplos em `profiles`.

## Antes da homologação

- exportar policies, grants, relações, views e metadados de funções;
- registrar versão do draft e Project Ref;
- confirmar fixtures e contas de teste;
- validar que os consumidores Web já possuem caminho alternativo;
- definir janela, responsável e critério de abortar.

## Recuperação funcional

Se um consumidor falhar, desabilitar a feature flag/rota nova, retornar ao endpoint seguro anterior ou reverter apenas o incremento de aplicação. Manter a policy restrita enquanto o consumidor é corrigido.

## Reversão de banco

Somente executar uma migration reversa aprovada, com escopo exato e comparação pós-mudança. A reversão pode restaurar uma policy restrita equivalente, nunca a antiga leitura global. Se não houver configuração segura conhecida, interromper a janela e corrigir o consumidor em vez de ampliar acesso.

## Pós-reversão

Reexecutar a matriz de testes, exportar o catálogo novamente, verificar ausência de exposição cruzada e registrar o resultado. Nenhum rollback libera a implementação mobile automaticamente.

