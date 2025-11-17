import React, { useState } from 'react';
import { generatePracticeProblem, generateTopicSummary } from '../services/geminiService';
import { exportToPdf } from '../services/exportService';
import { type PracticeProblem, type TopicSummary } from '../types';
import { SparklesIcon, ExportIcon, YoutubeIcon, LightbulbIcon } from './icons';

const SummaryCard: React.FC<{ title: string; content: string; icon: string }> = ({ title, content, icon }) => (
    <div className="bg-white/50 dark:bg-slate-800/50 p-4 rounded-xl shadow-md backdrop-blur-sm border border-pink-100/50 dark:border-purple-800/50">
        <h4 className="text-md font-bold text-pink-500 dark:text-pink-300 flex items-center mb-2">
            <span className="text-xl mr-2">{icon}</span>
            {title}
        </h4>
        <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{content}</p>
    </div>
);


const ProblemGenerator: React.FC = () => {
  const [topic, setTopic] = useState<string>('動量守恆');
  const [numQuestions, setNumQuestions] = useState<number>(1);
  const [problems, setProblems] = useState<PracticeProblem[]>([]);
  const [summary, setSummary] = useState<TopicSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<number, string>>({});
  const [showSolutions, setShowSolutions] = useState<Record<number, boolean>>({});

  const handleGenerateStudyPack = async () => {
    if (!topic.trim()) return;
    // Reset problems and error, but keep the summary if it exists
    setIsLoading(true);
    setError(null);
    setProblems([]);
    setSelectedOptions({});
    setShowSolutions({});

    try {
      const problemList = await generatePracticeProblem(topic, numQuestions);
      setProblems(problemList);
    } catch (e) {
      setError((e as Error).message || '無法生成學習包，請稍後再試。');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!topic.trim()) return;
     // Reset summary and error, but keep problems if they exist
    setIsLoading(true);
    setError(null);
    setSummary(null);
    try {
      const summaryData = await generateTopicSummary(topic);
      setSummary(summaryData);
    } catch (e) {
      setError((e as Error).message || '無法生成核心總整理，請稍後再試。');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  const handleOptionSelect = (problemIndex: number, option: string) => {
    if (showSolutions[problemIndex]) return;
    setSelectedOptions(prev => ({ ...prev, [problemIndex]: option }));
  };
  
  const handleShowSolution = (problemIndex: number) => {
    setShowSolutions(prev => ({ ...prev, [problemIndex]: true }));
  }

  const handleExportAll = () => {
    if (problems.length === 0 && !summary) return;
    
    const summaryHtml = summary ? `
        <h2>${topic} - 核心總整理</h2>
        <div style="margin-bottom: 20px; padding: 10px; page-break-inside: avoid;">
            <h3>⭐ 重點觀念叮嚀</h3>
            <p>${summary.keyConcepts.replace(/\n/g, '<br>')}</p>
        </div>
        <div style="margin-bottom: 20px; padding: 10px; page-break-inside: avoid;">
            <h3>📏 必背公式整理</h3>
            <p>${summary.formulas.replace(/\n/g, '<br>')}</p>
        </div>
        <div style="margin-bottom: 30px; padding: 10px; page-break-inside: avoid;">
            <h3>🔑 重要題型解題技巧</h3>
            <p>${summary.solvingTechniques.replace(/\n/g, '<br>')}</p>
        </div>
        <hr>
    ` : '';
    
    const allProblemsHtml = problems.map((problem, index) => {
        const { problem: question, options, solution, correctAnswer, youtubeLink } = problem;
        const optionsHtml = Object.entries(options).map(([key, value]) => 
          `<p style="margin: 4px 0;"><strong>${key.toUpperCase()}.</strong> ${value}</p>`
        ).join('');
        const youtubeHtml = youtubeLink ? `<p><strong>參考影片：</strong><a href="${youtubeLink}">${youtubeLink}</a></p>` : '';

        return `
        <article style="margin-bottom: 30px; page-break-inside: avoid;">
            <h3>第 ${index + 1} 題：</h3>
            <p>${question.replace(/\n/g, '<br>')}</p>
            <h4>選項：</h4>
            ${optionsHtml}
            <br>
            <p><strong>正確答案：${correctAnswer.toUpperCase()}</strong></p>
            <h4>詳解：</h4>
            <p>${solution.replace(/\n/g, '<br>')}</p>
            ${youtubeHtml}
        </article>
        `;
    }).join('<hr style="margin: 20px 0;">');

    const htmlContent = `
      <div>
        <h1>物理學習包：${topic}</h1>
        ${summaryHtml}
        ${problems.length > 0 ? `<h2>${summary ? '練習題' : ''}</h2>` : ''}
        ${allProblemsHtml}
      </div>`;
      
    const filename = `物理學習包-${topic}`;
    exportToPdf(htmlContent, filename);
  };

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto">
      <header className="mb-6 flex justify-between items-start">
        <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">動態練習題生成器</h2>
            <p className="text-slate-500 dark:text-slate-400">生成包含核心總整理與高頻考點的個人化學習包。</p>
        </div>
        {(problems.length > 0 || summary) && (
            <div>
                <button 
                    onClick={handleExportAll}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-pink-200 dark:hover:bg-slate-600 transition-colors"
                    aria-label="導出為 PDF"
                >
                    <ExportIcon />
                    <span className="text-sm font-medium">導出為 PDF</span>
                </button>
            </div>
        )}
      </header>
      
      <div className="flex flex-col md:flex-row gap-2 items-stretch md:items-center mb-6">
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="例如：牛頓第二定律"
          className="flex-grow p-3 bg-slate-100 dark:bg-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
        />
         <div className="flex items-center gap-2">
            <label htmlFor="numQuestions" className="text-sm font-medium text-slate-600 dark:text-slate-300">題數:</label>
            <select
                id="numQuestions"
                value={numQuestions}
                onChange={(e) => setNumQuestions(Number(e.target.value))}
                className="p-3 bg-slate-100 dark:bg-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
                {Array.from({ length: 5 }, (_, i) => i + 1).map(n => (
                    <option key={n} value={n}>{n}</option>
                ))}
            </select>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
            <button
              onClick={handleGenerateSummary}
              disabled={isLoading || !topic.trim()}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-purple-500 text-white font-semibold disabled:bg-slate-400 hover:bg-purple-600 transition-colors"
            >
              <LightbulbIcon />
              <span className="hidden sm:inline">核心總整理</span>
            </button>
            <button
              onClick={handleGenerateStudyPack}
              disabled={isLoading || !topic.trim()}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold disabled:bg-slate-400 hover:bg-blue-700 transition-colors"
            >
              <SparklesIcon />
              <span className="hidden sm:inline">生成學習包</span>
            </button>
        </div>
      </div>

      {isLoading && <div className="text-center p-8">正在為您準備學習包，請稍候...</div>}
      {error && <div className="text-center p-8 text-red-500">{error}</div>}
      
      {summary && (
        <div className="mb-8 p-4 bg-pink-50 dark:bg-purple-900/20 border border-pink-200 dark:border-purple-800 rounded-2xl">
            <h3 className="text-xl font-bold mb-4 text-slate-700 dark:text-white">《{topic}》核心總整理</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SummaryCard title="重點觀念叮嚀" content={summary.keyConcepts} icon="⭐" />
                <SummaryCard title="必背公式整理" content={summary.formulas} icon="📏" />
                <SummaryCard title="重要題型解題技巧" content={summary.solvingTechniques} icon="🔑" />
            </div>
        </div>
      )}

      <div className="space-y-6">
        {problems.map((problem, index) => (
            <div key={index} className="bg-card-light dark:bg-card-dark p-6 rounded-2xl shadow-lg border border-pink-100 dark:border-purple-800">
                <h3 className="text-lg font-semibold mb-4">練習題 {index + 1}</h3>
                <p className="mb-6 whitespace-pre-wrap">{problem.problem}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {Object.entries(problem.options).map(([key, value]) => {
                        const isSelected = selectedOptions[index] === key;
                        let baseStyle = 'bg-white dark:bg-slate-800 hover:bg-pink-50 dark:hover:bg-slate-700 border-gray-200 dark:border-slate-700';
                        let stateStyle = '';
                        
                        if(showSolutions[index]) {
                            if (key === problem.correctAnswer) {
                                stateStyle = 'bg-green-100 dark:bg-green-900/50 border-green-500 text-green-800 dark:text-green-200 border-2 shadow-lg';
                            } else if (isSelected) {
                                stateStyle = 'bg-red-100 dark:bg-red-900/50 border-red-500 text-red-800 dark:text-red-300 border-2';
                            }
                        } else if(isSelected) {
                            stateStyle = 'bg-blue-100 dark:bg-blue-900/50 border-pink-400 border-2 shadow-md';
                        }

                    return (
                        <div
                        key={key}
                        onClick={() => handleOptionSelect(index, key)}
                        className={`p-4 rounded-xl border transition-all duration-300 cursor-pointer transform hover:scale-102 ${stateStyle || baseStyle}`}
                        >
                        <span className="font-bold mr-2">{key.toUpperCase()}.</span>
                        {value}
                        </div>
                    );
                    })}
                </div>

                <button
                    onClick={() => handleShowSolution(index)}
                    disabled={!selectedOptions[index] || showSolutions[index]}
                    className="px-5 py-2 rounded-lg bg-pink-400 text-white font-semibold disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:opacity-70 hover:bg-pink-500 transition-colors"
                >
                    {showSolutions[index] ? '已顯示詳解' : '查看詳解'}
                </button>
                
                {showSolutions[index] && (
                    <div className="mt-6 border-t border-pink-200 dark:border-slate-700 pt-6">
                        <h4 className="text-lg font-semibold mb-4 text-green-600 dark:text-green-400">詳解：</h4>
                        <p className="whitespace-pre-wrap text-slate-600 dark:text-slate-300 mb-4">{problem.solution}</p>
                        {problem.youtubeLink && (
                            <div className="mt-4">
                                <h5 className="font-semibold text-slate-700 dark:text-slate-200 mb-1">觀念教學影片：</h5>
                                <a 
                                    href={problem.youtubeLink} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="inline-flex items-center text-red-600 dark:text-red-400 group"
                                >
                                    <YoutubeIcon />
                                    <span className="break-all ml-2 group-hover:underline">{problem.youtubeLink}</span>
                                </a>
                            </div>
                        )}
                    </div>
                )}
            </div>
        ))}
      </div>
    </div>
  );
};

export default ProblemGenerator;
