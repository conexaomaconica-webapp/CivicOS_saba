// Verificação de saúde pública e mínima: sem versão, sem linha do tempo de boot, sem configuração ou infraestrutura.
// O diagnóstico detalhado e protegido de prontidão fica em /api/health/ready.
export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json(
    { ok: true, timestamp: new Date().toISOString() },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    }
  );
}
