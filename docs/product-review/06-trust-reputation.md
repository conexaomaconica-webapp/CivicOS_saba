# 06 — Sistema de Reputação, Trust Score e Badges

**Módulo:** Product Review  
**Escopo:** Avaliação fraterna, pontuação de confiança (0-100) e arquitetura de selos  

---

## 1. Métrica Dupla de Confiança: Rating + Trust Score

A reputação de um anunciante na plataforma é mensurada por dois indicadores complementares:

```text
★ Rating Comercial (0.0 a 5.0)  |  🛡 Trust Score Institutional (0 a 100)
```

### 1.1 Rating Comercial (0.0 a 5.0)
- Média aritmética das avaliações deixadas por clientes que utilizaram serviços ou cupons da empresa.
- Exige autenticação e verificação de atendimento para evitar avaliações fakes ou ataques maliciosos de concorrentes.

### 1.2 Trust Score Institucional (0 a 100)
Métrica algorítmica calculada automaticamente pelo sistema com base em critérios objetivos:
- **Verificação Institucional Válida**: +30 pontos.
- **Autorização Empresarial Auditada**: +20 pontos.
- **Tempo de Permanência Ativa na Plataforma**: +15 pontos.
- **Taxa e Tempo de Resposta a Leads**: +15 pontos.
- **Completude do Perfil Cadastral**: +10 pontos.
- **Ausência de Contestações ou Denúncias Procedentes**: +10 pontos.

---

## 2. Arquitetura Dimensional de Badges (Selos)

Para eliminar a ambiguidade de selos únicos, a interface exibe até 4 dimensões visuais independentes no perfil da empresa:

```text
┌────────────────────────────────────────────────────────────────────────┐
│ 🏛 Empresa de Irmão  │  ✔ Verificada  │  ⭐ Fundadora  │  🥇 Plano Ouro │
└────────────────────────────────────────────────────────────────────────┘
```

1. **Badge de Domínio / Afiliação (`🏛 Empresa de Irmão`)**: Indica a categoria de afiliação ou representação (`owner`, `family`, `executive`).
2. **Badge de Verificação (`✔ Verificada`)**: Indica que as credenciais e evidências foram auditadas e aprovadas pela moderação (`status = active`).
3. **Badge de Reconhecimento Histórico (`⭐ Fundadora`)**: Marcação indelével de apoio inicial ao tenant (`FounderBadge`).
4. **Badge de Tier Comercial (`🥇 Plano Ouro`)**: Identificação visual do nível de recursos do anúncio.
