import { useCallback, useEffect, useRef, useState } from 'react';
import { Footer } from './components/Footer';
import { Navbar } from './components/Navbar';
import { ContactPage } from './pages/ContactPage';
import { DashboardPage } from './pages/DashboardPage';
import { HomePage } from './pages/HomePage';
import { HowItWorksPage } from './pages/HowItWorksPage';
import { LoginPage } from './pages/LoginPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { RegisterPage } from './pages/RegisterPage';
import { TermsOfServicePage } from './pages/TermsOfServicePage';
import { applyPageSeo, normalizePath, RoutePath } from './seo/routes';

export default function App() {
  const [currentPath, setCurrentPath] = useState<RoutePath>(() =>
    normalizePath(window.location.pathname)
  );
  const [demoTrigger, setDemoTrigger] = useState(0);
  const [authFlashMessage, setAuthFlashMessage] = useState<string | null>(null);
  const [loginRedirectNotice, setLoginRedirectNotice] = useState<string | null>(
    null
  );
  const studioRef = useRef<HTMLElement | null>(null);

  const navigate = useCallback((path: RoutePath) => {
    const normalized = normalizePath(path);
    if (window.location.pathname !== normalized) {
      window.history.pushState({}, '', normalized);
    }
    if (normalized !== '/login') {
      setLoginRedirectNotice(null);
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
        {currentPath === '/login' && (
          <LoginPage
            onNavigate={navigate}
            onAuthSuccess={(msg) => setAuthFlashMessage(msg)}
            redirectNotice={loginRedirectNotice}
          />
        )}
        {currentPath === '/register' && (
          <RegisterPage
            onNavigate={navigate}
            onAuthSuccess={(msg) => setAuthFlashMessage(msg)}
          />
        )}
        {currentPath === '/dashboard' && (
          <DashboardPage
            onNavigate={navigate}
            onUnauthenticatedRedirect={(notice) =>
              setLoginRedirectNotice(notice)
            }
            flashMessage={authFlashMessage}
            onClearFlash={() => setAuthFlashMessage(null)}
          />
        )}
      </main>

      <Footer onNavigate={navigate} />
    </div>
  );
}
