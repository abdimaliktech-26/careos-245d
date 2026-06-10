import type { NextConfig } from "next";

// Headers applied to all routes — prevent clickjacking, enforce HTTPS, stop MIME sniffing
const SECURITY_HEADERS = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=(self)' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
]

// No-cache on all routes that may contain PHI — prevents storage in browser/proxy cache
// HIPAA §164.312(a)(2)(iv) — requires safeguards for ePHI at rest
const NO_CACHE_HEADERS = [
  { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, private' },
  { key: 'Pragma', value: 'no-cache' },
]

const PHI_ROUTES = [
  '/dashboard',
  '/clients/:path*',
  '/packets/:path*',
  '/notes/:path*',
  '/schedule/:path*',
  '/incidents/:path*',
  '/evv/:path*',
  '/documents/:path*',
  '/notifications/:path*',
  '/billing-readiness/:path*',
  '/analytics/:path*',
  '/form-library/:path*',
  '/admin/:path*',
  '/api/:path*',
  '/sign/:path*',
  '/staff/:path*',
  '/client/:path*',
  '/super-admin/:path*',
]

const nextConfig: NextConfig = {
  output: 'standalone',
  devIndicators: false,
  turbopack: {
    root: __dirname,
  },
  headers: () => [
    {
      source: '/(.*)',
      headers: SECURITY_HEADERS,
    },
    {
      source: '/sw.js',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' }],
    },
    {
      source: '/manifest.json',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=3600' }],
    },
    ...PHI_ROUTES.map((source) => ({
      source,
      headers: NO_CACHE_HEADERS,
    })),
  ],
}

export default nextConfig
