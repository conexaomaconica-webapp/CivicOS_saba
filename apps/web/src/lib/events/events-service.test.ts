import { describe, expect, it } from 'vitest';
import {
  classifyEventCategory,
  formatEventCardDate,
  extractPriceInfo,
  EVENT_CATEGORIES,
} from './events-service';

describe('events-service helpers', () => {
  it('classifica corretamente eventos de Lojas Maçônicas', () => {
    const cat = classifyEventCategory('Sessão Magna de Iniciação', 'Sessão Magna', 'Templo Nobre', 'lodge');
    expect(cat.id).toBe('lojas');
    expect(cat.label).toBe(EVENT_CATEGORIES.lojas.label);
  });

  it('classifica corretamente eventos de Ações Sociais e Filantropia', () => {
    const cat = classifyEventCategory('Campanha do Agasalho e Arrecadação', 'Ação Social', 'Fraternidade Feminina');
    expect(cat.id).toBe('sociais');
    expect(cat.icon).toBe('🤝');
  });

  it('classifica corretamente Palestras, Cursos e Workshops', () => {
    const cat = classifyEventCategory('Workshop de Liderança e Gestão Estratégica', 'Palestra', 'Auditório');
    expect(cat.id).toBe('palestras');
    expect(cat.icon).toBe('🎓');
  });

  it('classifica corretamente Empresas Parceiras e Networking', () => {
    const cat = classifyEventCategory('Rodada de Negócios B2B e Networking', null, null, 'business');
    expect(cat.id).toBe('empresas');
    expect(cat.icon).toBe('🏢');
  });

  it('classifica corretamente Festividades, Shows e Confraternizações', () => {
    const cat = classifyEventCategory('Confraternização Fraterna e Show de Música Ao Vivo', 'Festa', 'Clube de Campo');
    expect(cat.id).toBe('festividades');
    expect(cat.icon).toBe('🎉');
  });

  it('garante que badge de Festividade / Show prevalece sobre local de Loja Maçônica', () => {
    // Caso relatado pelo usuário: evento de show ou feijoada em espaço da loja
    const catComBadge = classifyEventCategory('Feijoada da 16', 'Festividade / Show', 'Loja Maçônica 16 de Junho');
    expect(catComBadge.id).toBe('festividades');
    expect(catComBadge.icon).toBe('🎉');

    const catMicaraco = classifyEventCategory('3º MicarAço 2026', 'Festividade / Show', 'Templo Maçônico');
    expect(catMicaraco.id).toBe('festividades');
  });

  it('garante que badge de Sessão Maçônica classifica corretamente em Lojas', () => {
    const cat = classifyEventCategory('Aniversário comemorativo', 'Sessão Maçônica', 'Auditório Central');
    expect(cat.id).toBe('lojas');
    expect(cat.icon).toBe('🏛️');
  });

  it('formata datas de card de evento no formato exato da imagem de referência', () => {
    // 2026-11-06 (Sexta-feira) às 21:00
    const formatted = formatEventCardDate('2026-11-06', '21:00');
    expect(formatted).toBe('Sexta, 06 de Nov às 21:00');

    // 2026-11-07 (Sábado) às 14:00
    const formattedSat = formatEventCardDate('2026-11-07', '14:00');
    expect(formattedSat).toBe('Sábado, 07 de Nov às 14:00');
  });

  it('extrai corretamente informações de valor monetário e gratuidade', () => {
    expect(extractPriceInfo('Entrada R$ 50,00')).toBe('R$ 50,00');
    expect(extractPriceInfo('Ingresso solidário: R$ 35,00')).toBe('R$ 35,00');
    expect(extractPriceInfo('Evento Gratuito e Aberto')).toBe('Entrada Franca');
    expect(extractPriceInfo(null, null, null, 'lodge')).toBe('Livre Participação');
  });
});
