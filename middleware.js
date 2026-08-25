import { NextResponse } from 'next/server';

export function middleware(request) {
  const path = request.nextUrl.pathname;
  
  // Cek cookie session
  const hasSession = request.cookies.has('sb-access-token') || 
                     request.cookies.has('supabase-auth-token');

  // Redirect ke login jika belum login dan mengakses protected page
  if (!hasSession && !path.startsWith('/auth') && path !== '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    return NextResponse.redirect(url);
  }

  // Redirect ke dashboard jika sudah login dan mengakses auth page
  if (hasSession && path.startsWith('/auth')) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/dashboard/:path*', '/items/:path*', '/waste/:path*', '/auth/:path*'],
};
