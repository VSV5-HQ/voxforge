export type RoutePath =
  | '/'
  | '/how-it-works'
  | '/privacy-policy'
  | '/terms-of-service'
  | '/contact'
  | '/login'
  | '/register'
  | '/dashboard';

export interface RouteMeta {
  path: RoutePath;
  label: string;
  title: string;
  description: string;
}

export const SITE_URL = 'https://voxforge-6an.pages.dev';

export const ROUTES: Record<RoutePath, RouteMeta> = {
  '/': {
    path: '/',
    label: 'Home',
    title: 'VoxForge – AI Voice Cloning and Voice Generation Platform',
    description:
      'VoxForge is an AI voice cloning and voice generation studio in your browser. Apply 32+ real-time voice effects, tune pitch, and export WAV files locally.',
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
      'VoxForge processes all microphone recordings and audio files locally inside your browser. Zero audio uploads and secure account profile protection.',
  },
  '/terms-of-service': {
    path: '/terms-of-service',
    label: 'Terms of Service',
    title: 'Terms of Service – VoxForge Online Voice Changer',
    description:
      'Read the VoxForge Terms of Service covering acceptable use, intellectual property, browser audio processing, and user account terms.',
  },
  '/contact': {
    path: '/contact',
    label: 'Contact Us',
    title: 'Contact Us – VoxForge Audio Support',
    description:
      'Have questions, feedback, or feature requests for VoxForge? Reach out to our team through the online contact form or direct support email.',
  },
  '/login': {
    path: '/login',
    label: 'Login',
    title: 'Login – VoxForge Account',
    description:
      'Sign in to your VoxForge account to access your personalized creator dashboard while keeping audio processing local to your browser.',
  },
  '/register': {
    path: '/register',
    label: 'Create Account',
    title: 'Create Account – VoxForge',
    description:
      'Create a free VoxForge account to manage your profile and access your personalized audio studio dashboard.',
  },
  '/dashboard': {
    path: '/dashboard',
    label: 'Dashboard',
    title: 'Account Dashboard – VoxForge',
    description:
      'Manage your VoxForge account details, verify your email, and jump directly back into the Web Audio Voice Studio.',
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
  if (cleaned === '/create-account' || cleaned === '/signup') {
    return '/register';
  }
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

  const canonicalUrl = `${SITE_URL}${meta.path}`;
  setMeta('meta[name="description"]', meta.description);
  setMeta('meta[property="og:title"]', meta.title);
  setMeta('meta[property="og:description"]', meta.description);
  setMeta('meta[property="og:url"]', canonicalUrl);
  setMeta('meta[name="twitter:title"]', meta.title);
  setMeta('meta[name="twitter:description"]', meta.description);

  let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  canonical.href = canonicalUrl;
}
