/**
 * Normalização e validação das linhas da importação de lojas maçônicas.
 *
 * - `errors` bloqueiam a linha (não é importada).
 * - `warnings` indicam valor inválido que foi descartado; a linha continua importável.
 */

export const LODGE_IMPORT_FIELDS = [
  { key: 'name', label: 'Nome da Loja', required: true, aliases: ['nome', 'name', 'loja', 'nome_da_loja', 'nome_loja', 'razao_social', 'denominacao'] },
  { key: 'code_number', label: 'Número da Loja', aliases: ['numero', 'n', 'no', 'num', 'code_number', 'numero_da_loja', 'numero_loja', 'n_loja'] },
  { key: 'potency', label: 'Potência', aliases: ['potencia', 'potency', 'obediencia', 'jurisdicao'] },
  { key: 'rite', label: 'Rito', aliases: ['rito', 'ritual', 'rite'] },
  { key: 'foundation_date', label: 'Data de Fundação', aliases: ['data_fundacao', 'fundacao', 'fundada_em', 'foundation_date', 'data_de_fundacao'] },
  { key: 'worshipful_master_name', label: 'Venerável Mestre', aliases: ['veneravel', 'veneravel_mestre', 'nome_do_veneravel', 'nome_veneravel', 'vm', 'worshipful_master_name', 'venerable_name', 'veneravel_atual'] },
  { key: 'meeting_day', label: 'Dia da Reunião', aliases: ['dia_reuniao', 'dia_da_reuniao', 'dia_sessao', 'dia_da_sessao', 'dia', 'dia_da_semana', 'meeting_day', 'reuniao', 'sessoes'] },
  { key: 'meeting_time', label: 'Horário da Reunião', aliases: ['horario_reuniao', 'horario_da_reuniao', 'horario_sessao', 'horario', 'hora', 'hora_reuniao', 'meeting_time'] },
  { key: 'city', label: 'Cidade / Oriente', aliases: ['cidade', 'city', 'municipio', 'oriente'] },
  { key: 'state', label: 'Estado / UF', aliases: ['estado', 'state', 'uf'] },
  { key: 'cep', label: 'CEP', aliases: ['cep', 'postal_code', 'codigo_postal'] },
  { key: 'address', label: 'Endereço', aliases: ['endereco', 'address', 'logradouro', 'endereco_completo', 'local', 'sede'] },
  { key: 'latitude', label: 'Latitude', aliases: ['latitude', 'lat'] },
  { key: 'longitude', label: 'Longitude', aliases: ['longitude', 'lng', 'lon', 'long'] },
  { key: 'coordinates', label: 'Coordenadas (lat, lng numa só coluna)', aliases: ['coordenadas', 'coordinates', 'geolocalizacao', 'localizacao', 'lat_lng', 'latlng'] },
  { key: 'phone', label: 'Telefone', aliases: ['telefone', 'phone', 'fone', 'tel', 'contato'] },
  { key: 'whatsapp', label: 'WhatsApp', aliases: ['whatsapp', 'whats', 'zap', 'celular'] },
  { key: 'email', label: 'E-mail', aliases: ['email', 'e_mail', 'correio_eletronico'] },
  { key: 'website', label: 'Site', aliases: ['site', 'website', 'url', 'pagina_web', 'web'] },
  { key: 'instagram', label: 'Instagram', aliases: ['instagram', 'insta', 'ig'] },
  { key: 'logo_url', label: 'Logo / Brasão (URL)', aliases: ['logo', 'logo_url', 'brasao', 'brasao_url', 'imagem_logo'] },
  { key: 'cover_url', label: 'Foto da Sede (URL)', aliases: ['foto', 'foto_sede', 'cover_url', 'foto_url', 'imagem', 'capa'] },
] as const;

export type LodgeImportFieldKey = (typeof LODGE_IMPORT_FIELDS)[number]['key'];
export type LodgeImportInput = Partial<Record<LodgeImportFieldKey, unknown>>;

export type MeetingRule = { day: string; weeks: number[] };

export type NormalizedLodgeValues = {
  name: string;
  code_number: number | null;
  potency: string;
  rite: string;
  foundation_date: string;
  worshipful_master_name: string;
  meeting_day: string;
  /** Uma entrada por dia da semana; weeks vazio = toda semana, [1,3] = 1ª e 3ª do mês, [-1] = última. */
  meetings: MeetingRule[];
  meeting_time: string;
  city: string;
  state: string;
  cep: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  instagram: string;
  logo_url: string;
  cover_url: string;
};

