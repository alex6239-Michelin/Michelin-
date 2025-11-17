// Fix: The `ErrorBoundary` component must extend `React.Component` to be a valid class component and have access to `this.props`.
import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const isApiKeyError = this.state.error?.message.includes('API_KEY');
      
      return (
        <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 p-8">
          <div className="text-center max-w-2xl bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-2xl border border-pink-200 dark:border-purple-800">
            <h1 className="text-3xl font-bold text-red-500 dark:text-red-400 mb-4">糟糕，公主的魔法出錯了！</h1>
            <p className="text-lg mb-6 text-slate-600 dark:text-slate-300">應用程式遇到了一個無法恢復的錯誤。</p>
            
            {isApiKeyError ? (
              <div className="text-left bg-slate-100 dark:bg-slate-700 p-6 rounded-lg">
                <h2 className="text-xl font-semibold mb-3 text-slate-800 dark:text-slate-100">看起來是 API 金鑰設定問題 🔑</h2>
                <p className="mb-2">這個錯誤通常表示應用程式找不到必要的 Google AI API 金鑰。</p>
                <p className="font-semibold mb-2">請依照以下步驟解決：</p>
                <ol className="list-decimal list-inside space-y-2">
                  <li>前往您的部署平台（例如 Vercel, Netlify）。</li>
                  <li>在專案設定中找到「Environment Variables」（環境變數）區塊。</li>
                  {/* Fix: Updated environment variable name to API_KEY for consistency. */}
                  <li>新增一個名為 <code className="bg-pink-200 dark:bg-purple-900 px-1.5 py-0.5 rounded font-mono text-pink-700 dark:text-purple-300">API_KEY</code> 的變數。</li>
                  <li>將您的 Google AI Studio API 金鑰作為其值貼上。</li>
                  <li>重新部署您的應用程式。</li>
                </ol>
                 <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                    <strong>錯誤訊息:</strong> {this.state.error?.message}
                </p>
              </div>
            ) : (
               <div className="text-left bg-slate-100 dark:bg-slate-700 p-4 rounded-lg">
                 <p className="font-semibold">錯誤詳情：</p>
                 <pre className="mt-2 p-2 bg-slate-200 dark:bg-slate-600 rounded text-sm whitespace-pre-wrap">
                   {this.state.error?.stack}
                 </pre>
               </div>
            )}
            
            <button
              onClick={() => window.location.reload()}
              className="mt-8 px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
            >
              重新整理頁面
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
