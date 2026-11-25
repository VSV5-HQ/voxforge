import { useCallback, useEffect, useRef, useState } from 'react';
import { Footer } from './components/Footer';
import { Navbar } from './components/Navbar';
import { ContactPage } from './pages/ContactPage';
import { HomePage } from './pages/HomePage';
import { HowItWorksPage } from './pages/HowItWorksPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { TermsOfServicePage } from './pages/TermsOfServicePage';
import { applyPageSeo, normalizePath, RoutePath } from './seo/routes';

export default function App() {
  const [currentPath, setCurrentPath] = useState<RoutePath>(() =>
    normalizePath(window.location.pathname)
  );
  const [demoTrigger, setDemoTrigger] = useState(0);
  const studioRef = useRef<HTMLElement | null>(null);

  const navigate = useCallback((path: RoutePath) => {
    const normalized = normalizePath(path);
    if (window.location.pathname !== normalized) {
      window.history.pushState({}, '', normalized);
    }
    setCurrentPath(normalized);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    applyPageSeo(currentPath);
  }, [currentPath]);

  useEffect(() => {
    const onPopState = () => {
      setCurrentPath(normalizePath(window.location.pathname));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const handlePrimaryAction = useCallback(() => {
    if (currentPath !== '/') {
      navigate('/');
      setTimeout(() => {
        studioRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
    } else {
      setDemoTrigger((n) => n + 1);
      studioRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [currentPath, navigate]);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]">
      <Navbar
        currentPath={currentPath}
        onNavigate={navigate}
        onPrimaryAction={handlePrimaryAction}
      />

      <main className="flex-1">
        {currentPath === '/' && (
          <HomePage
            studioRef={studioRef}
            demoTrigger={demoTrigger}
            onNavigate={navigate}
          />
        )}
        {currentPath === '/how-it-works' && (
          <HowItWorksPage onNavigate={navigate} />
        )}
        {currentPath === '/privacy-policy' && <PrivacyPolicyPage />}
        {currentPath === '/terms-of-service' && <TermsOfServicePage />}
        {currentPath === '/contact' && <ContactPage />}
      </main>

      <Footer onNavigate={navigate} />
    </div>
  );
}
