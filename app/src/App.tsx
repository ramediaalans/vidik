import { Suspense, lazy, useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { Header, Footer } from './components/Layout';
import { BootScreen, Grain } from './components/core';
import { Home } from './pages/Home';
import { RevealObserver, RouteNoise } from './v2/fx';
import { RouteMeta } from './seo';
import { ErrorBoundary } from './components/ErrorBoundary';
import { sessionGet, sessionSet } from './safeStorage';

const MusicPage = lazy(() => import('./pages/MusicPage').then((m) => ({ default: m.MusicPage })));
const GamesPage = lazy(() => import('./pages/GamesPage').then((m) => ({ default: m.GamesPage })));
const TVPage = lazy(() => import('./pages/TVPage').then((m) => ({ default: m.TVPage })));
const StoriesPage = lazy(() => import('./pages/StoriesPage').then((m) => ({ default: m.StoriesPage })));
const NostalgiaPage = lazy(() => import('./pages/NostalgiaPage').then((m) => ({ default: m.NostalgiaPage })));
const RetroNetPage = lazy(() => import('./pages/RetroNetPage').then((m) => ({ default: m.RetroNetPage })));
const SearchPage = lazy(() => import('./pages/SearchPage').then((m) => ({ default: m.SearchPage })));
const YearsPage = lazy(() => import('./pages/YearsPage').then((m) => ({ default: m.YearsPage })));
const SalonPage = lazy(() => import('./pages/SalonPage').then((m) => ({ default: m.SalonPage })));
const DisneyPage = lazy(() => import('./pages/DisneyPage').then((m) => ({ default: m.DisneyPage })));
const FilmPage = lazy(() => import('./pages/FilmPage').then((m) => ({ default: m.FilmPage })));
const GamePage = lazy(() => import('./pages/GamePage').then((m) => ({ default: m.GamePage })));
import { hotkeyChar } from './media/hotkeys';
import { PlayerProvider, PlayerTaskbar } from './media/player';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);
  return null;
}

// Старый адрес карточки мультфильма. Основное перенаправление (301) делает public/_redirects,
// этот маршрут страхует переходы внутри приложения и локальную разработку.
function LegacyCartoon() {
  const { slug } = useParams();
  return <Navigate to={`/multklub/${slug ?? ''}`} replace />;
}

// key по slug: при переходе с одной карточки на другую (похожие фильмы, серии)
// страница монтируется заново и не тащит состояние плеера/серии/позиции.
function FilmRoute({ group }: { group: 'salon' | 'disney' }) {
  const { slug } = useParams();
  return <FilmPage key={`${group}:${slug ?? ''}`} group={group} />;
}

function KonamiEasterEgg() {
  const [found, setFound] = useState(false);

  useEffect(() => {
    const code = [
      'ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'
    ];
    let pos = 0;
    const onKey = (e: KeyboardEvent) => {
      const key = hotkeyChar(e);
      pos = key === code[pos] ? pos + 1 : key === code[0] ? 1 : 0;
      if (pos === code.length) {
        setFound(true);
        pos = 0;
        window.setTimeout(() => setFound(false), 6000);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!found) return null;
  return (
    <div
      className="pixel"
      role="status"
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 90,
        background: 'var(--acid)',
        color: 'var(--ink)',
        padding: '10px 18px',
        borderRadius: 8,
        fontSize: 18
      }}
    >
      +30 жизней. Играем до утра.
    </div>
  );
}

export default function App() {
  const { pathname } = useLocation();
  const [booted, setBooted] = useState(() => sessionGet('vidik-booted') === '1');

  const finishBoot = () => {
    sessionSet('vidik-booted', '1');
    setBooted(true);
  };

  return (
    <PlayerProvider>
      <Grain />
      <RouteNoise />
      <RevealObserver />
      <KonamiEasterEgg />
      {!booted ? <BootScreen onDone={finishBoot} /> : null}
      <ScrollToTop />
      <RouteMeta />
      <a className="skip-link" href="#main">К основному содержанию</a>
      <Header />
      <main id="main">
        <ErrorBoundary resetKey={pathname}>
        <Suspense
          fallback={
            <section className="section container">
              <span className="mono">Перемотка…</span>
            </section>
          }
        >
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/filmy" element={<Navigate to="/videosalon" replace />} />
          <Route path="/multfilmy" element={<Navigate to="/multklub" replace />} />
          <Route path="/disney-klub" element={<Navigate to="/multklub" replace />} />
          <Route path="/disney-klub/:slug" element={<LegacyCartoon />} />
          <Route path="/igry" element={<GamesPage />} />
          <Route path="/igry/:id" element={<GamePage />} />
          <Route path="/muzyka" element={<MusicPage />} />
          <Route path="/videosalon" element={<SalonPage />} />
          <Route path="/videosalon/:slug" element={<FilmRoute group="salon" />} />
          <Route path="/multklub" element={<DisneyPage />} />
          <Route path="/multklub/:slug" element={<FilmRoute group="disney" />} />
          <Route path="/televizor" element={<TVPage />} />
          <Route path="/istorii" element={<StoriesPage />} />
          <Route path="/nostalgiya" element={<NostalgiaPage />} />
          <Route path="/retrointernet" element={<RetroNetPage />} />
          <Route path="/po-godam" element={<YearsPage />} />
          <Route path="/poisk" element={<SearchPage />} />
          <Route
            path="*"
            element={
              <section className="section container">
                <div className="mono">Ошибка 404</div>
                <h1 className="display display--l" style={{ margin: '12px 0' }}>Кассета зажёвана</h1>
                <p className="lead">Такой страницы нет. Перемотай на главную или поищи в архиве.</p>
                <div className="row" style={{ marginTop: 24 }}>
                  <Link className="btn btn--primary" to="/">На главную</Link>
                  <Link className="btn" to="/poisk">Открыть поиск</Link>
                </div>
              </section>
            }
          />
        </Routes>
        </Suspense>
        </ErrorBoundary>
      </main>
      <Footer />
      <PlayerTaskbar />
    </PlayerProvider>
  );
}
