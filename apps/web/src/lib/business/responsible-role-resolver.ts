/**
 * Utilitário canônico de resolução de papéis, profissões e gênero para o Card do Responsável
 * Conexão Maçônica / CivicOS SABA
 *
 * Regras:
 * - Irmão: "Proprietário" ou Profissão conforme categoria (gênero masculino)
 * - Cunhada: "Proprietária" ou Profissão conforme categoria (gênero feminino)
 * - Sobrinho: "Proprietário" ou Profissão conforme categoria (gênero masculino)
 * - Sobrinha: "Proprietária" ou Profissão conforme categoria (gênero feminino)
 */

export type ResponsibleGender = 'masculino' | 'feminino';

export function resolveResponsibleGender(options: {
  communityLabel?: string | null;
  eligibilityType?: string | null;
  familyRelationship?: string | null;
}): ResponsibleGender {
  const comm = (options.communityLabel || '').toLowerCase();
  const rel = (options.familyRelationship || '').toLowerCase();
  const elig = (options.eligibilityType || '').toLowerCase();

  if (comm.includes('cunhada') || elig === 'mason_spouse') return 'feminino';
  if (comm.includes('sobrinha') || rel.includes('filha') || rel.includes('sobrinha') || rel.includes('esposa')) return 'feminino';
  if (comm.includes('irmã')) return 'feminino';

  return 'masculino';
}

export function resolveTreatmentLabel(options: {
  communityLabel?: string | null;
  eligibilityType?: string | null;
  familyRelationship?: string | null;
}): string {
  const comm = (options.communityLabel || '').trim();
  const lower = comm.toLowerCase();
  const rel = (options.familyRelationship || '').toLowerCase();
  const elig = (options.eligibilityType || '').toLowerCase();

  if (lower.includes('cunhada') || elig === 'mason_spouse') return 'Cunhada';
  if (lower.includes('sobrinha') || rel.includes('filha') || rel.includes('sobrinha')) return 'Sobrinha';
  if (lower.includes('sobrinho') || rel.includes('filho') || elig === 'mason_family') return 'Sobrinho';
  if (lower.includes('irmão') || lower.includes('ir.') || lower.includes('ir∴')) return 'Ir∴';

  return comm || 'Ir∴';
}

const CATEGORY_PROFESSION_MAP: Array<[RegExp, { masc: string; fem: string }]> = [
  [/advogad|advocacia|jur[ií]dic/i, { masc: 'Advogado', fem: 'Advogada' }],
  [/veterin[aá]r/i, { masc: 'Médico Veterinário', fem: 'Médica Veterinária' }],
  [/odonto|dentista/i, { masc: 'Cirurgião-Dentista', fem: 'Cirurgiã-Dentista' }],
  [/psicol|psicolog/i, { masc: 'Psicólogo', fem: 'Psicóloga' }],
  [/fisioterap/i, { masc: 'Fisioterapeuta', fem: 'Fisioterapeuta' }],
  [/nutri[çc]|nutricion/i, { masc: 'Nutricionista', fem: 'Nutricionista' }],
  [/m[ée]dic|medicina|cl[ií]nica m[ée]dica|cl[ií]nica geral/i, { masc: 'Médico', fem: 'Médica' }],
  [/arquitet/i, { masc: 'Arquiteto', fem: 'Arquiteta' }],
  [/engenhar/i, { masc: 'Engenheiro', fem: 'Engenheira' }],
  [/contab|contador/i, { masc: 'Contador', fem: 'Contadora' }],
  [/corret|im[óo]ve|imobili/i, { masc: 'Corretor de Imóveis', fem: 'Corretora de Imóveis' }],
  [/seguro/i, { masc: 'Corretor de Seguros', fem: 'Corretora de Seguros' }],
  [/consultor/i, { masc: 'Consultor', fem: 'Consultora' }],
  [/design|estil/i, { masc: 'Designer', fem: 'Designer' }],
  [/fot[oó]graf/i, { masc: 'Fotógrafo', fem: 'Fotógrafa' }],
  [/jornalis/i, { masc: 'Jornalista', fem: 'Jornalista' }],
  [/publicit|market/i, { masc: 'Publicitário', fem: 'Publicitária' }],
  [/farmac|farm[aá]cia/i, { masc: 'Farmacêutico', fem: 'Farmacêutica' }],
  [/oficina|mec[aâ]nic/i, { masc: 'Mecânico Especialista', fem: 'Mecânica Especialista' }],
  [/beleza|est[eé]tic|cabel/i, { masc: 'Especialista em Estética', fem: 'Especialista em Estética' }],
  [/tecnolog|software|inform[aá]tica|comput/i, { masc: 'Especialista em Tecnologia', fem: 'Especialista em Tecnologia' }],
  [/educa[çc]|escola|ensino|profess/i, { masc: 'Professor', fem: 'Professora' }],
  [/per[ií]cia|perito/i, { masc: 'Perito Judicial', fem: 'Perita Judicial' }],
  [/artesan|artes[aã]/i, { masc: 'Artesão', fem: 'Artesã' }],
];

