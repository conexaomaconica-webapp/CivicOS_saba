# 03 — Arquitetura de Marketplace e Perfil de Negócio

**Módulo:** Product Review  
**Escopo:** Decoupling de perfil, catálogo multi-ecossistema e estrutura de marketplace  

---

## 1. Arquitetura de Marketplace Desacoplada

Para garantir que a Fundação CivicOS possa expandir no futuro para múltiplos ecossistemas (Rotary, Lions, CREA, OAB, Associações Comerciais) sem refatorar o núcleo de mercado, a arquitetura de perfil é fatiada em três camadas progressivas:

```text
Foundation Directory
   └── Business (Cadastro Neutro de Mercado: Nome, CNPJ, Categoria, Endereço, Contato)
          │
          └── Marketplace Profile (Camada Comercial: Fotos, Bio, Cupons, Redes Sociais, Atendimento)
                 │
                 └── Masonic Extension (Plugin Específico: Vínculo, Loja, Oriente, Declarações)
```

---

## 2. Abstração para Múltiplos Ecossistemas

Embora o MVP 1.0 seja dedicado à comunidade Conexão Maçônica (`MasonicExtension`), o schema do marketplace foi desenhado para acoplar novos plugins de domínio sem alterar a tabela `businesses`:

### 2.1 Mapeamento de Domínio por Plugin

| Ecossistema Alvo | Plugin Extension | Atributos Específicos do Domínio |
|---|---|---|
| **Conexão Maçônica** | `conexao-maconica` | Vínculo de Irmão/Família, Loja, Potência, Oriente, Regularidade. |
| **Rotary Club** | `rotary-directory` | Clube de Afiliação, Distrito, Classificação Profissional, Comendas. |
| **Lions Club** | `lions-directory` | Distrito Leão, Clube, Cargo de Liderança, Projetos Sociais. |
| **Conselho Profissional (CREA/OAB)** | `professional-council` | Registro Profissional (CREA/OAB), Especialidade, Situação Regular. |

---

## 3. Gestão de Perfis e RLS Multi-Tenant

1. **Catálogo Unificado de Categorias**: Categorias operam no escopo do tenant com sincronização global configurável.
2. **Localização e Filtros**: Suporte a geolocalização por raio dinâmico (latitude/longitude) e filtros por palavras-chave com fallback gracioso.
3. **Isolamento de Segurança**: A RLS do banco de dados garante que anunciantes de um tenant não consigam modificar dados ou visualizar leads de concorrentes ou de outros tenants.
