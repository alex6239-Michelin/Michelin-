import React, { useState, useRef } from 'react';
import { analyzeDiagram } from '../services/geminiService';
import { exportToPdf } from '../services/exportService';
import { UploadIcon, DiagramIcon, ExportIcon } from './icons';

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

const DiagramAnalyzer: React.FC = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('請詳細描述這張圖的內容，以及您遇到的困難或想確認的觀念，例如：『這是在水平桌面上推動物體的自由體圖，我不確定摩擦力的方向是否正確。』');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setFeedback(null);
      setError(null);
    }
  };

  const handleAnalyze = async () => {
    if (!imageFile) return;
    setIsLoading(true);
    setError(null);
    setFeedback(null);
    try {
      const analysisResult = await analyzeDiagram(imageFile, prompt);
      setFeedback(analysisResult);
    } catch (e) {
      setError((e as Error).message || '無法分析圖片，請稍後再試。');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    if (!imageFile || !feedback) return;
    
    try {
        const imageBase64 = await fileToBase64(imageFile);
        const htmlContent = `
            <div>
                <h1>圖表分析報告</h1>
                <hr>
                <div style="page-break-inside: avoid; margin-bottom: 20px;">
                    <h3>學生的問題：</h3>
                    <p>${prompt}</p>
                </div>
                <div style="page-break-inside: avoid; margin-bottom: 20px;">
                    <h3>上傳的圖表：</h3>
                    <img src="${imageBase64}" alt="student diagram" style="max-width: 500px;" />
                </div>
                <div style="page-break-inside: avoid; margin-bottom: 20px;">
                    <h3>AI 教授的回饋：</h3>
                    <p>${feedback.replace(/\n/g, '<br>')}</p>
                </div>
            </div>
        `;
        const filename = '物理圖表分析報告';
        await exportToPdf(htmlContent, filename);
    } catch (e) {
        console.error("Error preparing file for export:", e);
        setError("準備導出檔案時發生錯誤。");
    }
  };

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto">
      <header className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">多模態圖表分析器</h2>
        <p className="text-slate-500 dark:text-slate-400">上傳你手繪的自由體圖、電路圖等，讓 AI 引導你修正錯誤。</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div 
          className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 text-center flex flex-col items-center justify-center min-h-[300px] cursor-pointer hover:border-blue-500 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
          {previewUrl ? (
            <img src={previewUrl} alt="Diagram preview" className="max-w-full max-h-80 object-contain rounded-lg" />
          ) : (
            <>
              <UploadIcon />
              <p className="mt-2 text-slate-500 dark:text-slate-400">點擊此處上傳圖片</p>
              <p className="text-sm text-slate-400">支援 PNG, JPG, WEBP</p>
            </>
          )}
        </div>
        <div className="flex flex-col gap-4">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="描述你的圖表以及遇到的問題..."
            className="w-full p-3 h-32 bg-slate-100 dark:bg-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <button
            onClick={handleAnalyze}
            disabled={!imageFile || isLoading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold disabled:bg-slate-400 hover:bg-blue-700 transition-colors"
          >
            <DiagramIcon />
            {isLoading ? '分析中...' : '開始分析'}
          </button>
        </div>
      </div>
      
      {(isLoading || error || feedback) && (
        <div className="mt-8">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xl font-semibold text-slate-800 dark:text-white">AI 教授的回饋：</h3>
            {feedback && !isLoading && (
                 <div>
                    <button 
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-pink-200 dark:hover:bg-slate-600 transition-colors"
                        aria-label="導出報告為 PDF"
                    >
                        <ExportIcon />
                        <span className="text-sm font-medium">導出為 PDF</span>
                    </button>
                </div>
            )}
          </div>
          <div className="bg-slate-100 dark:bg-slate-900/50 p-6 rounded-lg min-h-[100px]">
            {isLoading && <p className="text-slate-500 dark:text-slate-400">正在仔細檢查你的圖，請稍候...</p>}
            {error && <p className="text-red-500">{error}</p>}
            {feedback && <p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{feedback}</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default DiagramAnalyzer;