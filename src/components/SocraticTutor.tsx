import React, { useState, useRef, useEffect } from 'react';
import { type ChatMessage } from '../types';
import { getSocraticResponse } from '../services/geminiService';
import { exportToPdf } from '../services/exportService';
import { SendIcon, UserIcon, ModelIcon, ExportIcon, CopyIcon, CheckIcon } from './icons';

const ChatBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const isUser = message.role === 'user';
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    if (isCopied) return;
    navigator.clipboard.writeText(message.text).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  };

  return (
    <div className={`flex items-start gap-4 my-4 ${isUser ? 'justify-end' : ''}`}>
      {!isUser && (
        <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white" style={{background: 'linear-gradient(135deg, #C973FF, #7A9DFF)'}}>
          <ModelIcon />
        </div>
      )}
      
      <div className={`group flex items-end gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
        <div
          className={`max-w-xl p-4 shadow-md ${
            isUser
              ? 'bg-blue-600 text-white rounded-br-none'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-none'
          }`}
        >
          <p className="whitespace-pre-wrap">{message.text}</p>
        </div>
        {!isUser && (
          <button
            onClick={handleCopy}
            className={`flex-shrink-0 p-1.5 rounded-full transition-all duration-200 ${isCopied ? 'text-green-500 bg-green-100 dark:bg-green-900/50' : 'text-slate-400 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-slate-300 dark:hover:bg-slate-600'}`}
            aria-label={isCopied ? "已複製!" : "複製訊息"}
          >
            {isCopied ? <CheckIcon /> : <CopyIcon />}
          </button>
        )}
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-pink-200 dark:bg-pink-800 flex items-center justify-center text-pink-600 dark:text-pink-300">
          <UserIcon />
        </div>
      )}
    </div>
  );
};

const SocraticTutor: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: '你好！我是藤永咲哉。有什麼物理問題我可以引導你思考的嗎？' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', text: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const responseText = await getSocraticResponse(messages, userMessage.text);
      const modelMessage: ChatMessage = { role: 'model', text: responseText };
      setMessages(prev => [...prev, modelMessage]);
    } catch (error) {
      console.error("Error getting Socratic response:", error);
      const errorMessage: ChatMessage = { role: 'model', text: (error as Error).message || '抱歉，我現在無法回答。請稍後再試。' };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    const title = '<h1>與藤永咲哉老師的對話記錄</h1>';
    const conversationHtml = messages.map(msg => `
      <div class="pdf-block" style="margin-bottom: 12px;">
        <p><strong>${msg.role === 'user' ? '你' : '藤永咲哉老師'}:</strong></p>
        <div>${msg.text.replace(/\n/g, '<br>')}</div>
      </div>
    `).join('');
    const fullHtml = `
      <div>
        ${title}
        <hr>
        ${conversationHtml}
      </div>`;
    
    exportToPdf(fullHtml, '物理導師對話記錄');
  };

  return (
    <div className="flex flex-col h-full p-4 md:p-6">
       <header className="mb-4 flex justify-between items-start">
        <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">藤永咲哉老師</h2>
            <p className="text-slate-500 dark:text-slate-400">透過提問探索物理，而不是直接尋找答案。</p>
        </div>
        <div>
            <button 
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-pink-200 dark:hover:bg-slate-600 transition-colors"
                aria-label="導出為 PDF"
            >
                <ExportIcon />
                <span className="text-sm font-medium">導出為 PDF</span>
            </button>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto pr-4 -mr-4">
        {messages.map((msg, index) => (
          <ChatBubble key={index} message={msg} />
        ))}
        {isLoading && (
            <div className="flex items-start gap-4 my-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white" style={{background: 'linear-gradient(135deg, #C973FF, #7A9DFF)'}}><ModelIcon /></div>
                <div className="max-w-xl p-4 rounded-2xl bg-slate-200 dark:bg-slate-700 rounded-bl-none shadow-md">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                        <div className="w-2.5 h-2.5 bg-pink-400 rounded-full animate-pulse"></div>
                        <div className="w-2.5 h-2.5 bg-pink-400 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                        <div className="w-2.5 h-2.5 bg-pink-400 rounded-full animate-pulse [animation-delay:0.4s]"></div>
                        <span className="ml-2 font-medium">公主思考中...</span>
                    </div>
                </div>
            </div>
        )}
        <div ref={chatEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="mt-4">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="請告訴公主殿下您的物理煩惱..."
            className="w-full p-4 pr-14 bg-slate-100 dark:bg-slate-700 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-3 rounded-full bg-blue-600 text-white disabled:bg-slate-400 disabled:cursor-not-allowed hover:bg-blue-700 transition-all duration-300 transform hover:scale-110"
          >
            <SendIcon />
          </button>
        </div>
      </form>
    </div>
  );
};

export default SocraticTutor;