import React, { Suspense, lazy } from 'react';
import { useGame } from './engine/gameStore';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { WeekSummaryModal } from './components/WeekSummaryModal';

// Code splitting: 每個畫面獨立 chunk，按需載入。
// 舊版 11 個畫面全部 eager import，首屏要下載晒成個 525KB bundle。
const DashboardScreen = lazy(() => import('./components/screens/DashboardScreen').then(m => ({ default: m.DashboardScreen })));
const MyHorsesScreen = lazy(() => import('./components/screens/MyHorsesScreen').then(m => ({ default: m.MyHorsesScreen })));
const RaceCalendarScreen = lazy(() => import('./components/screens/RaceCalendarScreen').then(m => ({ default: m.RaceCalendarScreen })));
const LiveRaceViewer = lazy(() => import('./components/screens/LiveRaceViewer').then(m => ({ default: m.LiveRaceViewer })));
const TrainingScreen = lazy(() => import('./components/screens/TrainingScreen').then(m => ({ default: m.TrainingScreen })));
const BreedingScreen = lazy(() => import('./components/screens/BreedingScreen').then(m => ({ default: m.BreedingScreen })));
const HorseMarketScreen = lazy(() => import('./components/screens/HorseMarketScreen').then(m => ({ default: m.HorseMarketScreen })));
const FacilitiesScreen = lazy(() => import('./components/screens/FacilitiesScreen').then(m => ({ default: m.FacilitiesScreen })));
const JockeysTrainersScreen = lazy(() => import('./components/screens/JockeysTrainersScreen').then(m => ({ default: m.JockeysTrainersScreen })));
const WorldRankingsScreen = lazy(() => import('./components/screens/WorldRankingsScreen').then(m => ({ default: m.WorldRankingsScreen })));
const FinanceScreen = lazy(() => import('./components/screens/FinanceScreen').then(m => ({ default: m.FinanceScreen })));

export function App() {
  const { state } = useGame();
  const currentView = state.currentView;
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const renderScreen = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardScreen />;
      case 'my_horses':
        return <MyHorsesScreen />;
      case 'calendar':
        return <RaceCalendarScreen />;
      case 'live_race':
        return <LiveRaceViewer />;
      case 'training':
        return <TrainingScreen />;
      case 'breeding':
        return <BreedingScreen />;
      case 'market':
        return <HorseMarketScreen />;
      case 'facilities':
        return <FacilitiesScreen />;
      case 'jockeys_trainers':
        return <JockeysTrainersScreen />;
      case 'rankings':
        return <WorldRankingsScreen />;
      case 'finances':
        return <FinanceScreen />;
      default:
        return <DashboardScreen />;
    }
  };

  return (
    <div className="min-h-screen bg-[#070d18] bg-[radial-gradient(1200px_500px_at_80%_-80px,rgba(245,158,11,0.08),transparent),radial-gradient(900px_420px_at_10%_110%,rgba(56,189,248,0.06),transparent)] text-slate-100 flex flex-col font-sans">
      <Header onOpenMobileMenu={() => setMobileMenuOpen(true)} />
      <div className="flex flex-1">
        <Sidebar
          isOpenMobile={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-[1440px] mx-auto w-full overflow-y-auto">
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-24 text-slate-400 text-sm font-bold">
                🏇 載入中…
              </div>
            }
          >
            {renderScreen()}
          </Suspense>
        </main>
      </div>
      <WeekSummaryModal />
    </div>
  );
}

export default App;
