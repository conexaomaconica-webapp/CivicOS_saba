'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getCanonicalAdminTenantAction } from '@/app/actions/admin-tenant-context';
import { Upload, ArrowLeft, CheckCircle2, FileSpreadsheet, Loader2, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { extractLodgesFromUrlAction } from '@/app/actions/lodge-url-import';

type ParsedLodgeRow = {
  raw: any;
  status: 'new' | 'update' | 'duplicate' | 'error';
  reason?: string;
  name: string;
  code_number?: number | null;
  potency: string;
  rite?: string;
  city?: string;
  state?: string;
  cep?: string;
  address?: string;
  worshipful_master_name?: string;
  meeting_day?: string;
  meeting_time?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  instagram?: string;
  logo_url?: string;
  latitude?: number | null;
  longitude?: number | null;
};

const PLATFORM_FIELDS = [
  { key: 'name', label: 'Nome da Loja', aliases: ['nome', 'name', 'loja', 'nome_da_loja'] },
  { key: 'code_number', label: 'Número da Loja', aliases: ['numero', 'número', 'code_number', 'numero_da_loja'] },
  { key: 'potency', label: 'Potência', aliases: ['potencia', 'potência', 'potency'] },
  { key: 'rite', label: 'Rito', aliases: ['rito', 'ritual', 'rite'] },
  { key: 'city', label: 'Cidade', aliases: ['cidade', 'city', 'municipio', 'município'] },
  { key: 'state', label: 'Estado / UF', aliases: ['estado', 'state', 'uf'] },
  { key: 'cep', label: 'CEP', aliases: ['cep', 'postal_code'] },
  { key: 'address', label: 'Endereço', aliases: ['endereco', 'endereço', 'address', 'logradouro'] },
  { key: 'worshipful_master_name', label: 'Venerável Mestre', aliases: ['veneravel', 'venerável', 'worshipful_master_name'] },
  { key: 'meeting_day', label: 'Dia da Reunião', aliases: ['dia_reuniao', 'dia_da_reuniao', 'meeting_day'] },
  { key: 'meeting_time', label: 'Horário da Reunião', aliases: ['horario_reuniao', 'horário_reunião', 'meeting_time'] },
  { key: 'phone', label: 'Telefone', aliases: ['telefone', 'phone'] },
  { key: 'whatsapp', label: 'WhatsApp', aliases: ['whatsapp'] },
  { key: 'email', label: 'E-mail', aliases: ['email', 'e-mail'] },
  { key: 'website', label: 'Site', aliases: ['site', 'website', 'url'] },
  { key: 'instagram', label: 'Instagram', aliases: ['instagram'] },
] as const;

type FieldMapping = Record<string, string>;

function normalizedColumn(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

export default function AdminImportarLojasPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedLodgeRow[]>([]);
  const [summary, setSummary] = useState({ newCount: 0, updateCount: 0, dupCount: 0, errCount: 0 });
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourcePotency, setSourcePotency] = useState('');
  const [spreadsheetRows, setSpreadsheetRows] = useState<Record<string, unknown>[]>([]);
  const [spreadsheetColumns, setSpreadsheetColumns] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<FieldMapping>({});

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
    const sampleData = [
      {
        nome: 'Loja A - Esperança da Pátria',
        numero: 999,
        potencia: 'GOB',
        rito: 'REAA',
        dia_reuniao: 'quarta',
        horario_reuniao: '20:00',
        veneravel: 'Irmão Carlos Eduardo',
        estado: 'BA',
        cidade: 'Feira de Santana',
        cep: '44000-000',
        endereco: 'Rua Conselheiro Franco 100',
        telefone: '75999998888',
        whatsapp: '75999998888',
        email: 'contato@lojaa.org.br',
        site: 'https://lojaa.org.br',
        instagram: '@lojaa_oficial',
      },
      {
        nome: 'Loja B - Luz e Ordem',
        numero: 123,
        potencia: 'GOB',
        rito: 'York',
        dia_reuniao: 'quinta',
        horario_reuniao: '19:30',
        veneravel: 'Irmão João Silva',
        estado: 'BA',
        cidade: 'Salvador',
        cep: '40000-000',
        endereco: 'Av. Sete de Setembro 500',
        telefone: '71988887777',
        whatsapp: '71988887777',
        email: 'secretaria@lojab.org.br',
        site: '',
        instagram: '',
      },
      {
        nome: 'Loja C - União e Progresso',
        numero: 456,
        potencia: 'GLBA',
        rito: 'Moderno',
        dia_reuniao: 'terca',
        horario_reuniao: '20:00',
        veneravel: 'Irmão Antônio Ribeiro',
        estado: 'BA',
        cidade: 'Feira de Santana',
        cep: '',
        endereco: '',
        telefone: '',
        whatsapp: '',
        email: '',
        site: '',
        instagram: '',
      },
      {
        nome: '',
        numero: '',
        potencia: 'COMAB',
        rito: '',
        dia_reuniao: '',
        horario_reuniao: '',
        veneravel: '',
        estado: '',
        cidade: '',
        cep: '',
        endereco: '',
        telefone: '',
        whatsapp: '',
        email: '',
        site: '',
        instagram: '',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Lojas');
    XLSX.writeFile(workbook, 'modelo_importacao_lojas.xlsx');
  };

  const analyzeSpreadsheetRows = async () => {
    const selected = (key: string) => fieldMapping[key];
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
      const cell = (row: Record<string, unknown>, key: string) => selected(key) ? String(row[selected(key)!] ?? '').trim() : '';

      for (const rowData of spreadsheetRows) {
        const name = cell(rowData, 'name');
        const codeValue = cell(rowData, 'code_number');
        const parsedCode = codeValue ? Number.parseInt(codeValue, 10) : NaN;
        const code_number = Number.isFinite(parsedCode) ? parsedCode : null;
        const potency = cell(rowData, 'potency') || 'NÃO INFORMADA';
        const city = cell(rowData, 'city');
        if (!name) {
          errC++;
          results.push({ raw: rowData, status: 'error', reason: 'Nome da loja é obrigatório', name: 'Sem nome', potency });
          continue;
        }
        const matchByNumber = existingList.find((item: any) => code_number != null && Number(item.code_number) === code_number && item.potency?.toLowerCase() === potency.toLowerCase());
        const matchByNameCity = existingList.find((item: any) => item.name?.trim().toLowerCase() === name.toLowerCase() && item.potency?.toLowerCase() === potency.toLowerCase() && (item.city || '').trim().toLowerCase() === city.toLowerCase());
        const status: ParsedLodgeRow['status'] = matchByNumber ? 'update' : matchByNameCity ? 'duplicate' : 'new';
        if (status === 'update') updC++; else if (status === 'duplicate') dupC++; else newC++;
        results.push({
          raw: rowData, status, name, code_number, potency,
          reason: status === 'update' ? 'Potência e número já cadastrados' : status === 'duplicate' ? 'Nome e cidade já cadastrados' : 'Nova loja pronta para cadastro',
          rite: cell(rowData, 'rite'), city, state: cell(rowData, 'state'), cep: cell(rowData, 'cep'), address: cell(rowData, 'address'),
          worshipful_master_name: cell(rowData, 'worshipful_master_name'), meeting_day: cell(rowData, 'meeting_day'), meeting_time: cell(rowData, 'meeting_time'),
          phone: cell(rowData, 'phone'), whatsapp: cell(rowData, 'whatsapp'), email: cell(rowData, 'email'), website: cell(rowData, 'website'), instagram: cell(rowData, 'instagram'),
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
        const automaticMapping: FieldMapping = {};
        for (const field of PLATFORM_FIELDS) {
          const aliases = field.aliases.map(normalizedColumn);
          const match = columns.find((column) => aliases.includes(normalizedColumn(column)));
          if (match) automaticMapping[field.key] = match;
        }
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
    try {
      const supabase = createClient();
      const tenantResult = await getCanonicalAdminTenantAction();
      if (!tenantResult.success || !tenantResult.tenantId) throw new Error(tenantResult.error || 'Tenant canônico não identificado.');
      const tid = tenantResult.tenantId;

      for (const row of validRows) {
        const slug = `${row.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${row.code_number || Math.floor(Math.random() * 1000)}`;

        const lodgePayload: any = {
          tenant_id: tid,
          name: row.name,
          code_number: row.code_number,
          potency: row.potency,
          rite: row.rite || null,
          city: row.city || null,
          state: row.state || null,
          cep: row.cep || null,
          address: row.address || null,
          logo_url: row.logo_url || null,
          latitude: row.latitude ?? null,
          longitude: row.longitude ?? null,
          worshipful_master_name: row.worshipful_master_name || null,
          slug,
          is_published: true,
          updated_at: new Date().toISOString(),
        };

        const { data: orgData, error: orgErr } = await (supabase as any)
          .from('organizations')
          .upsert(lodgePayload, { onConflict: 'tenant_id,potency,code_number' })
          .select()
          .single();

        if (orgErr || !orgData) continue;

        // Inserir reunião se informada
        if (row.meeting_day) {
          await (supabase as any).from('organization_meetings').insert({
            tenant_id: tid,
            organization_id: orgData.id,
            meeting_day: row.meeting_day.toLowerCase(),
            meeting_time: row.meeting_time || '20:00',
            is_public: true,
          });
        }

        // Inserir contatos informados
        if (row.phone) {
          await (supabase as any).from('organization_contacts').insert({
            tenant_id: tid,
            organization_id: orgData.id,
            type: 'phone',
            value: row.phone,
            label: 'Telefone Institucional',
            is_public: true,
          });
        }
        if (row.email) {
          await (supabase as any).from('organization_contacts').insert({
            tenant_id: tid,
            organization_id: orgData.id,
            type: 'email',
            value: row.email,
            label: 'E-mail Oficial',
            is_public: true,
          });
        }
      }

      setSuccessMsg(`${validRows.length} lojas importadas com sucesso!`);
      setTimeout(() => {
        router.push('/admin/lojas');
      }, 2000);
    } catch (err) {
      console.error(err);
      alert('Falha durante a gravação no banco de dados.');
    } finally {
      setImporting(false);
    }
  };

  // Download Analysis Report (.xlsx)
  const handleDownloadAnalysisReport = () => {
    if (parsedRows.length === 0) return;
    const reportData = parsedRows.map((r) => ({
      status: r.status.toUpperCase(),
      observacao: r.reason || '',
      nome: r.name,
      numero: r.code_number || '',
      potencia: r.potency,
      rito: r.rite || '',
      cidade: r.city || '',
      estado: r.state || '',
      veneravel: r.worshipful_master_name || '',
      dia_reuniao: r.meeting_day || '',
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
          <p className="text-xs text-stone-500 mt-1">Colunas suportadas: nome, numero, potencia, rito, dia_reuniao, horario_reuniao, veneravel, cidade, estado</p>
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
            {PLATFORM_FIELDS.map((field) => (
              <div key={field.key} className="grid grid-cols-[minmax(130px,1fr)_minmax(160px,1.4fr)] items-center gap-3 rounded-xl border border-stone-200 bg-stone-50 p-3">
                <label htmlFor={`mapping-${field.key}`} className="text-xs font-bold text-stone-800">{field.label}{field.key === 'name' ? ' *' : ''}</label>
                <select id={`mapping-${field.key}`} value={fieldMapping[field.key] || ''} onChange={(e) => setFieldMapping((current) => ({ ...current, [field.key]: e.target.value }))} className="w-full rounded-lg border border-stone-300 bg-white px-2.5 py-2 text-xs text-stone-900">
                  <option value="">Não importar</option>
                  {spreadsheetColumns.map((column) => <option key={column} value={column}>{column}</option>)}
                </select>
              </div>
            ))}
          </div>
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
            <table className="min-w-[640px] w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-100 border-b text-stone-700 font-bold uppercase">
                  <th className="p-3">Status</th>
                  <th className="p-3">Loja / Número</th>
                  <th className="p-3">Potência</th>
                  <th className="p-3">Oriente</th>
                  <th className="p-3">Venerável</th>
                  <th className="p-3">Análise / Observação</th>
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
                    <td className="p-3 text-stone-500 text-[11px] font-medium">{r.reason || 'Pronta para importação'}</td>
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
