// Verificação de saúde pública e mínima: sem versão, sem linha do tempo de boot, sem configuração ou infraestrutura.
// O diagnóstico detalhado fica só em /diagnostics, protegido por login de administrador.
export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json(
    { ok: true },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    }
  );
}
