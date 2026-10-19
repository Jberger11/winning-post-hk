import React from 'react';
import { useGame } from './engine/gameStore';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DashboardScreen } from './components/screens/DashboardScreen';
import { MyHorsesScreen } from './components/screens/MyHorsesScreen';
import { RaceCalendarScreen } from './components/screens/RaceCalendarScreen';
import { LiveRaceViewer } from './components/screens/LiveRaceViewer';
import { TrainingScreen } from './components/screens/TrainingScreen';
import { BreedingScreen } from './components/screens/BreedingScreen';
import { HorseMarketScreen } from './components/screens/HorseMarketScreen';
import { FacilitiesScreen } from './components/screens/FacilitiesScreen';
import { JockeysTrainersScreen } from './components/screens/JockeysTrainersScreen';
import { WorldRankingsScreen } from './components/screens/WorldRankingsScreen';
import { FinanceScreen } from './components/screens/FinanceScreen';

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
    <div className="min-h-screen bg-[#070d18] text-slate-100 flex flex-col font-sans">
      <Header onOpenMobileMenu={() => setMobileMenuOpen(true)} />
      <div className="flex flex-1">
        <Sidebar
          isOpenMobile={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
          {renderScreen()}
        </main>
      </div>
    </div>
  );
}

export default App;
