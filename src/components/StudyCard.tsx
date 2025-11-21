import React, { useState, useEffect, useRef } from 'react';
import { ExamQuestion, ChatMessage } from '../types';
import { RefreshCw, Check, Eye, EyeOff, MessageCircle, X } from 'lucide-react';
import { chatWithGemini } from '../services/geminiService';

interface StudyCardProps {
  data: ExamQuestion;
  onProgressUpdate: (id: string, revealed: number, total: number) => void;
  apiKey: string;
}

interface Token {
  type: 'text' | 'blank';
  content?: string;
  answer?: string;
  original?: string;
  revealed?: boolean;
}

export const StudyCard: React.FC<StudyCardProps> = ({ data, onProgressUpdate, apiKey }) => {
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showChat, setShowChat] = useState(false);
  
  // Animation State
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLElement>(null);

  // Chat state
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  const [wordTokens, setWordTokens] = useState<Token[]>([]);

  // Scroll Reveal Observer
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.disconnect(); // Trigger once
      }
    }, { threshold: 0.1, rootMargin: '50px' });

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Generate blanks logic
  const generateBlanks = (text: string) => {
    const words = text.split(/(\s+)/);
    const minLength = 3;
    const density = 0.30; // 30% blanks
    
    const validIndices = words
      .map((w, i) => ({ w, i }))
      .filter(obj => obj.w.trim().length > minLength && !/^[A-Z]\)/.test(obj.w));

    for (let i = validIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [validIndices[i], validIndices[j]] = [validIndices[j], validIndices[i]];
    }

    const targetIndices = new Set(
      validIndices.slice(0, Math.floor(validIndices.length * density)).map(o => o.i)
    );

    return words.map((word, idx) => {
      if (targetIndices.has(idx)) {
        const clean = word.trim();
        return { type: 'blank', answer: clean, original: word, revealed: false } as Token;
      }
      return { type: 'text', content: word } as Token;
    });
  };

  // Initial load and updates
  useEffect(() => {
    const tokens = generateBlanks(data.text);
    setWordTokens(tokens);
  }, [data.text]);

  // Report progress whenever tokens change
  useEffect(() => {
    const blanks = wordTokens.filter(t => t.type === 'blank');
    const total = blanks.length;
    const revealed = blanks.filter(t => t.revealed).length;
    // Use setTimeout to avoid updating parent during render
    setTimeout(() => onProgressUpdate(data.id, revealed, total), 0);
  }, [wordTokens, data.id, onProgressUpdate]);

  const handleBlankClick = (index: number) => {
    const newTokens = [...wordTokens];
    if (newTokens[index].revealed) {
      newTokens[index].revealed = false;
    } else {
      newTokens[index].revealed = true;
    }
    setWordTokens(newTokens);
  };

  const handleRevealAll = () => {
    const newTokens = wordTokens.map(t => 
      t.type === 'blank' ? { ...t, revealed: true } : t
    );
    setWordTokens(newTokens);
  };

  const handleRefresh = () => {
    setWordTokens(generateBlanks(data.text));
  };

  // Chat Logic
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const newMessage: ChatMessage = { role: 'user', text: chatInput };
    setChatHistory(prev => [...prev, newMessage]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const response = await chatWithGemini(chatHistory, newMessage.text, data.text, apiKey);
      setChatHistory(prev => [...prev, { role: 'model', text: response }]);
    } catch (error) {
        console.error(error);
        setChatHistory(prev => [...prev, { role: 'model', text: "Error getting response. Please try again." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <article 
      id={data.id} 
      ref={cardRef}
      className={`
        glass-card rounded-3xl p-6 md:p-10 mb-12 scroll-mt-32 
        transition-all duration-700 ease-out transform
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}
      `}
    >
      {/* Header */}
      <div className="flex justify-between items-baseline border-b border-divider pb-5 mb-8">
        <h2 className="text-2xl font-semibold text-primary">Question {data.id.replace('q', '')}</h2>
        <span className="text-xs font-semibold text-accent bg-accent-bg px-3 py-1 rounded-full uppercase tracking-wide">
          {data.tag}
        </span>
      </div>

      {/* English Text Area with Blanks */}
      <div className="text-[17px] leading-[1.8] text-primary font-normal text-justify mb-8 select-none">
        {wordTokens.map((token, idx) => {
          if (token.type === 'text') return <span key={idx}>{token.content}</span>;
          
          // Dynamic width calculation: roughly 10-12px per char + padding
          const minWidth = Math.max(42, (token.answer?.length || 0) * 12);

          return (
            <span key={idx}>
               <button
                onClick={() => handleBlankClick(idx)}
                style={{ minWidth: token.revealed ? 'auto' : `${minWidth}px` }}
                className={`
                  inline-flex items-center justify-center mx-[3px] align-middle
                  transition-all duration-300 ease-out rounded-lg font-semibold text-[17px] cursor-pointer
                  ${token.revealed 
                    ? 'bg-transparent text-accent px-[2px] animate-pop-in' 
                    : 'bg-blank hover:bg-blank-hover text-transparent h-[28px] px-2 hover:scale-105'
                  }
                `}
              >
                {token.revealed ? token.answer : ''}
              </button>
              {token.original?.replace(token.answer || '', '')}
            </span>
          );
        })}
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-5 mt-8">
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={handleRefresh}
            className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold bg-blank hover:bg-blank-hover text-primary transition-transform active:scale-95"
          >
            <RefreshCw size={14} /> New Blanks
          </button>
          <button 
            onClick={handleRevealAll}
            className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold bg-blank hover:bg-blank-hover text-primary transition-transform active:scale-95"
          >
            <Check size={14} /> Reveal All
          </button>
          <button 
            onClick={() => setShowAnalysis(!showAnalysis)}
            className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold bg-accent hover:bg-accent-hover text-white shadow-lg shadow-blue-500/30 transition-all active:scale-95 hover:-translate-y-px"
          >
            {showAnalysis ? <EyeOff size={14} /> : <Eye size={14} />} 
            {showAnalysis ? 'Hide Analysis' : 'View Analysis'}
          </button>
          <button 
             onClick={() => setShowChat(!showChat)}
             className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-all active:scale-95 border
                 ${showChat ? 'bg-primary text-bg border-primary' : 'bg-card text-primary border-divider hover:bg-blank'}
             `}
          >
            <MessageCircle size={14} /> Chat
          </button>
        </div>
      </div>

      {/* Analysis Section */}
      {showAnalysis && (
        <div className="mt-8 pt-8 border-t border-divider animate-fade-up">
          <h3 className="text-lg font-semibold mb-4 text-primary">Translation</h3>
          <div className="bg-blank p-6 rounded-xl text-secondary leading-relaxed text-base mb-6">
            {data.trans}
          </div>

          <h3 className="text-lg font-semibold mb-4 text-primary">Vocabulary</h3>
          <ul className="list-disc list-inside mb-6 pl-2">
            {data.vocab.map((v, i) => (
              <li key={i} className="text-base text-secondary mb-1">
                <strong className="text-primary font-semibold">{v.word}:</strong> {v.meaning}
              </li>
            ))}
          </ul>

          <h3 className="text-lg font-semibold mb-4 text-primary">Summary</h3>
          <div className="bg-accent-bg p-6 rounded-xl border-l-4 border-accent text-primary leading-relaxed">
            {data.summary}
          </div>
        </div>
      )}

      {/* Chat Section */}
      {showChat && (
          <div className="mt-8 pt-8 border-t border-divider animate-fade-up">
               <h3 className="text-lg font-semibold mb-4 text-primary flex justify-between">
                   <span>AI Tutor</span>
                   <button onClick={() => setShowChat(false)} className="text-secondary hover:text-primary"><X size={16} /></button>
               </h3>
               <div className="bg-card border border-divider rounded-2xl h-64 overflow-y-auto p-4 mb-4 flex flex-col gap-3 shadow-inner dark:shadow-none">
                   {chatHistory.length === 0 && (
                       <p className="text-secondary text-center text-sm mt-20">Ask anything about the passage!</p>
                   )}
                   {chatHistory.map((msg, i) => (
                       <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                           <div className={`max-w-[85%] px-4 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
                               msg.role === 'user' 
                               ? 'bg-accent text-white rounded-tr-sm' 
                               : 'bg-blank text-primary rounded-tl-sm'
                           }`}>
                               {msg.text}
                           </div>
                       </div>
                   ))}
                   {isChatLoading && (
                       <div className="flex justify-start">
                           <div className="bg-blank px-4 py-2 rounded-2xl rounded-tl-sm text-xs text-secondary animate-pulse">
                               Thinking...
                           </div>
                       </div>
                   )}
               </div>
               <form onSubmit={handleSendChat} className="flex gap-2">
                   <input 
                    type="text" 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type your question..."
                    className="flex-1 bg-card border border-divider rounded-full px-4 py-2 focus:outline-none focus:border-accent text-sm text-primary placeholder-secondary"
                   />
                   <button 
                    type="submit"
                    disabled={isChatLoading || !chatInput}
                    className="bg-primary text-bg rounded-full p-2 w-10 h-10 flex items-center justify-center disabled:opacity-50"
                   >
                       <MessageCircle size={16} />
                   </button>
               </form>
          </div>
      )}
    </article>
  );
};