// Fix: Restored the full content of the file which was truncated, causing a missing export error.
import React from 'react';
import { type View } from '../types';
import { TutorIcon, PracticeIcon, LabIcon, DiagramIcon, BrandIcon } from './icons';

interface SidebarProps {
  activeView: View;
  setActiveView: (view: View) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView }) => {
  const navItems: { id: View; text: string; icon: React.ReactElement }[] = [
    { id: 'tutor', text: '蘇格拉底導師', icon: <TutorIcon /> },
    { id: 'practice', text: '動態練習題', icon: <PracticeIcon /> },
    { id: 'diagram', text: '圖表分析', icon: <DiagramIcon /> },
    { id: 'lab', text: '虛擬實驗室', icon: <LabIcon /> },
  ];

  return (
    <aside className="w-16 md:w-64 bg-slate-100 dark:bg-slate-900/70 p-2 md:p-4 flex flex-col transition-all duration-300 border-r border-pink-100 dark:border-purple-900/50">
      <div className="flex items-center justify-center md:justify-start gap-3 mb-8 px-2">
        <BrandIcon />
        <h1 className="text-xl font-bold hidden md:block text-slate-800 dark:text-white">AI 物理公主</h1>
      </div>
      <nav className="flex flex-col gap-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id)}
            className={`flex items-center gap-3 p-3 rounded-lg text-sm font-medium transition-all duration-300 transform hover:scale-105 ${
              activeView === item.id
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-slate-600 dark:text-slate-300 hover:bg-pink-100 dark:hover:bg-purple-900/40'
            }`}
          >
            {item.icon}
            <span className="hidden md:inline">{item.text}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
