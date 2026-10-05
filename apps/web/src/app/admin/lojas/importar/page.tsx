'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getCanonicalAdminTenantAction } from '@/app/actions/admin-tenant-context';
import { Upload, ArrowLeft, CheckCircle2, FileSpreadsheet, Loader2, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { extractLodgesFromUrlAction } from '@/app/actions/lodge-url-import';
import {
  LODGE_IMPORT_FIELDS,
  normalizeLodgeImportRow,
  suggestColumnMapping,
  slugifyLodge,
  formatWeeksText,
  type LodgeImportFieldKey,
  type LodgeImportInput,
} from '@/lib/admin/lodge-import-validation';

type ParsedLodgeRow = {
  raw: any;
  status: 'new' | 'update' | 'duplicate' | 'error';
  reason?: string;
  /** Valores descartados por falha de validação (a linha continua importável). */
  warnings?: string[];
  name: string;
  code_number?: number | null;
  potency: string;
  rite?: string;
  foundation_date?: string;
  city?: string;
  state?: string;
  cep?: string;
  address?: string;
  worshipful_master_name?: string;
  meeting_day?: string;
  meetings?: Array<{ day: string; weeks: number[] }>;
  meeting_time?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  instagram?: string;
  logo_url?: string;
  cover_url?: string;
  latitude?: number | null;
  longitude?: number | null;
};

type FieldMapping = Partial<Record<LodgeImportFieldKey, string>>;

export default function AdminImportarLojasPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedLodgeRow[]>([]);
  const [summary, setSummary] = useState({ newCount: 0, updateCount: 0, dupCount: 0, errCount: 0 });
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [importFailures, setImportFailures] = useState<string[]>([]);
  const [importProgress, setImportProgress] = useState<{ done: number; total: number; current: string } | null>(null);
  // Como tratar célula vazia em loja JÁ cadastrada: manter o dado atual ou apagá-lo.
  const [emptyCellsMode, setEmptyCellsMode] = useState<'keep' | 'clear'>('keep');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourcePotency, setSourcePotency] = useState('');
  const [spreadsheetRows, setSpreadsheetRows] = useState<Record<string, unknown>[]>([]);
  const [spreadsheetColumns, setSpreadsheetColumns] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<FieldMapping>({});

  const mappedColumns = new Set(Object.values(fieldMapping).filter(Boolean) as string[]);
  const unmappedColumns = spreadsheetColumns.filter((column) => !mappedColumns.has(column));
  const warningCount = parsedRows.reduce((total, row) => total + (row.warnings?.length || 0), 0);

  const handleLoadUrl = async () => {
    setLoading(true);
    setSuccessMsg(null);
    setSpreadsheetRows([]);
    setSpreadsheetColumns([]);
    setFieldMapping({});
    try {
      const result = await extractLodgesFromUrlAction({ url: sourceUrl, potency: sourcePotency });
      if (!result.success || !result.data) {
        alert(result.error || 'Não foi possível extrair os cadastros desse endereço.');
        return;
      }
      const supabase = createClient();
      const { data: existing } = await (supabase as any).from('organizations').select('name, code_number, potency, city');
      let newCount = 0;
      let updateCount = 0;
      let dupCount = 0;
      const rows: ParsedLodgeRow[] = result.data.map((row) => {
        const byNumber = (existing || []).find((item: any) => item.potency?.toLowerCase() === row.potency.toLowerCase() && Number(item.code_number) === row.code_number);
        const byNameCity = (existing || []).find((item: any) => item.name?.trim().toLowerCase() === row.name.toLowerCase() && item.city?.trim().toLowerCase() === row.city.toLowerCase());
        const status = byNumber ? 'update' : byNameCity ? 'duplicate' : 'new';
        if (status === 'update') updateCount++; else if (status === 'duplicate') dupCount++; else newCount++;
        return {
          raw: row,
          ...row,
          status,
          reason: status === 'update' ? 'Potência e número cadastral já existentes: atualizar' : status === 'duplicate' ? 'Nome e cidade já cadastrados: revisar duplicidade' : 'Nova loja pronta para cadastro',
        };
      });
      setParsedRows(rows);
      setSummary({ newCount, updateCount, dupCount, errCount: 0 });
    } finally {
      setLoading(false);
    }
  };

  // Download Sample Excel (.xlsx)
  const handleDownloadSampleXlsx = () => {
    const base = {
      nome: '', numero: '', potencia: '', rito: '', data_fundacao: '', veneravel: '', dia_reuniao: '', horario_reuniao: '',
      cidade: '', estado: '', cep: '', endereco: '', latitude: '', longitude: '',
      telefone: '', whatsapp: '', email: '', site: '', instagram: '', logo_url: '', foto_sede_url: '',
    };
    const sampleData = [
      {
        ...base, nome: 'Loja A - Esperança da Pátria', numero: 999, potencia: 'GOB', rito: 'REAA', data_fundacao: '15/03/1985',
        veneravel: 'Carlos Eduardo Souza', dia_reuniao: 'quarta', horario_reuniao: '20:00', cidade: 'Feira de Santana', estado: 'BA',
        cep: '44000-000', endereco: 'Rua Conselheiro Franco, 100, Centro', latitude: -12.2664, longitude: -38.9663,
        telefone: '(75) 99999-8888', whatsapp: '(75) 99999-8888', email: 'contato@lojaa.org.br', site: 'https://lojaa.org.br', instagram: '@lojaa_oficial',
      },
      {
        ...base, nome: 'Loja B - Luz e Ordem', numero: 123, potencia: 'GOB', rito: 'York', veneravel: 'João Silva',
        dia_reuniao: 'quinta', horario_reuniao: '19h30', cidade: 'Salvador', estado: 'BA', cep: '40000-000',
        endereco: 'Av. Sete de Setembro, 500, Centro', latitude: '-12,9714', longitude: '-38,5014',
        telefone: '(71) 98888-7777', email: 'secretaria@lojab.org.br',
      },
      { ...base, nome: 'Loja C - União e Progresso', numero: 456, potencia: 'GLBA', rito: 'Moderno', dia_reuniao: 'terça', horario_reuniao: '20:00', cidade: 'Feira de Santana', estado: 'BA' },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Lojas');
    XLSX.writeFile(workbook, 'modelo_importacao_lojas.xlsx');
  };

  const analyzeSpreadsheetRows = async () => {
    const selected = (key: LodgeImportFieldKey) => fieldMapping[key];
    if (!selected('name')) {
      alert('Associe pelo menos o campo obrigatório "Nome da Loja".');
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: existingLodges } = await (supabase as any).from('organizations').select('id, name, code_number, potency, city');
      const existingList = existingLodges || [];
      let newC = 0, updC = 0, dupC = 0, errC = 0;
      const results: ParsedLodgeRow[] = [];
      const seenInFile = new Set<string>();

      for (const rowData of spreadsheetRows) {
        const input: LodgeImportInput = {};
        for (const field of LODGE_IMPORT_FIELDS) {
          const column = selected(field.key);
          if (column) input[field.key] = rowData[column];
        }
        const { values, errors, warnings } = normalizeLodgeImportRow(input);
        const { name, code_number, potency, city } = values;

        if (errors.length > 0) {
          errC++;
          results.push({ raw: rowData, status: 'error', reason: errors.join('; '), warnings, ...values, name: name || 'Sem nome' });
          continue;
        }

        // Mesma loja repetida dentro da própria planilha.
        const fileKey = code_number != null ? `${potency.toLowerCase()}#${code_number}` : `${potency.toLowerCase()}|${name.toLowerCase()}|${city.toLowerCase()}`;
        if (seenInFile.has(fileKey)) {
          dupC++;
          results.push({ raw: rowData, status: 'duplicate', reason: 'Repetida na própria planilha', warnings, ...values });
          continue;
        }
        seenInFile.add(fileKey);

        const matchByNumber = existingList.find((item: any) => code_number != null && Number(item.code_number) === code_number && item.potency?.toLowerCase() === potency.toLowerCase());
        const matchByNameCity = existingList.find((item: any) => item.name?.trim().toLowerCase() === name.toLowerCase() && item.potency?.toLowerCase() === potency.toLowerCase() && (item.city || '').trim().toLowerCase() === city.toLowerCase());
        const status: ParsedLodgeRow['status'] = matchByNumber ? 'update' : matchByNameCity ? 'duplicate' : 'new';
        if (status === 'update') updC++; else if (status === 'duplicate') dupC++; else newC++;
        results.push({
          raw: rowData, status, warnings, ...values,
          reason: status === 'update' ? (emptyCellsMode === 'clear' ? 'Potência e número já cadastrados: células vazias APAGARÃO o dado atual' : 'Potência e número já cadastrados: só os campos preenchidos serão atualizados') : status === 'duplicate' ? 'Nome e cidade já cadastrados: revisar duplicidade' : 'Nova loja pronta para cadastro',
        });
      }
      setParsedRows(results);
      setSummary({ newCount: newC, updateCount: updC, dupCount: dupC, errCount: errC });
    } finally {
      setLoading(false);
    }
  };

  // Process Native Excel (.xlsx / .xls / .csv) File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          alert('O arquivo selecionado não contém planilhas válidas.');
          setLoading(false);
          return;
        }

        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet!, { defval: '' });

        if (rawJson.length === 0) {
          alert('A planilha está vazia.');
          setLoading(false);
          return;
        }

        const columns = Array.from(new Set(rawJson.flatMap((row) => Object.keys(row))));
        const automaticMapping: FieldMapping = suggestColumnMapping(columns) as FieldMapping;
        setSpreadsheetRows(rawJson);
        setSpreadsheetColumns(columns);
        setFieldMapping(automaticMapping);
        setParsedRows([]);
        setSummary({ newCount: 0, updateCount: 0, dupCount: 0, errCount: 0 });
      } catch (err) {
        console.error(err);
        alert('Erro ao processar planilha Excel. Verifique o formato do arquivo.');
      } finally {
        setLoading(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Confirm and Save Verified Rows
  const handleConfirmImport = async () => {
    const validRows = parsedRows.filter((r) => r.status === 'new' || r.status === 'update');
    if (validRows.length === 0) {
      alert('Nenhuma loja válida para importar.');
      return;
    }

    setImporting(true);
    setImportFailures([]);
    setImportProgress({ done: 0, total: validRows.length, current: '' });
    try {
      const supabase = createClient();
      const tenantResult = await getCanonicalAdminTenantAction();
      if (!tenantResult.success || !tenantResult.tenantId) throw new Error(tenantResult.error || 'Tenant canônico não identificado.');
      const tid = tenantResult.tenantId;

      const failures: string[] = [];
      let imported = 0;

      for (const [rowIndex, row] of validRows.entries()) {
        setImportProgress({ done: rowIndex, total: validRows.length, current: row.name });
        // Só envia o que veio preenchido: em atualização, coluna vazia/não mapeada NÃO apaga o dado já cadastrado.
        const lodgePayload: Record<string, unknown> = {
          tenant_id: tid,
          name: row.name,
          code_number: row.code_number ?? null,
          potency: row.potency,
          slug: slugifyLodge(row.name, row.code_number),
          is_published: true,
          updated_at: new Date().toISOString(),
        };
        const optional: Record<string, unknown> = {
          rite: row.rite,
          foundation_date: row.foundation_date,
          city: row.city,
          state: row.state,
          cep: row.cep,
          address: row.address,
          logo_url: row.logo_url,
          cover_url: row.cover_url,
          worshipful_master_name: row.worshipful_master_name,
          latitude: row.latitude,
          longitude: row.longitude,
        };
        // Campo de planilha (mapeado) -> coluna(s) da loja, para saber o que pode ser apagado.
        const mappedColumnsByField: Record<string, LodgeImportFieldKey[]> = {
          rite: ['rite'], foundation_date: ['foundation_date'], city: ['city'], state: ['state'], cep: ['cep'],
          address: ['address'], logo_url: ['logo_url'], cover_url: ['cover_url'],
          worshipful_master_name: ['worshipful_master_name'],
          latitude: ['latitude', 'coordinates'], longitude: ['longitude', 'coordinates'],
        };
        const clearEmpty = row.status === 'update' && emptyCellsMode === 'clear';
        for (const [key, value] of Object.entries(optional)) {
          if (value !== undefined && value !== null && value !== '') {
            lodgePayload[key] = value;
          } else if (clearEmpty && (mappedColumnsByField[key] || []).some((field) => Boolean(fieldMapping[field]))) {
            // Só apaga o que está numa coluna associada; colunas fora da importação nunca são tocadas.
            lodgePayload[key] = null;
          }
        }

        const { data: orgData, error: orgErr } = await (supabase as any)
          .from('organizations')
          .upsert(lodgePayload, { onConflict: 'tenant_id,potency,code_number' })
          .select()
          .single();

        if (orgErr || !orgData) {
          failures.push(`${row.name}: ${orgErr?.message || 'falha ao gravar a loja'}`);
          continue;
        }
        imported++;

        // Reuniões: uma linha por dia da semana; a regra de ocorrência ("1ª e 3ª") vai no rótulo
        // ("1ª e 3ª do mês"). Sem regra, rótulo "Sessão Ordinária". Não duplica o que já existe.
        const meetingRules = row.meetings && row.meetings.length > 0
          ? row.meetings
          : row.meeting_day ? [{ day: row.meeting_day, weeks: [] as number[] }] : [];
        if (meetingRules.length > 0) {
          const time = row.meeting_time || '20:00';

          // Em loja já cadastrada, a planilha passa a ser a fonte das reuniões que o próprio importador criou
          // (rótulo "Sessão Ordinária" ou "… do mês"); reuniões cadastradas à mão com outro rótulo são preservadas.
          if (row.status === 'update') {
            await (supabase as any)
              .from('organization_meetings')
              .delete()
              .eq('organization_id', orgData.id)
              .or('label.eq.Sessão Ordinária,label.ilike.%do mês');
          }

          for (const rule of meetingRules) {
            const label = rule.weeks.length > 0 ? `${formatWeeksText(rule.weeks)} do mês` : 'Sessão Ordinária';
            const { data: existingMeeting } = await (supabase as any)
              .from('organization_meetings')
              .select('id')
              .eq('organization_id', orgData.id)
              .eq('meeting_day', rule.day)
              .eq('meeting_time', time)
              .eq('label', label)
              .maybeSingle();
            if (existingMeeting) continue;
            const { error: meetingErr } = await (supabase as any).from('organization_meetings').insert({
              tenant_id: tid,
              organization_id: orgData.id,
              meeting_day: rule.day,
              meeting_time: time,
              label,
              is_public: true,
            });
            if (meetingErr) failures.push(`${row.name}: reunião de ${rule.day} não gravada (${meetingErr.message})`);
          }
        }

        // Contatos: substitui apenas os tipos informados, sem duplicar a cada importação.
        const contacts = [
          { type: 'phone', value: row.phone, label: 'Telefone Institucional' },
          { type: 'whatsapp', value: row.whatsapp, label: 'WhatsApp Secretaria' },
          { type: 'email', value: row.email, label: 'E-mail Oficial' },
          { type: 'website', value: row.website, label: 'Website Oficial' },
          { type: 'instagram', value: row.instagram, label: 'Instagram da Loja' },
        ].filter((c) => c.value);
        if (clearEmpty) {
          const emptyMappedTypes = [
            ['phone', row.phone, 'phone'], ['whatsapp', row.whatsapp, 'whatsapp'], ['email', row.email, 'email'],
            ['website', row.website, 'website'], ['instagram', row.instagram, 'instagram'],
          ].filter(([, value, field]) => !value && Boolean(fieldMapping[field as LodgeImportFieldKey])).map(([type]) => type as string);
          if (emptyMappedTypes.length > 0) {
            await (supabase as any).from('organization_contacts').delete().eq('organization_id', orgData.id).in('type', emptyMappedTypes);
          }
        }
        if (contacts.length > 0) {
          await (supabase as any)
            .from('organization_contacts')
            .delete()
            .eq('organization_id', orgData.id)
            .in('type', contacts.map((c) => c.type));
          const { error: contactErr } = await (supabase as any).from('organization_contacts').insert(
            contacts.map((c) => ({ tenant_id: tid, organization_id: orgData.id, type: c.type, value: c.value, label: c.label, is_public: true }))
          );
          if (contactErr) failures.push(`${row.name}: contatos não gravados (${contactErr.message})`);
        }
      }

      setImportProgress({ done: validRows.length, total: validRows.length, current: '' });
      setImportFailures(failures);
      if (imported > 0) {
        setSuccessMsg(`${imported} de ${validRows.length} lojas importadas${failures.length ? ` — ${failures.length} aviso(s) abaixo` : ' com sucesso!'}`);
      }
      if (failures.length === 0 && imported > 0) {
        setTimeout(() => {
          router.push('/admin/lojas');
        }, 2000);
      } else if (imported === 0) {
        alert('Nenhuma loja foi gravada. Veja os detalhes na página.');
      }
    } catch (err) {
      console.error(err);
      alert('Falha durante a gravação no banco de dados.');
    } finally {
      setImporting(false);
      setTimeout(() => setImportProgress(null), 1500);
    }
  };

  // Download Analysis Report (.xlsx)
  const handleDownloadAnalysisReport = () => {
    if (parsedRows.length === 0) return;
    const reportData = parsedRows.map((r) => ({
      status: r.status.toUpperCase(),
      observacao: r.reason || '',
      avisos: (r.warnings || []).join(' | '),
      nome: r.name,
      numero: r.code_number || '',
      potencia: r.potency,
      rito: r.rite || '',
      veneravel: r.worshipful_master_name || '',
      dia_reuniao: r.meetings && r.meetings.length > 0 ? r.meetings.map((m) => `${m.weeks.length ? `${formatWeeksText(m.weeks)} ` : ''}${m.day}`).join(' + ') : r.meeting_day || '',
      horario_reuniao: r.meeting_time || '',
      cidade: r.city || '',
      estado: r.state || '',
      cep: r.cep || '',
      endereco: r.address || '',
      latitude: r.latitude ?? '',
      longitude: r.longitude ?? '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(reportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Analise_Importacao');
    XLSX.writeFile(workbook, `relatorio_analise_importacao_${Date.now()}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <Link href="/admin/lojas" className="flex items-center gap-1 text-xs font-bold text-stone-600 hover:text-amber-900">
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Lojas Maçônicas</span>
        </Link>
      </div>

      <div className="bg-white p-6 rounded-2xl border shadow-2xs space-y-4">
        <h1 className="font-serif font-bold text-2xl text-gray-900 flex items-center gap-2">
          <FileSpreadsheet className="w-6 h-6 text-amber-900" />
          <span>Importação de Lojas por Link ou Planilha</span>
        </h1>
        <p className="text-xs text-stone-500 max-w-2xl">
          Informe um link público com dados estruturados ou envie uma planilha. O sistema analisa correspondências por potência, número, nome e cidade e exige confirmação antes de gravar no banco.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_auto] gap-3 pt-2">
          <input
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://site-da-potencia.org.br/lojas"
            className="rounded-xl border border-stone-300 px-3 py-2 text-xs"
          />
          <input
            type="text"
            value={sourcePotency}
            onChange={(e) => setSourcePotency(e.target.value)}
            placeholder="Potência (ex.: GOBA)"
            className="rounded-xl border border-stone-300 px-3 py-2 text-xs uppercase"
          />
          <button
            onClick={() => void handleLoadUrl()}
            disabled={loading || !sourceUrl.trim() || !sourcePotency.trim()}
            className="text-xs font-bold text-white bg-[#3b0b14] hover:bg-[#5d1523] disabled:opacity-50 px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span>Extrair dados do link</span>
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadSampleXlsx}
            className="text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Baixar Planilha Modelo (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Area de Upload */}
      <div className="bg-white p-8 rounded-2xl border border-dashed border-stone-300 text-center space-y-4 shadow-2xs">
        <Upload className="w-10 h-10 text-amber-900 mx-auto animate-pulse" />
        <div>
          <h3 className="font-serif font-bold text-gray-900 text-base">Selecione o arquivo Excel (.xlsx, .xls) ou CSV</h3>
          <p className="text-xs text-stone-500 mt-1">Colunas suportadas: nome, número, potência, rito, data de fundação, venerável, dia e horário da reunião, cidade, UF, CEP, endereço, latitude, longitude, telefone, WhatsApp, e-mail, site, Instagram, logo e foto da sede</p>
        </div>

        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileUpload}
          className="hidden"
          id="excel-file-input"
        />
        <label
          htmlFor="excel-file-input"
          className="inline-block bg-[#3b0b14] text-white px-6 py-2.5 rounded-xl font-bold text-xs hover:bg-[#5d1523] cursor-pointer transition-colors shadow-2xs"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> : null}
          Selecionar Planilha Excel (.xlsx)
        </label>
      </div>

      {/* Prévia da Análise */}
      {spreadsheetRows.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-2xs space-y-5">
          <div>
            <h2 className="font-serif font-bold text-lg text-gray-900">Conciliação das colunas</h2>
            <p className="text-xs text-stone-500 mt-1">Relacione os campos da plataforma com as colunas encontradas na planilha ({spreadsheetRows.length} registros). O nome da loja é obrigatório.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {LODGE_IMPORT_FIELDS.map((field) => (
              <div key={field.key} className="grid grid-cols-[minmax(130px,1fr)_minmax(160px,1.4fr)] items-center gap-3 rounded-xl border border-stone-200 bg-stone-50 p-3">
                <label htmlFor={`mapping-${field.key}`} className="text-xs font-bold text-stone-800">{field.label}{field.key === 'name' ? ' *' : ''}</label>
                <select id={`mapping-${field.key}`} value={fieldMapping[field.key] || ''} onChange={(e) => setFieldMapping((current) => ({ ...current, [field.key]: e.target.value || undefined }))} className="w-full rounded-lg border border-stone-300 bg-white px-2.5 py-2 text-xs text-stone-900">
                  <option value="">Não importar</option>
                  {spreadsheetColumns.map((column) => <option key={column} value={column}>{column}</option>)}
                </select>
              </div>
            ))}
          </div>
          {unmappedColumns.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <strong>{unmappedColumns.length} coluna(s) da planilha sem campo associado e que NÃO serão importadas:</strong>{' '}
              {unmappedColumns.join(', ')}.
              <span className="block mt-1 text-amber-800">Associe-as acima, se corresponderem a algum campo da plataforma.</span>
            </div>
          )}
          <fieldset className="rounded-xl border border-stone-200 bg-stone-50 p-3 space-y-2">
            <legend className="px-1 text-xs font-bold text-stone-800">Células vazias em lojas que já estão cadastradas</legend>
            <label className="flex items-start gap-2 text-xs text-stone-700 cursor-pointer">
              <input type="radio" name="empty-cells-mode" checked={emptyCellsMode === 'keep'} onChange={() => setEmptyCellsMode('keep')} className="mt-0.5" />
              <span><strong>Manter o dado atual</strong> (recomendado): só os campos preenchidos na planilha são atualizados.</span>
            </label>
            <label className="flex items-start gap-2 text-xs text-stone-700 cursor-pointer">
              <input type="radio" name="empty-cells-mode" checked={emptyCellsMode === 'clear'} onChange={() => setEmptyCellsMode('clear')} className="mt-0.5" />
              <span><strong>Apagar o dado atual</strong> quando a célula estiver vazia. Vale só para as colunas associadas acima; lojas novas não são afetadas.</span>
            </label>
            <p className="text-[11px] text-stone-500">
              Para corrigir um campo que ficou de fora, associe a coluna acima e importe de novo (a loja é reconhecida por potência + número), ou edite a loja em Lojas Maçônicas → Editar.
            </p>
          </fieldset>
          <div className="flex justify-end">
            <button type="button" onClick={() => void analyzeSpreadsheetRows()} disabled={loading || !fieldMapping.name} className="inline-flex items-center gap-2 rounded-xl bg-[#3b0b14] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#5d1523] disabled:opacity-50">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Confirmar conciliação e analisar
            </button>
          </div>
        </div>
      )}

      {parsedRows.length > 0 && (
        <div className="space-y-6">
          {/* Card Resumo */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-center">
              <span className="text-2xl font-bold text-emerald-800">{summary.newCount}</span>
              <p className="text-xs font-bold text-emerald-700 mt-0.5">Novas Lojas</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-center">
              <span className="text-2xl font-bold text-blue-800">{summary.updateCount}</span>
              <p className="text-xs font-bold text-blue-700 mt-0.5">Atualizações Seguras</p>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-center">
              <span className="text-2xl font-bold text-amber-800">{summary.dupCount}</span>
              <p className="text-xs font-bold text-amber-700 mt-0.5">Possíveis Duplicidades</p>
            </div>

            <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-center">
              <span className="text-2xl font-bold text-red-800">{summary.errCount}</span>
              <p className="text-xs font-bold text-red-700 mt-0.5">Registros com Erro</p>
            </div>
          </div>

          {/* Mensagem de Sucesso */}
          {successMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-bold text-xs flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {importProgress && (
            <div className="p-4 bg-white border border-stone-200 rounded-xl space-y-2" role="status" aria-live="polite">
              <div className="flex items-center justify-between gap-3 text-xs font-bold text-stone-800">
                <span className="flex items-center gap-2">
                  {importProgress.done < importProgress.total ? <Loader2 className="w-4 h-4 animate-spin text-amber-900" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                  {importProgress.done < importProgress.total ? 'Importando lojas…' : 'Importação concluída'}
                </span>
                <span className="tabular-nums">
                  {importProgress.done} de {importProgress.total} ({importProgress.total > 0 ? Math.round((importProgress.done / importProgress.total) * 100) : 0}%)
                </span>
              </div>
              <div
                className="h-2.5 w-full rounded-full bg-stone-200 overflow-hidden"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={importProgress.total}
                aria-valuenow={importProgress.done}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#3b0b14] to-[#C9A227] transition-[width] duration-300"
                  style={{ width: `${importProgress.total > 0 ? (importProgress.done / importProgress.total) * 100 : 0}%` }}
                />
              </div>
              {importProgress.current && importProgress.done < importProgress.total && (
                <p className="text-[11px] text-stone-500 truncate">Gravando: {importProgress.current}</p>
              )}
            </div>
          )}

          {importFailures.length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs space-y-1">
              <strong>Itens que não foram gravados:</strong>
              <ul className="list-disc pl-5">
                {importFailures.map((failure, index) => <li key={index}>{failure}</li>)}
              </ul>
            </div>
          )}

          {warningCount > 0 && (
            <div className="p-3 bg-stone-50 border border-stone-200 text-stone-700 rounded-xl text-xs">
              <strong>{warningCount} valor(es) inválido(s) ficarão em branco</strong>; a loja é importada normalmente, sem eles. Os detalhes estão na coluna de análise, caso queira corrigir a planilha.
            </div>
          )}

          {/* Tabela da Prévia */}
          <div className="bg-white border rounded-2xl overflow-hidden shadow-2xs">
            <div className="p-4 bg-stone-50 border-b flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-serif font-bold text-sm text-gray-900">Prévia da Análise dos Registros ({parsedRows.length} linhas)</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadAnalysisReport}
                  className="bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4 text-stone-600" />
                  <span>Baixar Relatório de Análise (.xlsx)</span>
                </button>

                <button
                  onClick={handleConfirmImport}
                  disabled={importing || (summary.newCount === 0 && summary.updateCount === 0)}
                  className="bg-[#3b0b14] text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-[#5d1523] disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-2xs"
                >
                  {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Confirmar Importação de {summary.newCount + summary.updateCount} Lojas</span>
                </button>
              </div>
            </div>

          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-100 border-b text-stone-700 font-bold uppercase">
                  <th className="p-3">Status</th>
                  <th className="p-3">Loja / Número</th>
                  <th className="p-3">Potência</th>
                  <th className="p-3">Oriente</th>
                  <th className="p-3">Venerável</th>
                  <th className="p-3">Reunião</th>
                  <th className="p-3">Coordenadas</th>
                  <th className="p-3">Análise / Avisos</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {parsedRows.map((r, idx) => (
                  <tr key={idx} className="hover:bg-stone-50">
                    <td className="p-3">
                      {r.status === 'new' && (
                        <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold text-[10px]">Nova</span>
                      )}
                      {r.status === 'update' && (
                        <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold text-[10px]">Atualizar</span>
                      )}
                      {r.status === 'duplicate' && (
                        <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold text-[10px]">Duplicidade</span>
                      )}
                      {r.status === 'error' && (
                        <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded font-bold text-[10px]">Erro</span>
                      )}
                    </td>
                    <td className="p-3 font-bold text-gray-900">{r.name} {r.code_number ? `nº ${r.code_number}` : ''}</td>
                    <td className="p-3 text-stone-700 font-semibold">{r.potency}</td>
                    <td className="p-3 text-stone-600">{r.city}{r.state ? `, ${r.state}` : ''}</td>
                    <td className="p-3 text-stone-600">{r.worshipful_master_name || '-'}</td>
                    <td className="p-3 text-stone-600 whitespace-nowrap">{r.meetings && r.meetings.length > 0 ? `${r.meetings.map((m) => `${m.weeks.length ? `${formatWeeksText(m.weeks)} ` : ''}${m.day}`).join(' + ')}${r.meeting_time ? ` ${r.meeting_time}` : ''}` : r.meeting_day ? `${r.meeting_day}${r.meeting_time ? ` ${r.meeting_time}` : ''}` : '-'}</td>
                    <td className="p-3 text-stone-600 whitespace-nowrap">{r.latitude != null && r.longitude != null ? `${r.latitude.toFixed(5)}, ${r.longitude.toFixed(5)}` : '-'}</td>
                    <td className="p-3 text-stone-500 text-[11px] font-medium">
                      <span>{r.reason || 'Pronta para importação'}</span>
                      {(r.warnings || []).map((warning, i) => (
                        <span key={i} className="block text-stone-400">em branco: {warning}</span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
