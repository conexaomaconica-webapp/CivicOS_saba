# 07 — Governança de Vínculo, Mediação e Concorrência Ética

**Módulo:** Product Review  
**Escopo:** Regras de domínio maçônico, segregação institucional, mediação e contestação  

---

## 1. Princípios de Governança Institucional

O produto Conexão Maçônica é uma extensão de negócio sobre a plataforma CivicOS que opera em estrito alinhamento com a ética e os usos da ordem maçônica.

### 1.1 Segregação entre TI e Autoridade Institucional
- A comprovação de vínculo maçônico (`organization_people` / `business_masonic_links`) atesta a relação de domínio e afiliação fraternal do membro.
- O vínculo maçônico **NÃO concede** privilégios de administração de TI no tenant (`tenant_admin` ou `master`), que permanecem sob governança técnica independente.

---

## 2. Processo Formal de Contestação e Mediação (`masonic_link_contests`)

Para proteger empresas legítimas contra ataques maliciosos ou tentativas anticoncorrenciais de desativação de anúncios:

```text
[Abertura de Contestação] ──> [Notificação do Anunciante] ──> [Prazo de Defesa: 7 dias] 
                                                                    │
[Decisão Final] <── [Revisão do Moderador do Tenant] <──────────────┘
```

- **Proteção Cautelar**: A abertura de contestação **não suspende automaticamente** o vínculo ou a exibição da empresa.
- **Medida Cautelar de Exceção**: A suspensão prévia à análise só é permitida em casos de fraude evidente ou falsidade documental comprovada, mediante ato fundamentado do administrador do tenant.
- **Rate-Limit e Sanção para Abuso**: Usuários que abrirem contestações infundadas reiteradas sofrerão restrição da permissão `masonic_link:contest` e denúncia ao comitê de ética do tenant.
