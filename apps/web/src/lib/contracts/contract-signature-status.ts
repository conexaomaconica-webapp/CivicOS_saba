type SupabaseLike = any;

export async function resolveSignedBusinessContract(supabase: SupabaseLike, businessId: string) {
  const { data: contracts, error: contractsError } = await supabase
    .from('contracts')
    .select('id, status, version_id, created_at')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (contractsError) return { contract: null, acceptance: null, error: contractsError };
  const rows = (contracts || []).filter(
    (contract: any) => !['voided', 'superseded'].includes(contract.status)
  );
  if (rows.length === 0) return { contract: null, acceptance: null, error: null };
  const signedContract = rows.find((contract: any) => contract.status === 'signed') || null;

  const { data: acceptance, error: acceptanceError } = await supabase
    .from('contract_acceptances')
    .select('id, contract_id, snapshot_id, accepted_at')
    .in('contract_id', rows.map((contract: any) => contract.id))
    .order('accepted_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // O status `signed` é atualizado pela mesma operação transacional que cria o
  // aceite. Se a leitura complementar do aceite for bloqueada por RLS ou por
  // indisponibilidade momentânea, não descarte uma assinatura já consolidada.
  if (acceptanceError) {
    return signedContract
      ? { contract: signedContract, acceptance: null, error: null }
      : { contract: null, acceptance: null, error: acceptanceError };
  }
  const acceptedContract = acceptance
    ? rows.find((contract: any) => contract.id === acceptance.contract_id) || null
    : null;
  return {
    contract: acceptedContract || signedContract,
    acceptance: acceptance || null,
    error: null,
  };
}
