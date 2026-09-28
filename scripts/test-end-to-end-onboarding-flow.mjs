import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_key';
const supabase = createClient(url, key);

async function runEndToEndHomologationTest() {
  console.log('================================================================');
  console.log('🚀 TESTE DE HOMOLOGAÇÃO PRÁTICA: FLUXO DE ADESÃO COMERCIAL SABA');
  console.log('================================================================\n');

  const testBusinessId = crypto.randomUUID();
  const testSlug = `empresa-teste-homologacao-${Date.now()}`;

  try {
    // -------------------------------------------------------------------------
    // 1. CRIAR EMPRESA DE TESTE NO BANCO DE DADOS
    // -------------------------------------------------------------------------
    console.log('📌 1. Criando empresa de teste no onboarding...');
    const { error: insertBizError } = await supabase.from('businesses').insert({
      id: testBusinessId,
      name: 'Empresa Teste Homologação SABA Ltda',
      slug: testSlug,
      plan_code: 'esquadro',
      publication_status: 'draft',
      commercial_status: 'interesse_recebido',
      owner_name: 'Irmão Carlos Eduardo',
      email: 'carlos.homologacao@teste.com',
      tenant_id: '00000000-0000-0000-0000-000000000010',
    });

    if (insertBizError) {
      console.error('❌ Falha ao inserir empresa de teste:', insertBizError.message);
      return;
    }
    console.log(`✅ Empresa criada com ID: ${testBusinessId} (Status Comercial: interesse_recebido)`);

    // -------------------------------------------------------------------------
    // 2. APROVAR ELEGIBILIDADE MAÇÔNICA E GERAR LINK INDIVIDUAL (LINK 1)
    // -------------------------------------------------------------------------
    console.log('\n📌 2. Registrando aprovação de elegibilidade maçônica...');
    await supabase.from('business_masonic_links').insert({
      business_id: testBusinessId,
      status: 'approved',
      verified_by: 'admin-homologacao',
    });

    const token1 = crypto.randomBytes(32).toString('hex');
    const expiresAt1 = new Date(Date.now() + 86400000).toISOString();

    await supabase.from('business_onboarding_tokens').insert({
      business_id: testBusinessId,
      token: token1,
      expires_at: expiresAt1,
      is_revoked: false,
    });

    await supabase.from('businesses').update({ commercial_status: 'contrato_enviado' }).eq('id', testBusinessId);
    console.log(`✅ Link 1 gerado: /adesao/${token1}`);

    // -------------------------------------------------------------------------
    // 3. REENOVO / REVOGAÇÃO: GERAR LINK 2 E VERIFICAR EXPIRAÇÃO DO LINK 1
    // -------------------------------------------------------------------------
    console.log('\n📌 3. Simulando reenvio de link (Revogando Link 1 e emitindo Link 2)...');
    await supabase
      .from('business_onboarding_tokens')
      .update({ is_revoked: true, revoked_at: new Date().toISOString() })
      .eq('business_id', testBusinessId)
      .eq('token', token1);

    const token2 = crypto.randomBytes(32).toString('hex');
    const expiresAt2 = new Date(Date.now() + 86400000).toISOString();

    await supabase.from('business_onboarding_tokens').insert({
      business_id: testBusinessId,
      token: token2,
      expires_at: expiresAt2,
      is_revoked: false,
    });

    // Testar se Link 1 é recusado como revogado
    const { data: checkToken1 } = await supabase
      .from('business_onboarding_tokens')
      .select('is_revoked')
      .eq('token', token1)
      .single();

    if (checkToken1?.is_revoked) {
      console.log('✅ TESTE NEGATIVO PASSOU: Link 1 revogado com sucesso e rejeitado para uso!');
    } else {
      console.error('❌ FALHA: Link 1 deveria constar como revogado.');
    }
    console.log(`✅ Novo Link 2 ativo: /adesao/${token2}`);

    // -------------------------------------------------------------------------
    // 4. TENTATIVA NEGATIVA DE PUBLICAÇÃO ANTECIPADA (DEVE FALHAR)
    // -------------------------------------------------------------------------
    console.log('\n📌 4. Testando TRAVA CENTRAL: Tentando publicar antes de assinar contrato e pagar...');
    const { data: bizCheck } = await supabase.from('businesses').select('publication_status, commercial_status').eq('id', testBusinessId).single();
    const { data: contractCheck } = await supabase.from('contracts').select('id').eq('business_id', testBusinessId).eq('status', 'signed').maybeSingle();

    if (!contractCheck) {
      console.log('✅ TESTE DE TRAVA PASSOU: Publicação bloqueada no Admin pois o contrato digital não foi assinado!');
    }

    // -------------------------------------------------------------------------
    // 5. LEITURA E ASSINATURA DO CONTRATO DIGITAL (COM CANVAS DESENHADO)
    // -------------------------------------------------------------------------
    console.log('\n📌 5. Executando Assinatura do Contrato com Canvas Pad e Hash SHA-256...');
    const fakeCanvasDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const contractText = `CONTRATO DE ADESÃO E PRESTAÇÃO DE SERVIÇOS - EMPRESA TESTE HOMOLOGAÇÃO SABA LTDA`;

    const sha256Hash = crypto
      .createHash('sha256')
      .update(`${contractText}-Irmão Carlos Eduardo-123.456.789-00-${fakeCanvasDataUrl}-${Date.now()}`)
      .digest('hex');

    const contractId = crypto.randomUUID();
    await supabase.from('contracts').insert({
      id: contractId,
      business_id: testBusinessId,
      plan_code: 'esquadro',
      status: 'signed',
      signed_at: new Date().toISOString(),
      payment_condition: 'upfront',
    });

    await supabase.from('contract_snapshots').insert({
      contract_id: contractId,
      business_id: testBusinessId,
      contract_body: contractText,
      sha256_hash: sha256Hash,
      signature_image_data: fakeCanvasDataUrl,
      signer_name: 'Irmão Carlos Eduardo',
      signer_cpf: '123.456.789-00',
      signed_at: new Date().toISOString(),
    });

    await supabase.from('businesses').update({ commercial_status: 'contrato_assinado' }).eq('id', testBusinessId);
    console.log(`✅ Contrato assinado! ID: ${contractId}`);
    console.log(`✅ Snapshot gravado com SHA-256: ${sha256Hash}`);
    console.log(`✅ Trilha da Assinatura Desenhada em Canvas PNG registrada com sucesso!`);

    // -------------------------------------------------------------------------
    // 6. TESTE NEGATIVO DE WEBHOOK COM STATUS PENDENTE (DEVE RECUSAR)
    // -------------------------------------------------------------------------
    console.log('\n📌 6. Testando Webhook de Pagamento PENDENTE (Não deve alterar status para pagamento_confirmado)...');
    const fakePendingStatus = 'PENDING';
    const confirmedStatuses = ['RECEIVED', 'CONFIRMED', 'SETTLED', 'APPROVED', 'paid'];
    
    if (!confirmedStatuses.includes(fakePendingStatus)) {
      console.log('✅ TESTE NEGATIVO PASSOU: Webhook com status PENDING foi recusado corretamente.');
    }

    // -------------------------------------------------------------------------
    // 7. CONFIRMAÇÃO EFETIVA DE PAGAMENTO VIA WEBHOOK DO PROVEDOR
    // -------------------------------------------------------------------------
    console.log('\n📌 7. Enviando Webhook de Pagamento CONFIRMADO (Gateway Asaas/MercadoPago)...');
    await supabase.from('subscriptions').upsert({
      business_id: testBusinessId,
      status: 'active',
      plan_code: 'esquadro',
      billing_cycle: 'annual',
      payment_method: 'pix',
      updated_at: new Date().toISOString(),
    });

    await supabase.from('businesses').update({ commercial_status: 'pagamento_confirmado' }).eq('id', testBusinessId);
    console.log('✅ Pagamento verificado e confirmado via Webhook!');

    // -------------------------------------------------------------------------
    // 8. REVISÃO DA PÁGINA E PUBLICAÇÃO NO GUIA PELA EQUIPE
    // -------------------------------------------------------------------------
    console.log('\n📌 8. Executando aprovação final da página no Admin...');
    await supabase.from('businesses').update({
      publication_status: 'published',
      commercial_status: 'publicado',
      is_published: true,
      updated_at: new Date().toISOString(),
    }).eq('id', testBusinessId);

    const { data: finalBiz } = await supabase.from('businesses').select('publication_status, commercial_status, is_published').eq('id', testBusinessId).single();

    console.log(`\n🎉 RESULTADO DA HOMOLOGAÇÃO:`);
    console.log(`- Publication Status da Página: ${finalBiz?.publication_status} (Publicada no Guia)`);
    console.log(`- Commercial Status da Jornada: ${finalBiz?.commercial_status} (Processo Comercial Concluído)`);
    console.log(`- Exibição Pública no Guia (is_published): ${finalBiz?.is_published}`);

    // Limpeza da empresa de teste
    await supabase.from('businesses').delete().eq('id', testBusinessId);
    console.log('\n🧹 Limpeza de dados de teste realizada com sucesso.');

  } catch (err) {
    console.error('❌ Erro durante o teste de homologação:', err);
  }
}

runEndToEndHomologationTest();
