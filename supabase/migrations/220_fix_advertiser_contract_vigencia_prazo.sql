-- Migration 220: Ajuste da vigência dinâmica no template de contrato do anunciante
-- CivicOS SABA / Conexão Maçônica
-- Atualiza a Cláusula 3 (item 3.1) para utilizar {{prazo_vigencia}} (resolvendo 1 ano para planos anuais
-- e 2 anos / dois anos correntes para Plano Acácia c/ Pedra Fundamental ou bienal), e corrige o item 2.4.

UPDATE public.contract_versions
SET content_markdown = REPLACE(
  REPLACE(
    content_markdown,
    '3.1. O presente contrato terá início em {{data_emissao}} e vigorará durante o período de um ano corrente da contratação, salvo se as partes ajustarem prazo menor ou houver rescisão antecipada nos termos deste instrumento.',
    '3.1. O presente contrato terá início em {{data_emissao}} e vigorará durante o período de {{prazo_vigencia}} da contratação, salvo se as partes ajustarem prazo menor ou houver rescisão antecipada nos termos deste instrumento.'
  ),
  '2.4. Para este contrato, fica ajustado o valor total de R$ {{valor_total}}, correspondente ao período de {{vigencia}} , salvo renovação ou alteração formal por escrito.',
  '2.4. Para este contrato, fica ajustado o valor total de {{valor_total}}, correspondente ao período de {{vigencia}}, salvo renovação ou alteração formal por escrito.'
)
WHERE content_markdown LIKE '%3.1. O presente contrato terá início em {{data_emissao}} e vigorará durante o período de um ano corrente%';

