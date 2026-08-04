# Domain Rules — Conexão Maçônica

**Produto:** Conexão Maçônica  
**Camada:** Product Vertical Domain (`docs/products/conexao-maconica/domain/`)  
**Status:** Congelado  

---

## 1. Terminologia e Entidades Específicas do Domínio Maçônico

Diferente do **Community Framework** (que opera com termos agnósticos como Organização, Unidade, Membro e Parceiro), a camada de domínio do produto **Conexão Maçônica** encarrega-se do mapeamento específico das entidades fraternas:

| Entidade do Domínio | Conceito Maçônico Correspondente | Mapeamento no Schema / Plugin |
|---|---|---|
| **Organização Raiz** | Potência / Grande Loja / Grande Oriente | `public.organizations (type = 'grand_lodge')` |
| **Unidade Institucional** | Loja Maçônica Aug.·. e Resp.·. | `public.organizations (type = 'sub_lodge')` |
| **Membro Fraterno** | Irmão Obreiro Regular | `public.organization_people (role = 'brother')` |
| **Oriente / Região** | Oriente / Cidade Maçônica | `public.organization_units (orient_city)` |

---

## 2. Selos e Distinções Maçônicas Específicas

1. **Empresa de Irmão Proprietário/Sócio**: Vinculação societária direta com membro verificado (`link_type = 'owner'` ou `'equity_partner'`).
2. **Empresa da Família Maçônica**: Vinculação familiar direta com cunhada, sobrinho(a) ou dependente (`link_type = 'family_owner'`).
3. **Representada por Irmão**: Empresa com executivo, diretor ou representante legal irmão (`link_type = 'executive'` ou `'sales_representative'`).
4. **Parceiro Institucional Conveniado**: Empresa conveniada com Loja para concessão de descontos fraternos (`link_type = 'institutional_partner'`).
5. **Empresa Fundadora**: Selo de apoio inicial concedido às empresas pioneiras da região (`FounderBadge`).

---

## 3. Concorrência Ética e Fraternidade no Guia

- **Ajuda Mútua e Apoio Comercial**: Estimular a prosperidade e a preferência fraterna nas contratações do dia a dia.
- **Fair Play Comercial**: Proibição estrita de concorrência desleal, difamação ou denúncias de má-fé contra empresas de irmãos.
- **Mediação Fraterna**: Em caso de contestações comerciais ou operacionais, o processo formal de contestação envolve mediação fraterna dos moderadores do tenant antes de qualquer sanção administrativa.
