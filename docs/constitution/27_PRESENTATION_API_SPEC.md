# 27. PRESENTATION API SPEC

Este documento responde à pergunta: **Como qualquer consumidor obtém uma representação visual da plataforma?**
Ele garante que a plataforma fique dissociada do framework React ou App Router.

## O Contrato Agnostico (PresentationSnapshot)

Nenhuma tecnologia cliente interage com os registros internos. O Kernel fornecerá uma API agnóstica em forma de função:
`kernel.resolvePresentation(context: PresentationContext): PresentationSnapshot`

O Snapshot retornado conterá um dump JSON completo e higienizado:
```json
{
  "version": "1.0",
  "generatedAt": "2026-07-16T12:00:00Z",
  "tenantId": "t-123",
  "locale": "pt-BR",
  "routes": [...],
  "navigation": [...],
  "widgets": [...],
  "slots": [...],
  "layouts": [...],
  "diagnostics": [...]
}
```

## O Contexto de Resolução (PresentationContext)

O client é responsável por requisitar a UI enviando QUEM é, e ONDE está.
O objeto `PresentationContext` exige:
- `tenantId`
- `userId` (opcional, para visões não-autenticadas)
- `locale`
- `capabilities` e `permissions` já resolvidos e validados pela camada de autorização/licenciamento.

## Fluxo da Sessão

1. A Sessão bate no Endpoint do Next.js.
2. O Endpoint autentica via middleware.
3. Solicita `PresentationResolver.resolve(context)` passando os dados validados.
4. O objeto imutável Snapshot desce para o lado do Frontend e as páginas Client-Side recebem apenas `SnapshotContext`.
5. Nenhum acesso adicional de UI requer tocar no Kernel.
