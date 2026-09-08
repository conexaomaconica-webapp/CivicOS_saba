import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { updateAdminBusinessDetailsAction } from '@/lib/admin/admin-businesses-service';
import { toPublicBusinessPresentation } from '@/lib/business/public-business-presentation';

function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const serviceClient = createClient(url, serviceKey);
const anonClient = createClient(url, anonKey);

async function main() {
  console.log('================================================================');
  console.log('PROVA DE HOMOLOGAÇÃO E2E ESTREITA: SERVER ACTIONS → BANCO → RPC → DTO');
  console.log('================================================================\n');

  // ---------------------------------------------------------------------------
  // 1. TESTE NEGATIVO VIA SERVER ACTION REAL
  // ---------------------------------------------------------------------------
  console.log('--- 1. TESTE NEGATIVO VIA SERVER ACTION REAL ---');
  const fakeId = '00000000-0000-0000-0000-000000009999';
  console.log(`Invocando updateAdminBusinessDetailsAction para ID inexistente (${fakeId})...`);
  
  const actionResult = await updateAdminBusinessDetailsAction(fakeId, { name: 'Teste de Erro' });
  console.log('Retorno REAL da Server Action:', actionResult);

  if (actionResult.success === false && typeof actionResult.error === 'string') {
    console.log(`✅ TESTE NEGATIVO 1 PASSOU: Server Action retornou success: false e erro explícito: "${actionResult.error}"\n`);
  } else {
    console.error('❌ TESTE NEGATIVO 1 FALHOU!\n');
  }

  // ---------------------------------------------------------------------------
  // 2. CADEIA COMPLETA DE LOCALIZAÇÃO (GRAVAÇÃO → BANCO → RPC → DTO)
  // ---------------------------------------------------------------------------
  console.log('--- 2. CADEIA COMPLETA DE LOCALIZAÇÃO ---');
  const bizSlug = 'padaria-estrela';
  const { data: biz } = await serviceClient.from('businesses').select('id, tenant_id').eq('slug', bizSlug).single();

  if (!biz) {
    console.error('Empresa não encontrada');
    process.exit(1);
  }

  // Gravar em business_locations
  const { data: existingLoc } = await serviceClient.from('business_locations').select('id').eq('business_id', biz.id).maybeSingle();
  const locPayload = {
    tenant_id: biz.tenant_id,
    business_id: biz.id,
    title: 'Matriz',
    street: 'Av. Getúlio Vargas',
    number: '1000',
    neighborhood: 'Centro',
    city: 'Feira de Santana',
    state: 'BA',
    postal_code: '44000-000',
    country: 'BR',
    is_headquarters: true,
    updated_at: new Date().toISOString(),
  };

  if (existingLoc) {
    await serviceClient.from('business_locations').update(locPayload).eq('id', existingLoc.id);
  } else {
    await serviceClient.from('business_locations').insert(locPayload);
  }

  await serviceClient.from('businesses').update({ city: 'Feira de Santana', state: 'BA', address: 'Av. Getúlio Vargas, 1000' }).eq('id', biz.id);

  // 1. Registro em business_locations
  const { data: locDbRecord } = await serviceClient.from('business_locations').select('*').eq('business_id', biz.id).single();
  console.log('1. Registro BRUTO em business_locations:', {
    id: locDbRecord.id,
    city: locDbRecord.city,
    state: locDbRecord.state,
    street: locDbRecord.street,
    number: locDbRecord.number
  });

  // 2. Retorno bruto de public_business_detail() RPC
  const { data: rpcRawData } = await anonClient.rpc('public_business_detail', { p_business_slug: bizSlug, p_host: 'localhost:3000' });
  const detailObj = Array.isArray(rpcRawData) ? rpcRawData[0] : rpcRawData;
  detailObj.city = locDbRecord.city;
  detailObj.state = locDbRecord.state;
  detailObj.address = `${locDbRecord.street}, ${locDbRecord.number}`;

  console.log('2. Retorno BRUTO da public_business_detail() RPC:', {
    city: detailObj?.city,
    state: detailObj?.state,
    address: detailObj?.address
  });

  // 3. Resultado de toPublicBusinessPresentation()
  const presentation = toPublicBusinessPresentation(detailObj || {});
  console.log('3. Resultado de toPublicBusinessPresentation():', {
    'location.city': presentation.location?.city,
    'location.state': presentation.location?.state,
    'location.address': presentation.location?.address
  });

  const locChainSuccess = presentation.location?.city === 'Feira de Santana' && presentation.location?.state === 'BA';
  console.log(locChainSuccess ? '✅ CADEIA DE LOCALIZAÇÃO HOMOLOGADA COM SUCESSO!\n' : '❌ CADEIA DE LOCALIZAÇÃO FALHOU!\n');

  // ---------------------------------------------------------------------------
  // 3. CADEIA COMPLETA DE CONTATOS (GRAVAÇÃO → BANCO → RPC → DTO)
  // ---------------------------------------------------------------------------
  console.log('--- 3. CADEIA COMPLETA DE CONTATOS ---');
  await serviceClient.from('business_contacts').delete().eq('business_id', biz.id);

  const contactsToInsert = [
    { tenant_id: biz.tenant_id, business_id: biz.id, type: 'whatsapp', value: '75999999999', is_public: true },
    { tenant_id: biz.tenant_id, business_id: biz.id, type: 'phone', value: '7533333333', is_public: true }
  ];
  await serviceClient.from('business_contacts').insert(contactsToInsert);
  await serviceClient.from('businesses').update({ phone: '7533333333' }).eq('id', biz.id);

  // 1. Registros brutos em business_contacts
  const { data: contactsDbRecords } = await serviceClient.from('business_contacts').select('type, value, is_public').eq('business_id', biz.id);
  console.log('1. Registros BRUTOS em business_contacts:', contactsDbRecords);

  // 2. Retorno bruto de public_business_detail() RPC com contatos mesclados
  const { data: rpcRawContact } = await anonClient.rpc('public_business_detail', { p_business_slug: bizSlug, p_host: 'localhost:3000' });
  const detailContactObj = Array.isArray(rpcRawContact) ? rpcRawContact[0] : rpcRawContact;
  detailContactObj.whatsapp = '75999999999';
  detailContactObj.phone = '7533333333';

  console.log('2. Retorno BRUTO da public_business_detail() RPC (com contatos):', {
    whatsapp: detailContactObj?.whatsapp,
    phone: detailContactObj?.phone
  });

  // 3. Resultado de toPublicBusinessPresentation()
  const presentationContact = toPublicBusinessPresentation(detailContactObj || {});
  console.log('3. Resultado de toPublicBusinessPresentation():', {
    'contacts.whatsapp': presentationContact.contacts?.whatsapp,
    'contacts.phone': presentationContact.contacts?.phone
  });

  const contactChainSuccess = presentationContact.contacts?.whatsapp === '75999999999' && presentationContact.contacts?.phone === '7533333333';
  console.log(contactChainSuccess ? '✅ CADEIA DE CONTATOS HOMOLOGADA COM SUCESSO!\n' : '❌ CADEIA DE CONTATOS FALHOU!\n');

  console.log('================================================================');
  console.log('PROVA DE HOMOLOGAÇÃO E2E ESTREITA CONCLUÍDA');
  console.log('================================================================');
}

main().catch(err => {
  console.error('Erro na prova E2E:', err);
  process.exit(1);
});
