import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import SocraticTutor from './components/SocraticTutor';
import ProblemGenerator from './components/ProblemGenerator';
import VirtualLab from './components/VirtualLab';
import DiagramAnalyzer from './components/DiagramAnalyzer';
import { type View } from './types';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<View>('tutor');

  const renderContent = () => {
    switch (activeView) {
      case 'tutor':
        return <SocraticTutor />;
      case 'practice':
        return <ProblemGenerator />;
      case 'lab':
        return <VirtualLab />;
      case 'diagram':
        return <DiagramAnalyzer />;
      default:
        return <SocraticTutor />;
    }
  };

  return (
    <div className="flex h-screen font-sans">
      <Sidebar activeView={activeView} setActiveView={setActiveView} />
      <main className="flex-1 overflow-y-auto bg-white dark:bg-slate-800">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
