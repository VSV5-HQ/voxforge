import { NAV_ITEMS, RoutePath } from '../seo/routes';

interface FooterProps {
  onNavigate: (path: RoutePath) => void;
}

export function Footer({ onNavigate }: FooterProps) {
  const handleLinkClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    path: RoutePath
  ) => {
    e.preventDefault();
    onNavigate(path);
  };

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <a
              href="/"
              onClick={(e) => handleLinkClick(e, '/')}
              className="font-display text-lg font-bold tracking-tight text-slate-900"
            >
              VoxForge
            </a>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Browser-native voice changer powered by the Web Audio API. Record,
              transform, preview, and export WAV files without uploading audio to
              external servers.
            </p>
          </div>

          <nav
            aria-label="Footer navigation"
            className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-slate-600"
          >
            {NAV_ITEMS.map((item) => (
              <a
                key={item.path}
                href={item.path}
                onClick={(e) => handleLinkClick(e, item.path)}
                className="whitespace-nowrap hover:text-slate-950 hover:underline underline-offset-4 transition-colors"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-slate-100 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} VoxForge. All rights reserved.</p>
          <p>Web Audio API · 16-bit PCM WAV Export · 100% Client-Side</p>
        </div>
      </div>
    </footer>
  );
}