export type NormalizedLodgeRow = {
  values: NormalizedLodgeValues;
  errors: string[];
  warnings: string[];
};

export function normalizeColumnName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

/** Sugere a coluna da planilha para cada campo: igualdade exata com alias e, depois, por contém. */
export function suggestColumnMapping(columns: string[]): Record<string, string> {
  const normalized = columns.map((c) => ({ column: c, norm: normalizeColumnName(c) }));
  const used = new Set<string>();
  const mapping: Record<string, string> = {};

  // 1ª passada: igualdade exata. 2ª: a coluna contém o alias (aliases com 4+ letras, para evitar falsos positivos).
  for (const pass of [1, 2]) {
    for (const field of LODGE_IMPORT_FIELDS) {
      if (mapping[field.key]) continue;
      const aliases = field.aliases.map(normalizeColumnName);
      const match = normalized.find(({ column, norm }) => {
        if (used.has(column)) return false;
        if (pass === 1) return aliases.includes(norm);
        return aliases.some((a) => a.length >= 4 && norm.includes(a));
      });
      if (match) {
        mapping[field.key] = match.column;
        used.add(match.column);
      }
    }
  }
  return mapping;
}

const UF_BY_NAME: Record<string, string> = {
  acre: 'AC', alagoas: 'AL', amapa: 'AP', amazonas: 'AM', bahia: 'BA', ceara: 'CE', 'distrito federal': 'DF',
  'espirito santo': 'ES', goias: 'GO', maranhao: 'MA', 'mato grosso': 'MT', 'mato grosso do sul': 'MS',
  'minas gerais': 'MG', para: 'PA', paraiba: 'PB', parana: 'PR', pernambuco: 'PE', piaui: 'PI',
  'rio de janeiro': 'RJ', 'rio grande do norte': 'RN', 'rio grande do sul': 'RS', rondonia: 'RO', roraima: 'RR',
  'santa catarina': 'SC', 'sao paulo': 'SP', sergipe: 'SE', tocantins: 'TO',
};
const VALID_UFS = new Set(Object.values(UF_BY_NAME));

const WEEKDAYS: Array<[string, string[]]> = [
  ['segunda', ['segunda', 'seg', '2a', '2']],
  ['terca', ['terca', 'ter', '3a', '3']],
  ['quarta', ['quarta', 'qua', '4a', '4']],
  ['quinta', ['quinta', 'qui', '5a', '5']],
  ['sexta', ['sexta', 'sex', '6a', '6']],
  ['sabado', ['sabado', 'sab']],
  ['domingo', ['domingo', 'dom']],
];

const stripAccents = (v: string) => v.normalize('NFD').replace(/[̀-ͯ]/g, '');
const asText = (v: unknown) => (v == null ? '' : String(v).trim());

function parseDecimal(raw: string): number | null {
  const cleaned = raw.replace(/\s/g, '').replace(/°/g, '');
  if (!cleaned) return null;
  // "-12,9714" (vírgula decimal) ou "-12.9714"; milhar não é esperado em coordenadas.
  const num = Number(cleaned.replace(',', '.'));
  return Number.isFinite(num) ? num : null;
}

export function normalizeWeekday(raw: string): string | null {
  const clean = stripAccents(raw.toLowerCase())
    .replace(/-?feira/g, '')
    .replace(/[ªº°]/g, '')
    .replace(/[^a-z0-9]/g, '');
  if (!clean) return null;
  const hit = WEEKDAYS.find(([, names]) => names.includes(clean));
  return hit ? hit[0] : null;
}


const WEEKDAY_TOKENS: Record<string, string> = {
  segunda: 'segunda', segundas: 'segunda', seg: 'segunda',
  terca: 'terca', tercas: 'terca', ter: 'terca',
  quarta: 'quarta', quartas: 'quarta', qua: 'quarta',
  quinta: 'quinta', quintas: 'quinta', qui: 'quinta',
  sexta: 'sexta', sextas: 'sexta', sex: 'sexta',
  sabado: 'sabado', sabados: 'sabado', sab: 'sabado',
  domingo: 'domingo', domingos: 'domingo', dom: 'domingo',
};
// Só ordinais por extenso sem ambiguidade ("segunda"/"quarta"/"quinta" são dias da semana).
const WORD_ORDINALS: Record<string, number> = {
  primeira: 1, primeiro: 1, terceira: 3, terceiro: 3, ultima: -1, ultimo: -1, penultima: -2, penultimo: -2,
};

