export type RoutePath =
  | '/'
  | '/how-it-works'
  | '/privacy-policy'
  | '/terms-of-service'
  | '/contact';

export interface RouteMeta {
  path: RoutePath;
  label: string;
  title: string;
  description: string;
}

export const ROUTES: Record<RoutePath, RouteMeta> = {
  '/': {
    path: '/',
    label: 'Home',
    title: 'VoxForge – Free Online Voice Changer Studio',
    description:
      'Transform your voice online with VoxForge. Record or upload MP3/WAV audio, apply instant Deep, Chipmunk, Robot, Cave Echo, Radio, and Alien effects, and export WAV.',
  },
  '/how-it-works': {
    path: '/how-it-works',
    label: 'How It Works',
    title: 'How It Works – VoxForge Online Voice Changer',
    description:
      'Learn how VoxForge transforms audio locally in your browser using the Web Audio API, WSOLA pitch shifting, real-time effects, and instant WAV export.',
  },
  '/privacy-policy': {
    path: '/privacy-policy',
    label: 'Privacy Policy',
    title: 'Privacy Policy – VoxForge Local Audio Studio',
    description:
      'VoxForge processes all microphone recordings and audio files locally inside your browser. Zero server uploads, zero audio storage, and full privacy.',
  },
  '/terms-of-service': {
    path: '/terms-of-service',
    label: 'Terms of Service',
    title: 'Terms of Service – VoxForge Online Voice Changer',
    description:
      'Read the VoxForge Terms of Service covering acceptable use, intellectual property, browser audio processing, and service availability.',
  },
  '/contact': {
    path: '/contact',
    label: 'Contact Us',
    title: 'Contact Us – VoxForge Audio Support',
    description:
      'Have questions, feedback, or feature requests for VoxForge? Reach out to our team through the online contact form or direct support email.',
  },
};

export const NAV_ITEMS: RouteMeta[] = [
  ROUTES['/'],
  ROUTES['/how-it-works'],
  ROUTES['/privacy-policy'],
  ROUTES['/terms-of-service'],
  ROUTES['/contact'],
];

export function normalizePath(pathname: string): RoutePath {
  const cleaned = pathname.replace(/\/+$/, '') || '/';
  if (cleaned in ROUTES) {
    return cleaned as RoutePath;
  }
  return '/';
}

export function applyPageSeo(path: RoutePath): void {
  const meta = ROUTES[path] ?? ROUTES['/'];
  document.title = meta.title;

  const setMeta = (selector: string, content: string) => {
    const el = document.querySelector<HTMLMetaElement>(selector);
    if (el) el.content = content;
  };

  setMeta('meta[name="description"]', meta.description);
  setMeta('meta[property="og:title"]', meta.title);
  setMeta('meta[property="og:description"]', meta.description);
  setMeta('meta[name="twitter:title"]', meta.title);
  setMeta('meta[name="twitter:description"]', meta.description);

  let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  canonical.href = `${window.location.origin}${meta.path}`;
}
