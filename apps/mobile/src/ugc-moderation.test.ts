import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MobileConnectionFeedItem } from './guide-data';
import {
  blockMuralAuthor,
  buildConnectionAuthorKey,
  clearLocalModerationBlocks,
  filterModeratedConnections,
  getBlockedAuthorKeys,
  getBlockedConnectionIds,
  getReportedConnectionIds,
  hasAcceptedUgcTerms,
  setAcceptedUgcTerms,
  setActiveModerationUserScope,
  submitConnectionModerationReport,
} from './ugc-moderation';

const sampleFeed: MobileConnectionFeedItem[] = [
  {
    id: 'conn-1',
    connection_type: 'compra',
    item_description: 'Óculos de grau',
    message: 'Excelente atendimento fraterno.',
    photo_url: null,
    member_first_name: 'Carlos',
    business_name: 'Ótica Visão',
    business_slug: 'otica-visao',
    like_count: 3,
    liked_by_me: false,
  },
  {
    id: 'conn-2',
    connection_type: 'servico',
    item_description: 'Fisioterapia',
    message: 'Muito profissional.',
    photo_url: null,
    member_first_name: 'Roberto',
    business_name: 'FISION',
    business_slug: 'fision',
    like_count: 5,
    liked_by_me: true,
  },
  {
    id: 'conn-3',
    connection_type: 'visita',
    item_description: null,
    message: 'Outra publicação do mesmo autor na mesma empresa.',
    photo_url: null,
    member_first_name: 'Carlos',
    business_name: 'Ótica Visão',
    business_slug: 'otica-visao',
    like_count: 1,
    liked_by_me: false,
  },
];

describe('UGC Moderation — Mural de Conexões (Apple Guideline 1.2)', () => {
  beforeEach(() => {
    setActiveModerationUserScope('guest');
    clearLocalModerationBlocks();
    setAcceptedUgcTerms(false);
  });

  it('envia denúncia real para a RPC report_connection quando autenticado e oculta imediatamente a publicação denunciada', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ reported: true }), { status: 200 }));

    const result = await submitConnectionModerationReport({
      connectionId: 'conn-1',
      reason: 'ofensivo',
      details: 'Comentário inadequado',
      blockAuthor: false,
      accessToken: 'jwt-test-token',
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    expect(result.success).toBe(true);
    expect(result.reportedRemotely).toBe(true);
    expect(result.requiresAuthForRemoteReport).toBe(false);
    expect(result.blockedAuthor).toBe(false);
    expect(getReportedConnectionIds()).toContain('conn-1');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl, calledInit] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(calledUrl).toContain('/rest/v1/rpc/report_connection');
    expect(JSON.parse(String(calledInit.body))).toEqual({
      p_connection_id: 'conn-1',
      p_reason: 'ofensivo',
      p_details: 'Comentário inadequado',
    });

    const filtered = filterModeratedConnections(sampleFeed);
    expect(filtered.map((i) => i.id)).toEqual(['conn-2', 'conn-3']);
  });

  it('para visitante não autenticado, não envia RPC falsa nem confirma envio à administração', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ reported: true }), { status: 200 }));

    const result = await submitConnectionModerationReport({
      connectionId: 'conn-1',
      reason: 'ofensivo',
      blockAuthor: false,
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    expect(result.success).toBe(true);
    expect(result.reportedRemotely).toBe(false);
    expect(result.requiresAuthForRemoteReport).toBe(true);
    expect(result.message).toContain('apenas neste aparelho');
    expect(fetchMock).not.toHaveBeenCalled();

    const filtered = filterModeratedConnections(sampleFeed);
    expect(filtered.map((i) => i.id)).toEqual(['conn-2', 'conn-3']);
  });

  it('bloqueia o autor de uma publicação de forma persistente e remove todas as publicações daquele autor do feed', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ success: true }), { status: 200 }));
    const authorKey = buildConnectionAuthorKey(sampleFeed[0]!);

    const res = await blockMuralAuthor({
      connectionId: 'conn-1',
      authorKey,
      accessToken: 'jwt-test-token',
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    expect(res.success).toBe(true);
    expect(res.blockedAuthor).toBe(true);
    expect(getBlockedConnectionIds()).toContain('conn-1');
    expect(getBlockedAuthorKeys()).toContain(authorKey);

    // Deve ter chamado report_connection + block_connection_author
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // Ambas as publicações de Carlos::otica-visao (conn-1 e conn-3) são removidas imediatamente
    const filtered = filterModeratedConnections(sampleFeed);
    expect(filtered.map((i) => i.id)).toEqual(['conn-2']);
  });

  it('mantém ocultação local mesmo se o dispositivo estiver offline no momento da denúncia', async () => {
    const offlineFetch = vi.fn(async () => {
      throw new Error('Network offline');
    });

    const res = await submitConnectionModerationReport({
      connectionId: 'conn-2',
      reason: 'informacao_falsa',
      blockAuthor: true,
      authorKey: buildConnectionAuthorKey(sampleFeed[1]!),
      fetchImpl: offlineFetch as unknown as typeof fetch,
    });

    expect(res.success).toBe(true);
    expect(res.reportedRemotely).toBe(false);

    const filtered = filterModeratedConnections(sampleFeed);
    expect(filtered.map((i) => i.id)).toEqual(['conn-1', 'conn-3']);
  });

  it('persiste o aceite explícito dos termos anti-abuso para envio de conteúdo no Mural', () => {
    expect(hasAcceptedUgcTerms()).toBe(false);
    setAcceptedUgcTerms(true);
    expect(hasAcceptedUgcTerms()).toBe(true);
  });

  it('isola os bloqueios e denúncias ao alternar entre contas de usuários distintas no mesmo aparelho', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ reported: true }), { status: 200 }));

    setActiveModerationUserScope('membro-a@exemplo.com');
    clearLocalModerationBlocks();
    await blockMuralAuthor({
      connectionId: 'conn-1',
      authorKey: buildConnectionAuthorKey(sampleFeed[0]!),
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    // Para o Membro A, conn-1 e conn-3 (mesmo autor Carlos::otica-visao) ficam ocultos
    expect(filterModeratedConnections(sampleFeed).map((i) => i.id)).toEqual(['conn-2']);

    // Ao trocar para o Membro B no mesmo dispositivo, o feed não herda o bloqueio privado do Membro A
    setActiveModerationUserScope('membro-b@exemplo.com');
    clearLocalModerationBlocks();
    expect(filterModeratedConnections(sampleFeed).map((i) => i.id)).toEqual(['conn-1', 'conn-2', 'conn-3']);

    // Ao voltar para o Membro A (ou reiniciar o app com Membro A logado), o bloqueio permanece ativo
    setActiveModerationUserScope('membro-a@exemplo.com');
    expect(filterModeratedConnections(sampleFeed).map((i) => i.id)).toEqual(['conn-2']);
  });
});

