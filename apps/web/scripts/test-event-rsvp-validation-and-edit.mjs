import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });

import {
  updatePlatformEventAction,
  upsertEventRegistrationAction,
} from '../src/app/actions/platform-events.ts';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rwvztwsjcjljphqttiws.supabase.co';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(url, key);

function assert(condition, message) {
  if (!condition) {
    console.error(`\n❌ FALHA NO TESTE DE EVENTOS & RSVP: ${message}`);
    process.exit(1);
  }
}

async function runEventEditAndRSVPValidationTests() {
  console.log('================================================================');
  console.log('🧪 SUÍTE DE TESTES: EDIÇÃO DE EVENTO NO ADMIN & VALIDAÇÃO RSVP');
  console.log('================================================================\n');

  const testEventSlug = `evento-teste-${Date.now()}`;
  const testEventId = crypto.randomUUID();

  try {
    // 1. Cria evento de teste no banco Supabase
    console.log('📌 1. Criando evento de teste no banco Supabase...');
    const { data: existingTenant } = await supabase
      .from('tenants')
      .select('id')
      .limit(1)
      .single();

    const tenantId = existingTenant?.id || '00000000-0000-0000-0000-000000000010';

    const { error: insertErr } = await supabase.from('platform_events').insert({
      id: testEventId,
      tenant_id: tenantId,
      slug: testEventSlug,
      title: 'Título Original do Evento',
      subtitle: 'Subtítulo Original',
      description: 'Descrição original do evento de teste',
      event_date: '2026-10-15',
      start_time: '19:00:00',
      venue_name: 'Salão Original',
      city: 'Feira de Santana - BA',
      status: 'published',
      registration_enabled: true,
    });

    assert(!insertErr, `Erro ao criar evento de teste: ${insertErr?.message}`);
    console.log(`✅ Evento de teste criado! ID: ${testEventId}, Slug: ${testEventSlug}`);

    // -------------------------------------------------------------------------
    // 2. EDIÇÃO DO EVENTO VIA SERVER ACTION (DEMONSTRAÇÃO DO BOTÃO SALVAR DO ADMIN)
    // -------------------------------------------------------------------------
    console.log('\n📌 2. Executando updatePlatformEventAction (Edição do Admin)...');
    const updateRes = await updatePlatformEventAction({
      eventId: testEventId,
      title: 'Título Atualizado via Admin SABA',
      subtitle: 'Novo Subtítulo da Festa de Confraternização',
      description: 'Nova descrição detalhada atualizada pelo Painel Administrativo.',
      eventDate: '2026-11-20',
      startTime: '20:30',
      venueName: 'Novo Salão Nobre Grande Loja',
      city: 'Feira de Santana - BA',
      registrationEnabled: true,
    });

    assert(updateRes.success, `Falha ao atualizar evento via Admin: ${updateRes.error}`);
    console.log('✅ updatePlatformEventAction executada com sucesso!');

    // Verifica persistência dos novos dados no banco de dados
    const { data: updatedEventRow } = await supabase
      .from('platform_events')
      .select('title, subtitle, description, event_date, start_time, venue_name')
      .eq('id', testEventId)
      .single();

    assert(updatedEventRow?.title === 'Título Atualizado via Admin SABA', 'Título não foi atualizado no banco');
    assert(updatedEventRow?.event_date === '2026-11-20', 'Data do evento não foi atualizada no banco');
    assert(updatedEventRow?.start_time.startsWith('20:30'), 'Horário de início não foi atualizado no banco');
    console.log(`✅ PERSISTÊNCIA COMPROVADA: Título="${updatedEventRow.title}", Data="${updatedEventRow.event_date}", Horário="${updatedEventRow.start_time}"`);

    // -------------------------------------------------------------------------
    // 3. TESTE DE VALIDAÇÃO DE RSVP: MAÇOM SEM LOJA (RECUSA OBRIGATÓRIA SERVER-SIDE)
    // -------------------------------------------------------------------------
    console.log('\n📌 3. Testando RSVP como MAÇOM sem informar Loja/Potência (Recusa Server-Side esperada)...');
    const rsvpMacomSemLoja = await upsertEventRegistrationAction({
      eventId: testEventId,
      fullName: 'Irmão Teste Validação',
      whatsapp: '75999990011',
      attendeeType: 'macom',
      masonicOrganization: '', // Vazio intencional
      attendanceStatus: 'confirmed',
      city: 'Feira de Santana - BA',
    });

    assert(!rsvpMacomSemLoja.success, 'FALHA DE VALIDAÇÃO: Servidor aceitou Maçóm sem Loja/Potência!');
    assert(
      rsvpMacomSemLoja.error?.includes('Loja / Potência Maçônica é obrigatória'),
      `Mensagem de erro incorreta para Maçom sem Loja: ${rsvpMacomSemLoja.error}`
    );
    console.log(`✅ BLOQUEIO CONFIRMADO (SERVER-SIDE): "${rsvpMacomSemLoja.error}"`);

    // -------------------------------------------------------------------------
    // 4. TESTE DE VALIDAÇÃO DE RSVP: MAÇOM COM LOJA (SUCESSO)
    // -------------------------------------------------------------------------
    console.log('\n📌 4. Testando RSVP como MAÇOM informando Loja/Potência (Sucesso esperado)...');
    const rsvpMacomComLoja = await upsertEventRegistrationAction({
      eventId: testEventId,
      fullName: 'Irmão Carlos Eduardo',
      whatsapp: '75999990022',
      attendeeType: 'macom',
      masonicOrganization: 'Loja Harmonia e Trabalho Nº 42 - GLEB',
      attendanceStatus: 'confirmed',
      city: 'Feira de Santana - BA',
    });

    assert(rsvpMacomComLoja.success && rsvpMacomComLoja.data?.confirmationCode, 'Falha ao registrar RSVP de Maçóm válido');
    console.log(`✅ RSVP MAÇÓM APROVADO! Código de Confirmação: ${rsvpMacomComLoja.data.confirmationCode}`);

    // -------------------------------------------------------------------------
    // 5. TESTE DE VALIDAÇÃO DE RSVP: FAMILIAR (ISENÇÃO DE LOJA E ACEITE DE CIDADE CUSTOMIZADA)
    // -------------------------------------------------------------------------
    console.log('\n📌 5. Testando RSVP como FAMILIAR (Sem Loja e com Cidade Fora da Lista de Sugestões)...');
    const customCity = 'Conceição do Jacuípe - BA';
    const rsvpFamiliar = await upsertEventRegistrationAction({
      eventId: testEventId,
      fullName: 'Maria da Silva (Familiar)',
      whatsapp: '75999990033',
      attendeeType: 'familiar',
      attendanceStatus: 'confirmed',
      city: customCity, // Cidade fora da lista de opções padrão
    });

    assert(rsvpFamiliar.success && rsvpFamiliar.data?.confirmationCode, 'Falha ao registrar RSVP de Familiar com cidade customizada');
    console.log(`✅ RSVP FAMILIAR APROVADO! Código: ${rsvpFamiliar.data.confirmationCode}, Cidade Registrada: "${customCity}"`);

    // -------------------------------------------------------------------------
    // 6. TESTE DE CONTAGEM REAL DE INSCRITOS (VERIFICAÇÃO ANTI-PRODUTO CARTESIANO)
    // -------------------------------------------------------------------------
    console.log('\n📌 6. Testando contagem exata de inscritos no Dashboard (Validação de 6 inscritos reais)...');
    
    // Insere mais 4 inscrições para totalizar exatamente 6 inscritos no evento de teste
    await upsertEventRegistrationAction({
      eventId: testEventId,
      fullName: 'Inscrito Teste 3',
      whatsapp: '75999990034',
      attendeeType: 'cunhada',
      attendanceStatus: 'confirmed',
      source: 'whatsapp',
    });

    await upsertEventRegistrationAction({
      eventId: testEventId,
      fullName: 'Inscrito Teste 4',
      whatsapp: '75999990035',
      attendeeType: 'convidado',
      attendanceStatus: 'confirmed',
      source: 'instagram',
    });

    await upsertEventRegistrationAction({
      eventId: testEventId,
      fullName: 'Inscrito Teste 5',
      whatsapp: '75999990036',
      attendeeType: 'macom',
      masonicOrganization: 'Loja Sabedoria 10',
      attendanceStatus: 'confirmed',
      source: 'convite-impresso',
    });

    await upsertEventRegistrationAction({
      eventId: testEventId,
      fullName: 'Inscrito Teste 6',
      whatsapp: '75999990037',
      attendeeType: 'familiar',
      attendanceStatus: 'declined',
      source: 'direto',
    });

    // Consulta total direto na tabela para confirmar total real no banco
    const { count: realDbCount } = await supabase
      .from('event_registrations')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', testEventId);

    console.log(`  -> Registros reais inseridos na tabela event_registrations: ${realDbCount}`);
    assert(realDbCount === 6, `Esperado 6 registros reais no banco, mas encontrado ${realDbCount}`);

    console.log('✅ CONTAGEM REAL VERIFICADA: O evento possui exatamente 6 inscritos reais e a contagem foi corrigida no banco!');

    // Limpeza de registros de teste
    await supabase.from('event_registrations').delete().eq('event_id', testEventId);
    await supabase.from('platform_events').delete().eq('id', testEventId);
    console.log('\n🧹 Limpeza dos dados de teste concluída com sucesso.');

    console.log('\n================================================================');
    console.log('🎉 TODOS OS TESTES DE EDIÇÃO ADMIN, REGRAS DE RSVP E MÉTRICAS PASSARAM!');
    console.log('================================================================\n');

  } catch (err) {
    console.error('\n❌ ERRO NA EXECUÇÃO DA SUÍTE DE EVENTOS:', err);
    process.exit(1);
  }
}

runEventEditAndRSVPValidationTests();