/** "1ª e 3ª", "2ª", "última", "1ª, 2ª e 3ª". */
export function formatWeeksText(weeks: number[]): string {
  const parts = weeks.map((w) => (w === -1 ? 'última' : w === -2 ? 'penúltima' : `${w}ª`));
  if (parts.length <= 1) return parts[0] || '';
  return `${parts.slice(0, -1).join(', ')} e ${parts[parts.length - 1]}`;
}

/**
 * Interpreta a regra de reunião escrita livremente na planilha:
 * "1ª e 3ª Quintas Feiras", "Segundas e quintas", "última sexta do mês", "Quarta às 20h", "2º sábado".
 * Devolve um item por dia da semana (com as semanas do mês, quando houver) e o horário, se vier junto.
 */
export function parseMeetingSchedule(raw: string): { meetings: MeetingRule[]; time: string } {
  let text = stripAccents(String(raw ?? '').toLowerCase());

  // Horário embutido na própria frase (ex.: "quintas às 20h", "20:30").
  let time = '';
  const timeMatch = text.match(/(\d{1,2})\s*(?::|h)\s*(\d{2})?\s*(?:hs?|horas?)?(?![\w])/);
  if (timeMatch) {
    const normalized = normalizeMeetingTime(`${timeMatch[1]}:${timeMatch[2] ?? '00'}`);
    if (normalized) {
      time = normalized;
      text = text.replace(timeMatch[0], ' ');
    }
  }

  text = text.replace(/[ªº°]/g, ' ').replace(/(\d)\s*(?:a|o)(?![a-z])/g, '$1 ');
  const tokens = text.split(/[^a-z0-9-]+/).flatMap((t) => t.split('-')).filter(Boolean);

  type Token = { kind: 'ord'; value: number } | { kind: 'day'; value: string };
  const parsed: Token[] = [];
  for (const token of tokens) {
    const day = WEEKDAY_TOKENS[token];
    if (day) {
      parsed.push({ kind: 'day', value: day });
    } else if (token in WORD_ORDINALS) {
      parsed.push({ kind: 'ord', value: WORD_ORDINALS[token]! });
    } else if (/^[1-5]$/.test(token)) {
      parsed.push({ kind: 'ord', value: Number(token) });
    }
  }

  const byDay = new Map<string, Set<number>>();
  const order: string[] = [];
  parsed.forEach((token, index) => {
    if (token.kind !== 'day') return;
    // Ordinais logo antes do dia ("1ª e 3ª quinta") ou, se não houver, logo depois ("quinta, 1ª e 3ª").
    const before: number[] = [];
    for (let i = index - 1; i >= 0 && parsed[i]!.kind === 'ord'; i--) before.unshift((parsed[i] as { value: number }).value);
    const after: number[] = [];
    if (before.length === 0) {
      for (let i = index + 1; i < parsed.length && parsed[i]!.kind === 'ord'; i++) after.push((parsed[i] as { value: number }).value);
    }
    const weeks = before.length ? before : after;
    if (!byDay.has(token.value)) {
      byDay.set(token.value, new Set());
      order.push(token.value);
    }
    weeks.forEach((w) => byDay.get(token.value)!.add(w));
  });

  const meetings: MeetingRule[] = order.map((day) => ({
    day,
    weeks: [...byDay.get(day)!].sort((a, b) => (a < 0 ? 10 + a : a) - (b < 0 ? 10 + b : b)),
  }));
  return { meetings, time };
}

