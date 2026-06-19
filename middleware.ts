import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PAGE_MAP: Record<string, string> = {
  home: '/',
  staff: '/staff',
  plan: '/plans',
  book: '/book',
  booking: '/book',
  gallery: '/gallery',
  faq: '/faq',
  blog: '/blog',
}

const BLOG_REDIRECTS: Record<string, string> = {
  '/blog/16': '/blog/miyakojima-sup-beginner-guide',
  '/blog/shimojishima-airport-2025-summer-schedule-access':
    '/blog/shimojishima-airport-2026-summer-schedule-access',
}

export function middleware(request: NextRequest) {
  const blogRedirectPath = BLOG_REDIRECTS[request.nextUrl.pathname]

  if (blogRedirectPath) {
    const url = request.nextUrl.clone()
    url.pathname = blogRedirectPath
    return NextResponse.redirect(url, 308)
  }

  const page = request.nextUrl.searchParams.get('page')

  if (page && PAGE_MAP[page]) {
    const url = request.nextUrl.clone()
    url.pathname = PAGE_MAP[page]
    url.searchParams.delete('page')
    // 旧 ?page= URL の恒久統合（308 Permanent）でリンク評価を集約する
    return NextResponse.redirect(url, 308)
  }
}

export const config = {
  matcher: ['/', '/book', '/blog/16', '/blog/shimojishima-airport-2025-summer-schedule-access'],
}
