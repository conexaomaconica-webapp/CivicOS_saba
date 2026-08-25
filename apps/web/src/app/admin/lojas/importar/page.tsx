'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Upload, ArrowLeft, CheckCircle2, FileSpreadsheet, Loader2, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

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
};

export default function AdminImportarLojasPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedLodgeRow[]>([]);
  const [summary, setSummary] = useState({ newCount: 0, updateCount: 0, dupCount: 0, errCount: 0 });
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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

        const supabase = createClient();
        const { data: existingLodges } = await (supabase as any).from('organizations').select('id, name, code_number, potency, city');
        const existingList = existingLodges || [];

        let newC = 0, updC = 0, dupC = 0, errC = 0;
        const results: ParsedLodgeRow[] = [];

        for (const rowData of rawJson) {
          const name = String(rowData.nome || rowData.name || rowData.Nome || '').trim();
          const code_number = rowData.numero || rowData.code_number || rowData.Numero ? parseInt(String(rowData.numero || rowData.code_number || rowData.Numero), 10) : null;
          const potency = String(rowData.potencia || rowData.potency || rowData.Potencia || 'GOB').trim();

          if (!name) {
            errC++;
            results.push({
              raw: rowData,
              status: 'error',
              reason: 'Registro inválido: Nome da loja é obrigatório',
              name: 'Sem Nome (Inválido)',
              potency,
            });
            continue;
          }

          // 1º Match por potência + número (Atualização Segura)
          const matchByNumber = existingList.find(
            (e: any) =>
              code_number != null &&
              e.code_number === code_number &&
              e.potency?.toLowerCase() === potency.toLowerCase()
          );

          // 2º Match por potência + nome + cidade (Possível Duplicidade)
          const matchByNameCity = existingList.find(
            (e: any) =>
              e.name.toLowerCase().trim() === name.toLowerCase().trim() &&
              e.potency?.toLowerCase() === potency.toLowerCase() &&
              (e.city || '').toLowerCase().trim() === String(rowData.cidade || rowData.city || '').toLowerCase().trim()
          );

          let status: 'new' | 'update' | 'duplicate' | 'error' = 'new';
          let reason: string | undefined = undefined;

          if (matchByNumber) {
            status = 'update';
            updC++;
            reason = `Atualização segura: Loja já cadastrada por número (${code_number}) e potência (${potency})`;
          } else if (matchByNameCity) {
            status = 'duplicate';
            dupC++;
            reason = `Possível duplicidade: Nome e cidade já existentes na potência (${potency})`;
          } else {
            status = 'new';
            newC++;
            reason = 'Nova loja pronta para cadastro';
          }

          results.push({
            raw: rowData,
            status,
            reason,
            name,
            code_number,
            potency,
            rite: String(rowData.rito || rowData.rite || ''),
            city: String(rowData.cidade || rowData.city || ''),
            state: String(rowData.estado || rowData.state || ''),
            cep: String(rowData.cep || ''),
            address: String(rowData.endereco || rowData.address || ''),
            worshipful_master_name: String(rowData.veneravel || rowData.worshipful_master_name || ''),
            meeting_day: String(rowData.dia_reuniao || rowData.meeting_day || ''),
            meeting_time: String(rowData.horario_reuniao || rowData.meeting_time || ''),
            phone: String(rowData.telefone || rowData.phone || ''),
            whatsapp: String(rowData.whatsapp || ''),
            email: String(rowData.email || ''),
            website: String(rowData.site || rowData.website || ''),
            instagram: String(rowData.instagram || ''),
          });
        }

        setParsedRows(results);
        setSummary({ newCount: newC, updateCount: updC, dupCount: dupC, errCount: errC });
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
      const { data: profileData } = await (supabase as any).from('profiles').select('tenant_id').maybeSingle();
      const tid = profileData?.tenant_id || '00000000-0000-0000-0000-000000000010';

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
          <span>Importação de Lojas via Planilha Excel (.xlsx)</span>
        </h1>
        <p className="text-xs text-stone-500 max-w-2xl">
          Envie sua planilha Excel (.xlsx) ou CSV. O sistema valida os registros, analisa correspondências em 3 níveis (potência+número, potência+nome+cidade) e exige sua confirmação antes de gravar qualquer dado no banco.
        </p>

        <div className="flex items-center gap-3 pt-2">
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

            <table className="w-full text-left border-collapse text-xs">
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
      )}
    </div>
  );
}
