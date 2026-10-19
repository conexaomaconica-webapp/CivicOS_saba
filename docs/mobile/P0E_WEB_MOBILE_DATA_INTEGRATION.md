# P0-E — Integração de dados Web–Mobile

## Primeiro incremento

O aplicativo mobile não cria um banco nem uma cópia das regras do Guia. A Home agora possui um cliente de dados que consome `VITE_MOBILE_GUIDE_API_URL`, enquanto o BFF Web consulta `directory_home_settings` e `public_directory_home_data` usando o mesmo tenant canônico e as mesmas RPCs da rota `/guia`.

O BFF não aceita `tenant_id` do dispositivo. Em produção, `MOBILE_CANONICAL_HOST` é obrigatório; em desenvolvimento local, `localhost:3000` é permitido explicitamente. A ausência da configuração em produção falha fechado.

As configurações do Admin (`hero_*`, ordem/visibilidade de `sections_config` e cidades disponíveis) são retornadas sem cache. Uma nova consulta no app reflete uma alteração publicada sem recompilar o APK.

## Estado

- Implementação local: concluída para configuração da Home.
- Banco remoto: não acessado nem alterado.
- Empresas, categorias, benefícios e destaques: contrato preparado no payload, consumidores visuais ainda serão incrementados após o smoke test Web–Mobile.
- Teste de alteração Admin → Home em ambiente isolado: pendente de executar com o BFF configurado.

## Validações

- Teste do cliente mobile: configuração publicada, ordem e visibilidade preservadas.
- Teste de falha: resposta 503 não é convertida em dados fictícios.
- Typecheck e suíte mobile devem ser executados antes da homologação integrada.