export function resolveProfessionFromCategory(
  category: string | null | undefined,
  gender: ResponsibleGender
): string | null {
  if (!category) return null;
  const match = CATEGORY_PROFESSION_MAP.find(([pattern]) => pattern.test(category));
  if (!match) return null;
  return gender === 'feminino' ? match[1].fem : match[1].masc;
}

export function resolveResponsibleRole(options: {
  businessRole?: string | null;
  communityLabel?: string | null;
  category?: string | null;
  eligibilityType?: string | null;
  familyRelationship?: string | null;
}): string {
  const gender = resolveResponsibleGender(options);
  const defaultProp = gender === 'feminino' ? 'Proprietária' : 'Proprietário';
  const rawRole = (options.businessRole || '').trim();
  const profession = resolveProfessionFromCategory(options.category, gender);

  // Se o cargo contiver "Profissão · Proprietário(a)", simplificar para a profissão
  const dotPropMatch = rawRole.match(/^(.+?)\s*·\s*propriet[aá]ri[oa]$/i);
  if (dotPropMatch && dotPropMatch[1]) {
    return profession || dotPropMatch[1].trim();
  }

  // 1. Regra Canônica:
  // - Irmão: "Proprietário" ou Profissão conforme categoria (gênero masculino)
  // - Cunhada: "Proprietária" ou Profissão conforme categoria (gênero feminino)
  // - Sobrinho: "Proprietário" ou Profissão conforme categoria (gênero masculino)
  // - Sobrinha: "Proprietária" ou Profissão conforme categoria (gênero feminino)
  // Se não houver cargo preenchido ou for o padrão "Proprietário(a)", utiliza a Profissão da categoria ou Proprietário(a)
  if (!rawRole || /^propriet[aá]ri[oa]$/i.test(rawRole)) {
    return profession || defaultProp;
  }

  // 2. Se o cargo for customizado (ex: "Diretor", "Sócio", "Advogado", etc.), ajustar a concordância de gênero:
  let adjustedRole = rawRole;
  if (gender === 'feminino') {
    adjustedRole = adjustedRole
      .replace(/\bProprietário\b/gi, 'Proprietária')
      .replace(/\bSócio\b/gi, 'Sócia')
      .replace(/\bDiretor\b/gi, 'Diretora')
      .replace(/\bAdvogado\b/gi, 'Advogada')
      .replace(/\bMédico\b/gi, 'Médica')
      .replace(/\bCirurgião-Dentista\b/gi, 'Cirurgiã-Dentista')
      .replace(/\bEngenheiro\b/gi, 'Engenheira')
      .replace(/\bArquiteto\b/gi, 'Arquiteta')
      .replace(/\bContador\b/gi, 'Contadora')
      .replace(/\bPsicólogo\b/gi, 'Psicóloga')
      .replace(/\bConsultor\b/gi, 'Consultora')
      .replace(/\bCorretor\b/gi, 'Corretora')
      .replace(/\bPublicitário\b/gi, 'Publicitária')
      .replace(/\bFarmacêutico\b/gi, 'Farmacêutica')
      .replace(/\bMecânico\b/gi, 'Mecânica')
      .replace(/\bProfessor\b/gi, 'Professora')
      .replace(/\bArtesão\b/gi, 'Artesã');
  } else {
    adjustedRole = adjustedRole
      .replace(/\bProprietária\b/gi, 'Proprietário')
      .replace(/\bSócia\b/gi, 'Sócio')
      .replace(/\bDiretora\b/gi, 'Diretor')
      .replace(/\bAdvogada\b/gi, 'Advogado')
      .replace(/\bMédica\b/gi, 'Médico')
      .replace(/\bCirurgiã-Dentista\b/gi, 'Cirurgião-Dentista')
      .replace(/\bEngenheira\b/gi, 'Engenheiro')
      .replace(/\bArquiteta\b/gi, 'Arquiteto')
      .replace(/\bContadora\b/gi, 'Contador')
      .replace(/\bPsicóloga\b/gi, 'Psicólogo')
      .replace(/\bConsultora\b/gi, 'Consultor')
      .replace(/\bCorretora\b/gi, 'Corretor')
      .replace(/\bPublicitária\b/gi, 'Publicitário')
      .replace(/\bFarmacêutica\b/gi, 'Farmacêutico')
      .replace(/\bMecânica\b/gi, 'Mecânico')
      .replace(/\bProfessora\b/gi, 'Professor')
      .replace(/\bArtesã\b/gi, 'Artesão');
  }

  return adjustedRole;
}
