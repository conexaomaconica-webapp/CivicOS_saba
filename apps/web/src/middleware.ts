// ============================================================================
// Next.js Middleware
// ============================================================================
// Request pipeline: tenant resolution → auth → RBAC → page rendering.
// Runs on Edge Runtime for global low-latency.
// ============================================================================

import { NextResponse, type NextRequest } from 'next/server';
import { createMiddlewareSideClient } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // ---------------------------------------------------------------------------
  // 1. Tenant Resolution
  // ---------------------------------------------------------------------------
  const host = request.headers.get('host') ?? '';
  const subdomain = extractSubdomain(host);
  // Public resolution never trusts x-tenant-id or tenant_id cookies. Server
  // components pass this original Host to the verified-domain RPC.

  // ---------------------------------------------------------------------------
  // 2. Auth & RBAC Check
  // ---------------------------------------------------------------------------
  // Instantiate the Supabase middleware-compatible client.
  const supabase = createMiddlewareSideClient(request, response);
  
  // Retrieve current user and automatically refresh session if stale.
  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Define route categories
  const isAdminRoute = path.startsWith('/admin');
  const isDashboardRoute = path.startsWith('/dashboard');
  const isProfileRoute = path.startsWith('/perfil') || path.startsWith('/profile');
  const isUserAreaRoute = path.startsWith('/usuario');
  const isAuthRoute = path.startsWith('/login') || path.startsWith('/register') || path.startsWith('/forgot-password');

  // If trying to access protected routes
  if (isAdminRoute || isDashboardRoute || isProfileRoute || isUserAreaRoute) {
    const isMockDevRoute = process.env.NODE_ENV !== 'production' && (
      path.includes('/empresa-') || path.includes('/bronze') || path.includes('/prata') || path.includes('/ouro')
    );

    if (isMockDevRoute) {
      return response;
    }

    if (!user) {
      // Not authenticated, redirect to login
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/login';
      // Pass the original destination as redirect query parameter
      redirectUrl.searchParams.set('redirect', path);
      return NextResponse.redirect(redirectUrl);
    }

    // Authorization data must come from the protected profile, never from
    // raw_user_meta_data, which the end user can modify.
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, tenant_id')
      .eq('id', user.id)
      .maybeSingle();
    const userRole = profile?.role ?? 'usuario_comum';
    const userTenantId = profile?.tenant_id ?? null;

    // RBAC: Admin Routes (/admin/*)
    if (isAdminRoute) {
      if (userRole !== 'master' && userRole !== 'socio_admin') {
        // Unauthorized, redirect to home page
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = '/';
        return NextResponse.redirect(redirectUrl);
      }
    }

    // RBAC: Dashboard Routes (/dashboard/*)
    if (isDashboardRoute) {
      const allowedRoles = ['master', 'socio_admin', 'anunciante'];
      if (!allowedRoles.includes(userRole)) {
        // Unauthorized, redirect to home page
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = '/';
        return NextResponse.redirect(redirectUrl);
      }

      // If user is a socio_admin or anunciante, check if they match the tenant
      let resolvedTenantId = null;
      if (subdomain) {
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('id')
          .eq('slug', subdomain)
          .maybeSingle();
        if (tenantData) {
          resolvedTenantId = tenantData.id;
        }
      }

      if (userRole !== 'master' && resolvedTenantId && userTenantId !== resolvedTenantId) {
        // Tenant mismatch, redirect to home
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = '/';
        return NextResponse.redirect(redirectUrl);
      }
    }
  }

  // If authenticated user tries to access /register or /forgot-password, redirect to home
  if (isAuthRoute && user && !path.startsWith('/login')) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/';
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractSubdomain(host: string): string | null {
  // Skip localhost and IP addresses
  if (host.startsWith('localhost') || /^\d+\.\d+\.\d+\.\d+/.test(host)) {
    return null;
  }

  const parts = host.split('.');
  // Need at least 3 parts: subdomain.domain.tld
  if (parts.length >= 3) {
    const subdomain = parts[0]!;
    // Ignore "www"
    if (subdomain !== 'www') {
      return subdomain;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Matcher
// ---------------------------------------------------------------------------

export const config = {
  matcher: [
    // Match all paths except static files and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
