import { StoreProvider, useStore } from './store';
import { BottomNav, CelebrationLayer, Toasts } from './components/ui';
import { Hero } from './components/pixel';
import { Home } from './pages/Home';
import { CheckIn } from './pages/CheckIn';
import { Plan } from './pages/Plan';
import { Calendar } from './pages/Calendar';
import { Profile } from './pages/Profile';

function Shell() {
  const { loaded, error, tab } = useStore();
  if (error) {
    return (
      <div className="boot">
        <Hero mood="tired" size={96} />
        <p className="pf">ERROR</p>
        <p>無法開啟本機資料庫：{error}</p>
        <p className="small">請確認不是在無痕模式，並允許網站儲存資料後重新整理。</p>
      </div>
    );
  }
  if (!loaded) {
    return (
      <div className="boot">
        <Hero size={96} />
        <p className="pf blink">LOADING...</p>
      </div>
    );
  }
  return (
    <>
      <main className="app" key={tab}>
        {tab === 'home' && <Home />}
        {tab === 'checkin' && <CheckIn />}
        {tab === 'plan' && <Plan />}
        {tab === 'calendar' && <Calendar />}
        {tab === 'profile' && <Profile />}
      </main>
      <BottomNav />
      <Toasts />
      <CelebrationLayer />
    </>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
