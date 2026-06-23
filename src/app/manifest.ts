import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Higsi 245D Suite',
    short_name: 'Higsi',
    description:
      'Minnesota 245D compliance management for home and community-based service providers. Manage clients, packets, notes, EVV, incidents, billing, and more.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#F0F4FF',
    theme_color: '#001F5B',
    orientation: 'portrait-primary',
    categories: ['business', 'health', 'productivity', 'medical'],
    lang: 'en-US',
    dir: 'ltr',
    scope: '/',
    id: '/dashboard',
    display_override: ['standalone', 'fullscreen', 'minimal-ui'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    screenshots: [],
    prefer_related_applications: false,
  }
}
