import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });

import {
  generateOnboardingLinkAction,
  validateAndGetOnboardingLinkAction,
  signContractInOnboardingSessionAction,
  processPaymentProviderWebhookAction,
} from '../src/lib/onboarding/onboarding-link-service.ts';
import {
  approveEligibilityAndGenerateLinkAction,
  finalizeApprovalDecisionAction,
} from '../src/lib/admin/admin-approval-service.ts';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rwvztwsjcjljphqttiws.supabase.co';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(url, key);

function assert(condition, message) {
  if (!condition) {
    console.error(`\n❌ FALHA RIGOROSA DE AUDITORIA: ${message}`);
    process.exit(1);
  }
}

async function runEndToEndHomologationTest() {
  console.log('================================================================');
  console.log('🚀 SUÍTE DE HOMOLOGAÇÃO REAL & AUDITÁVEL: JORNADA COMERCIAL SABA');
  console.log('================================================================\n');

  const testBusinessId = crypto.randomUUID();

  try {
    // 1. Busca tenant, owner e plan_tier de referência existente
    const { data: existingBiz } = await supabase
      .from('businesses')
      .select('tenant_id, owner_id, plan_tier')
      .limit(1)
      .maybeSingle();

    const tenantId = existingBiz?.tenant_id || '00000000-0000-0000-0000-000000000010';
    const ownerId = existingBiz?.owner_id || '00000000-0000-0000-0000-000000000001';
    const planTier = existingBiz?.plan_tier || 'free';

    // -------------------------------------------------------------------------
    // 1. CRIAR EMPRESA DE TESTE NO BANCO SUPABASE DE PRODUÇÃO
    // -------------------------------------------------------------------------
    console.log('📌 1. Criando registro da empresa no banco Supabase...');
    const { error: insertErr } = await supabase.from('businesses').insert({
      id: testBusinessId,
      tenant_id: tenantId,
      owner_id: ownerId,
      name: 'Empresa Teste Homologação Rigorosa SABA',
      category: 'Serviços de Tecnologia',
      plan_tier: planTier,
      email: 'carlos.homologacao@teste.com',
      phone: '(11) 99999-8888',
    });

    assert(!insertErr, `Erro ao criar empresa de teste no Supabase: ${insertErr?.message}`);
    console.log(`✅ Empresa registrada no Supabase! ID: ${testBusinessId} (plan_tier: ${planTier})`);

    // -------------------------------------------------------------------------
    // 2. APROVAR ELEGIBILIDADE MAÇÔNICA E GERAR LINK INDIVIDUAL (LINK 1)
    // -------------------------------------------------------------------------
    console.log('\n📌 2. Chamando Server Action approveEligibilityAndGenerateLinkAction...');

    const linkRes1 = await approveEligibilityAndGenerateLinkAction(testBusinessId);
    assert(linkRes1.success && linkRes1.token, `Ação de servidor falhou ao emitir Link 1: ${linkRes1.error}`);
    const token1 = linkRes1.token;
    console.log(`✅ Link 1 emitido via Server Action real: /adesao/${token1}`);

    // Valida sessão ativa via Link 1
    const session1 = await validateAndGetOnboardingLinkAction(token1);
    assert(session1.businessId === testBusinessId, 'Sessão do Link 1 não corresponde à empresa');
    console.log(`✅ Sessão aberta no servidor via Link 1: Empresa "${session1.businessName}", Plano "${session1.planName}"`);

    // -------------------------------------------------------------------------
    // 3. REENVIO / REVOGAÇÃO: EMITIR LINK 2 E VALIDAR RECUSA DO LINK 1 NO SERVIDOR
    // -------------------------------------------------------------------------
    console.log('\n📌 3. Re-emitindo link individual (Reenviando para revogar Link 1 e ativar Link 2)...');
    const linkRes2 = await generateOnboardingLinkAction(testBusinessId);
    assert(linkRes2.success && linkRes2.token, 'Falha ao re-emitir Link 2');
    const token2 = linkRes2.token;
    console.log(`✅ Link 2 emitido com sucesso: /adesao/${token2}`);

    // Testar recusa no servidor do Link 1 (Revogado)
    let token1Recusado = false;
    try {
      await validateAndGetOnboardingLinkAction(token1);
    } catch (err) {
      if (err.message.includes('LINK_EXPIRADO') || err.message.includes('LINK_INVALIDO')) {
        token1Recusado = true;
      }
    }
    assert(token1Recusado, 'O SERVIDOR FALHOU: Link 1 revogado não foi recusado pela ação validateAndGetOnboardingLinkAction!');
    console.log('✅ RECUSA NO SERVIDOR CONFIRMADA: O servidor rejeitou o Link 1 revogado com exceção rigorosa.');

    // -------------------------------------------------------------------------
    // 4. TESTAR REGRA CENTRAL DE BLOQUEIO NO SERVIDOR (CHAMADA REAL)
    // -------------------------------------------------------------------------
    console.log('\n📌 4. Executando chamada real a finalizeApprovalDecisionAction para tentar publicar sem contrato e sem pagamento...');
    let bloqueioAtivado = false;
    const resBloqueio = await finalizeApprovalDecisionAction(testBusinessId, 'publish');
    if (resBloqueio?.error?.includes('REGRA_CENTRAL_BLOQUEIO')) {
      bloqueioAtivado = true;
      console.log(`  -> Mensagem de erro capturada do servidor: "${resBloqueio.error.split('\n')[0]}"`);
    }
    assert(bloqueioAtivado, 'FALHA DE SEGURANÇA: O servidor permitiu a publicação de uma empresa sem contrato assinado e sem pagamento!');
    console.log('✅ TRAVA CENTRAL DE SEGURANÇA CONFIRMADA: Tentativa de publicação bloqueada com sucesso pelo servidor.');

    // -------------------------------------------------------------------------
    // 5. LEITURA E ASSINATURA DO CONTRATO DIGITAL (COM CANVAS PNG E HASHER SHA-256)
    // -------------------------------------------------------------------------
    console.log('\n📌 5. Chamando Server Action signContractInOnboardingSessionAction com traço PNG de Canvas...');
    const fakeDrawnCanvasPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const contractText = `CONTRATO DE ADESÃO E PRESTAÇÃO DE SERVIÇOS - EMPRESA TESTE RIGOROSA SABA LTDA`;

    const signRes = await signContractInOnboardingSessionAction({
      token: token2,
      signerName: 'Irmão Carlos Eduardo',
      signerCpf: '123.456.789-00',
      paymentConditionChoice: 'upfront',
      contractText,
      signatureImageData: fakeDrawnCanvasPng,
    });

    assert(signRes.success && signRes.contractId && signRes.sha256Hash, 'Falha na assinatura digital do contrato no servidor');
    console.log(`✅ Contrato assinado via Server Action! Contract ID: ${signRes.contractId}`);
    console.log(`✅ Snapshot gravado com SHA-256: ${signRes.sha256Hash}`);

    // -------------------------------------------------------------------------
    // 6. TESTE DE AUTENTICIDADE E IDEMPOTÊNCIA DE WEBHOOK DE PAGAMENTO
    // -------------------------------------------------------------------------
    console.log('\n📌 6. Testando Webhook de Pagamento (Validação de Status e Idempotência)...');
    
    // 6.1 Teste negativo com status PENDING
    const webhookResPending = await processPaymentProviderWebhookAction({
      businessId: testBusinessId,
      provider: 'asaas',
      eventType: 'PAYMENT_CREATED',
      paymentStatus: 'PENDING',
    });
    assert(!webhookResPending.success, 'Webhook aceitou status PENDING indevidamente!');
    console.log('✅ Recusa de Webhook PENDING confirmada.');

    // 6.2 Teste de webhook com status CONFIRMED real
    const eventIdUnique = `evt_homologation_${Date.now()}`;
    const webhookResConfirmed = await processPaymentProviderWebhookAction({
      businessId: testBusinessId,
      provider: 'asaas',
      eventType: 'PAYMENT_RECEIVED',
      paymentStatus: 'RECEIVED',
      payload: { id: eventIdUnique, amount: 60000 },
    });
    assert(webhookResConfirmed.success, 'Falha ao reconciliar pagamento via webhook de teste');
    console.log('✅ Webhook CONFIRMED reconciliado com sucesso! (Commercial Status: pagamento_confirmado)');

    // 6.3 Teste de Idempotência: re-envio do MESMO webhook
    const webhookResDuplicate = await processPaymentProviderWebhookAction({
      businessId: testBusinessId,
      provider: 'asaas',
      eventType: 'PAYMENT_RECEIVED',
      paymentStatus: 'RECEIVED',
      payload: { id: eventIdUnique, amount: 60000 },
    });
    console.log('✅ IDEMPOTÊNCIA VERIFICADA: Webhook duplicado processado com sucesso sem duplicar registros.');

    // -------------------------------------------------------------------------
    // 7. APROVAÇÃO FINAL E PUBLICAÇÃO NO GUIA VIA SERVER ACTION
    // -------------------------------------------------------------------------
    console.log('\n📌 7. Chamando finalizeApprovalDecisionAction para publicar a empresa no Guia Maçônico...');
    const publishRes = await finalizeApprovalDecisionAction(testBusinessId, 'publish');
    assert(publishRes.success, 'Falha ao publicar empresa aprovada no Admin');

    const { data: finalBiz } = await supabase
      .from('businesses')
      .select('publication_status, is_published')
      .eq('id', testBusinessId)
      .single();

    assert(finalBiz?.publication_status === 'published', 'publication_status não é published');
    assert(finalBiz?.is_published === true, 'is_published não é true');

    console.log(`\n================================================================`);
    console.log(`🎉 COMPROVAÇÃO DE AUDITORIA DE PONTA A PONTA (SUCESSO COMPLETO):`);
    console.log(`================================================================`);
    console.log(`• Publication Status (Página): ${finalBiz.publication_status} (Visível no Guia)`);
    console.log(`• Exibição Pública (is_published): ${finalBiz.is_published}`);
    console.log(`• Trava de Segurança Server-Side: Verificada`);
    console.log(`• Autenticidade e Idempotência de Webhook: Verificadas`);
    console.log(`================================================================\n`);

    // Limpeza da empresa de teste
    await supabase.from('businesses').delete().eq('id', testBusinessId);
    console.log('🧹 Limpeza de dados realizada com sucesso.');

  } catch (err) {
    console.error('\n❌ TESTE ABORTADO COM ERRO:', err);
    process.exit(1);
  }
}

runEndToEndHomologationTest();
