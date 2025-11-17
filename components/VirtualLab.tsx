import React, { useState, useEffect } from 'react';
import { generateSimulationCode } from '../services/geminiService';
import { LabIcon, DownloadIcon } from './icons';

const VirtualLab: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('一個有摩擦力的斜面上的滑塊');
  const [code, setCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    setError(null);
    setCode('');
    try {
      const generatedCode = await generateSimulationCode(prompt);
      setCode(generatedCode);
    } catch (e) {
      setError((e as Error).message || '無法生成模擬，請稍後再試。');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!code) return;
    const blob = new Blob([code], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'physics-simulation.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  // Auto-generate on first load
  useEffect(() => {
    handleGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col h-full">
      <header className="p-4 border-b border-slate-200 dark:border-slate-700">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">AI 虛擬實驗室</h2>
        <p className="text-slate-500 dark:text-slate-400">透過生成、編輯和除錯互動式模擬來學習物理。</p>
      </header>
      
      <div className="p-4 flex flex-wrap gap-2 items-center border-b border-slate-200 dark:border-slate-700">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="描述你想模擬的物理場景..."
          className="flex-grow p-3 bg-slate-100 dark:bg-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleGenerate}
          disabled={isLoading || !prompt.trim()}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold disabled:bg-slate-400 hover:bg-blue-700 transition-colors"
        >
          <LabIcon />
          {isLoading ? '生成中...' : '生成實驗'}
        </button>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-px bg-slate-200 dark:bg-slate-700 overflow-hidden">
        <div className="bg-white dark:bg-slate-800 flex flex-col overflow-hidden">
            <div className="p-3 font-semibold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
                <h3>程式碼 (HTML/JS)</h3>
                <button 
                    onClick={handleDownload} 
                    disabled={!code || isLoading}
                    className="p-2 rounded-full disabled:text-slate-400 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    aria-label="下載代碼"
                >
                    <DownloadIcon />
                </button>
            </div>
            <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full h-full p-4 font-mono text-sm bg-transparent resize-none focus:outline-none"
            placeholder={isLoading ? "正在生成程式碼..." : "生成的程式碼將顯示在此處。"}
            />
        </div>
        <div className="bg-white dark:bg-slate-800 flex flex-col overflow-hidden">
            <h3 className="p-3 font-semibold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50">模擬預覽</h3>
            {error && <div className="p-4 text-red-500">{error}</div>}
            <iframe
            srcDoc={code}
            title="Physics Simulation"
            className="w-full h-full border-0"
            sandbox="allow-scripts"
            />
        </div>
      </div>
    </div>
  );
};

export default VirtualLab;