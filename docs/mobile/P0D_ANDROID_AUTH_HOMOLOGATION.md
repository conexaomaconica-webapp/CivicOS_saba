# P0-D — Homologação integrada Android/Auth

Status: implementação local preparada; homologação integrada pendente.

## Entregas locais

- `supabase-auth-adapter.ts`: adapter injetável para login, refresh, sessão e eventos.
- Logout usa escopo `local`, sem revogar sessões de outros dispositivos.
- `secure-session-store.ts`: contrato separado para vault nativo; não utiliza `Preferences` para tokens.
- `mobile-auth.ts` e `mobile-access-guard.ts`: autenticação e autorização permanecem independentes.
- Falha temporária mantém a sessão segura em `indeterminate`, sem liberar recursos protegidos.

## Validação executada

- Typecheck mobile: aprovado.
- Testes unitários de autenticação, guard, adapter e store: 16/16 aprovados.
- Build web/Vite mobile: aprovado.
- `git diff --check`: aprovado.

## Limitações identificadas

- O aparelho Android foi reconhecido pelo ADB (`2311DRK48G`, Android 16).
- O build Android foi concluído com a distribuição 8.11.1 já existente no cache global do usuário; o primeiro download oficial expirou e não foi utilizado.
- APK debug: `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`.
- Application ID: `com.conexaomaconica.app`.
- Tamanho: 9.659.242 bytes.
- SHA-256: `08213CBDD9278E1D7A0A2468B8662C71B2E949BD711563731992A0F44D684F03`.
- Instalação ADB concluída no dispositivo `HMNVGISOVK99ZH6X` com resultado `Success`.
- Aplicativo iniciado via `monkey`; processo `com.conexaomaconica.app` ativo.
- Logs recentes não apresentaram `FATAL EXCEPTION` ou `AndroidRuntime` para o aplicativo.
- Ainda não houve teste em dispositivo físico.
- O adapter foi validado com cliente Supabase injetado/sintético; não foi apontado para produção.
- PKCE, deep links, recuperação de senha e vault Android Keystore ainda precisam de configuração e validação em ambiente isolado.

## Próximo passo

Executar validação visual/manual no aparelho (splash, transição e navegação pública). Depois ligar um cliente Supabase local ou isolado com chave pública, implementar o listener Capacitor de deep links e validar o fluxo. Nenhuma credencial de produção, `service_role`, migration ou alteração remota é necessária para essa etapa.

## Correção da abertura Android

- Causa identificada: tema nativo e transição React usavam `#321511`, divergindo do fundo oficial `#491519`.
- Correção: `launchBackground` e o estado de reprodução React alinhados para `#491519`; nenhuma logo foi regenerada.
- Novo APK instalado com sucesso via ADB no dispositivo `HMNVGISOVK99ZH6X`.
- Novo APK: 9.658.651 bytes.
- SHA-256: `D0D88BD8BA4E9C5C844434D572E0C9E7AC7768B012AF535D73C89EF2B5F20E01`.
- Aplicativo iniciado; processo ativo e sem `FATAL EXCEPTION` nos logs recentes.
- Validação visual final de splash/animação ainda depende da observação direta na tela do aparelho.