export function normalizeMeetingTime(raw: string): string | null {
  const text = raw.trim().toLowerCase();
  if (!text) return null;

  // Excel guarda horário como fração do dia (0.8333 = 20:00).
  if (/^0?\.\d+$/.test(text) || /^0,\d+$/.test(text)) {
    const fraction = Number(text.replace(',', '.'));
    if (fraction >= 0 && fraction < 1) {
      const totalMinutes = Math.round(fraction * 24 * 60);
      return `${String(Math.floor(totalMinutes / 60) % 24).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;
    }
  }

  // 20:00, 20:00:00, 20h, 20h30, 20 h 30, 8:30pm
  const match = text.match(/^(\d{1,2})\s*(?:[:h]\s*(\d{1,2}))?\s*(?:h|hs|horas)?\s*(am|pm)?(?::\d{2})?$/);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = match[2] ? Number(match[2]) : 0;
  if (match[3] === 'pm' && hour < 12) hour += 12;
  if (match[3] === 'am' && hour === 12) hour = 0;
  if (hour > 23 || minute > 59) return null;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function normalizeDate(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;
  let match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  let y: number, m: number, d: number;
  if (match) {
    [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else if ((match = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/))) {
    [d, m, y] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else if (/^\d{4,6}(?:[.,]\d+)?$/.test(text)) {
    // Número serial do Excel (dias desde 30/12/1899); a parte decimal é a hora do dia e é descartada.
    const serialDays = Math.floor(Number(text.replace(',', '.')));
    const date = new Date(Math.round((serialDays - 25569) * 86400 * 1000));
    if (Number.isNaN(date.getTime())) return null;
    [y, m, d] = [date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()];
  } else {
    return null;
  }
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  if (y < 1700 || y > new Date().getUTCFullYear()) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function normalizeUrl(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;
  const withProtocol = /^https?:\/\//i.test(text) ? text : `https://${text}`;
  try {
    const url = new URL(withProtocol);
    return url.hostname.includes('.') ? url.toString().replace(/\/$/, '') : null;
  } catch {
    return null;
  }
}

function normalizeInstagram(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;
  const fromUrl = text.match(/instagram\.com\/([A-Za-z0-9._]+)/i);
  const handle = (fromUrl?.[1] ?? text).replace(/^@/, '').replace(/\/$/, '');
  return /^[A-Za-z0-9._]{1,30}$/.test(handle) ? `@${handle}` : null;
}

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  const national = digits.startsWith('55') && digits.length > 11 ? digits.slice(2) : digits;
  if (national.length < 10 || national.length > 11) return null;
  return raw.trim();
}

const BRAZIL_BOUNDS = { latMin: -34, latMax: 6, lngMin: -74, lngMax: -28 };

export function normalizeLodgeImportRow(input: LodgeImportInput): NormalizedLodgeRow {
  const errors: string[] = [];
  const warnings: string[] = [];
  const get = (key: LodgeImportFieldKey) => asText(input[key]);

  const name = get('name').replace(/\s+/g, ' ');
  if (!name) errors.push('Nome da loja é obrigatório');

  // Número
  let code_number: number | null = null;
  const codeRaw = get('code_number');
  if (codeRaw) {
    const parsed = Number(codeRaw.replace(/[^\d]/g, ''));
    if (/\d/.test(codeRaw) && Number.isInteger(parsed) && parsed > 0) code_number = parsed;
    else warnings.push(`Número "${codeRaw}" inválido — ignorado`);
  }

  // UF
  let state = get('state');
  if (state) {
    const asUf = state.toUpperCase();
    const byName = UF_BY_NAME[stripAccents(state.toLowerCase())];
    if (VALID_UFS.has(asUf)) state = asUf;
    else if (byName) state = byName;
    else {
      warnings.push(`UF "${state}" inválida — ignorada`);
      state = '';
    }
  }

  // CEP
  let cep = get('cep');
  if (cep) {
    const digits = cep.replace(/\D/g, '');
    // Excel costuma remover o zero à esquerda de CEPs numéricos (ex.: 4000000 -> 04000-000).
    const padded = digits.length === 7 ? `0${digits}` : digits;
    if (padded.length === 8) cep = `${padded.slice(0, 5)}-${padded.slice(5)}`;
    else {
      warnings.push(`CEP "${cep}" inválido — ignorado`);
      cep = '';
    }
  }

  // Coordenadas (colunas separadas ou numa só)
  let latRaw = get('latitude');
  let lngRaw = get('longitude');
  const combined = get('coordinates');
  if (combined && !latRaw && !lngRaw) {
    const parts = combined.split(/[;,]\s*(?=-?\d)|\s+(?=-?\d)/).map((p) => p.trim()).filter(Boolean);
    if (parts.length === 2) {
      latRaw = parts[0] ?? '';
      lngRaw = parts[1] ?? '';
    } else warnings.push(`Coordenadas "${combined}" em formato inválido — ignoradas`);
  }
  let latitude: number | null = null;
  let longitude: number | null = null;
  if (latRaw || lngRaw) {
    let lat = parseDecimal(latRaw);
    let lng = parseDecimal(lngRaw);
    if (lat == null || lng == null) {
      warnings.push('Latitude e longitude devem ser informadas juntas e numéricas — ignoradas');
    } else {
      // Erro comum: colunas invertidas.
      const inBrazil = (a: number, b: number) =>
        a >= BRAZIL_BOUNDS.latMin && a <= BRAZIL_BOUNDS.latMax && b >= BRAZIL_BOUNDS.lngMin && b <= BRAZIL_BOUNDS.lngMax;
      if (!inBrazil(lat, lng) && inBrazil(lng, lat)) {
        [lat, lng] = [lng, lat];
        warnings.push('Latitude e longitude pareciam invertidas — corrigidas automaticamente');
      }
      if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
        warnings.push(`Coordenadas fora do intervalo válido (${lat}, ${lng}) — ignoradas`);
      } else if (!inBrazil(lat, lng)) {
        warnings.push(`Coordenadas (${lat}, ${lng}) ficam fora do Brasil — confira antes de confirmar`);
        latitude = lat;
        longitude = lng;
      } else {
        latitude = lat;
        longitude = lng;
      }
    }
  }

  // Reunião: aceita dia simples ("quarta") ou regra ("1ª e 3ª quintas-feiras", "segundas e quintas")
  let meeting_day = '';
  let meetings: MeetingRule[] = [];
  let meeting_time = '';
  const dayRaw = get('meeting_day');
  if (dayRaw) {
    const schedule = parseMeetingSchedule(dayRaw);
    if (schedule.meetings.length > 0) {
      meetings = schedule.meetings;
      meeting_day = schedule.meetings[0]!.day;
      meeting_time = schedule.time;
    } else {
      warnings.push(`Dia da reunião "${dayRaw}" não reconhecido — ignorado`);
    }
  }
  const timeRaw = get('meeting_time');
  if (timeRaw) {
    const time = normalizeMeetingTime(timeRaw);
    if (time) meeting_time = time;
    else if (!meeting_time) warnings.push(`Horário "${timeRaw}" inválido (use 20:00 ou 20h30) — ignorado`);
  }
  // Horário sem dia da reunião: não há como cadastrar a reunião, então o horário simplesmente fica em branco.
  if (meeting_time && !meeting_day) meeting_time = '';

  // Data de fundação
  let foundation_date = '';
  const foundationRaw = get('foundation_date');
  if (foundationRaw) {
    const date = normalizeDate(foundationRaw);
    if (date) foundation_date = date;
    else warnings.push(`Data de fundação "${foundationRaw}" inválida (use DD/MM/AAAA) — ignorada`);
  }

  // Contatos
  let email = get('email').toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    warnings.push(`E-mail "${email}" inválido — ignorado`);
    email = '';
  }
  let phone = get('phone');
  if (phone && !normalizePhone(phone)) {
    warnings.push(`Telefone "${phone}" inválido (DDD + número) — ignorado`);
    phone = '';
  }
  let whatsapp = get('whatsapp');
  if (whatsapp && !normalizePhone(whatsapp)) {
    warnings.push(`WhatsApp "${whatsapp}" inválido (DDD + número) — ignorado`);
    whatsapp = '';
  }
  let website = get('website');
  if (website) {
    const url = normalizeUrl(website);
    if (url) website = url;
    else {
      warnings.push(`Site "${website}" inválido — ignorado`);
      website = '';
    }
  }
  let instagram = get('instagram');
  if (instagram) {
    const handle = normalizeInstagram(instagram);
    if (handle) instagram = handle;
    else {
      warnings.push(`Instagram "${instagram}" inválido — ignorado`);
      instagram = '';
    }
  }

  // Imagens
  let logo_url = get('logo_url');
  if (logo_url && !/^https?:\/\/\S+$/i.test(logo_url)) {
    warnings.push('Logo/brasão deve ser uma URL http(s) — ignorado');
    logo_url = '';
  }
  let cover_url = get('cover_url');
  if (cover_url && !/^https?:\/\/\S+$/i.test(cover_url)) {
    warnings.push('Foto da sede deve ser uma URL http(s) — ignorada');
    cover_url = '';
  }

  return {
    errors,
    warnings,
    values: {
      name,
      code_number,
      potency: get('potency').toUpperCase(),
      rite: get('rite'),
      foundation_date,
      worshipful_master_name: get('worshipful_master_name').replace(/\s+/g, ' '),
      meeting_day,
      meetings,
      meeting_time,
      city: get('city'),
      state,
      cep,
      address: get('address'),
      latitude,
      longitude,
      phone,
      whatsapp,
      email,
      website,
      instagram,
      logo_url,
      cover_url,
    },
  };
}

/** Slug sem acentos (ex.: "Esperança da Pátria" -> "esperanca-da-patria"). */
export function slugifyLodge(name: string, codeNumber?: number | null): string {
  const base = stripAccents(name.toLowerCase()).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return codeNumber ? `${base}-${codeNumber}` : base;
}
