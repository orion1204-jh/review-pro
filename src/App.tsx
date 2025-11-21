import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, Zap, BookOpen, Sparkles, BrainCircuit, ArrowRight, Key, Save, Trash2, Calendar, FileText, Plus, Download } from 'lucide-react';
import { StudyCard } from './components/StudyCard';
import { parseExamPDF } from './services/geminiService';
import { generateStandaloneHtml } from './services/htmlGenerator';
import { ParsedExamData } from './types';

interface SavedExam {
  id: string;
  title: string;
  date: string;
  questionCount: number;
  data: ParsedExamData;
}

const App: React.FC = () => {
  const [parsedData, setParsedData] = useState<ParsedExamData | null>(null);
  const [tempParsedData, setTempParsedData] = useState<ParsedExamData | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isThinkingMode, setIsThinkingMode] = useState(false);
  const [activeId, setActiveId] = useState<string>('');
  
  // API Key State
  const [apiKey, setApiKey] = useState<string>('');
  const [inputKey, setInputKey] = useState('');
  
  // Progress State
  const [loadingStatus, setLoadingStatus] = useState<string>("Initializing...");
  const [loadingProgress, setLoadingProgress] = useState<number>(0);

  // Global Stats State
  const [progressMap, setProgressMap] = useState<{[key: string]: {total: number, revealed: number}}>({});
  const [globalProgress, setGlobalProgress] = useState(0);

  // Library State
  const [savedExams, setSavedExams] = useState<SavedExam[]>([]);
  const [examTitle, setExamTitle] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const observer = useRef<IntersectionObserver | null>(null);
  
  // Refs for nav links to enable scrolling
  const navLinksRef = useRef<Map<string, HTMLAnchorElement>>(new Map());

  // Load API Key & Library
  useEffect(() => {
      const storedKey = localStorage.getItem('gemini_api_key');
      if (storedKey) setApiKey(storedKey);

      const storedLibrary = localStorage.getItem('review_pro_library');
      if (storedLibrary) {
          try {
              setSavedExams(JSON.parse(storedLibrary));
          } catch (e) {
              console.error("Failed to parse library", e);
          }
      }
  }, []);

  const saveKey = () => {
      if(inputKey.trim()) {
          localStorage.setItem('gemini_api_key', inputKey.trim());
          setApiKey(inputKey.trim());
      }
  };

  const removeKey = () => {
      localStorage.removeItem('gemini_api_key');
      setApiKey('');
      setParsedData(null);
      setTempParsedData(null);
  };

  // Library Functions
  const handleSaveToLibrary = () => {
      if (!tempParsedData) return;
      
      const title = examTitle.trim() || `Mock Exam ${new Date().toLocaleDateString()}`;
      const newExam: SavedExam = {
          id: Date.now().toString(),
          title,
          date: new Date().toLocaleDateString(),
          questionCount: tempParsedData.questions.length,
          data: tempParsedData
      };

      const updatedLibrary = [newExam, ...savedExams];
      setSavedExams(updatedLibrary);
      localStorage.setItem('review_pro_library', JSON.stringify(updatedLibrary));
      
      // Auto-start review after save
      setParsedData(tempParsedData);
      setTempParsedData(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteExam = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (window.confirm("Are you sure you want to delete this study set?")) {
          const updatedLibrary = savedExams.filter(ex => ex.id !== id);
          setSavedExams(updatedLibrary);
          localStorage.setItem('review_pro_library', JSON.stringify(updatedLibrary));
      }
  };

  const handleLoadExam = (exam: SavedExam) => {
      setParsedData(exam.data);
      setTempParsedData(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Export HTML Function
  const handleExportHtml = (e: React.MouseEvent, dataToExport: ParsedExamData, title: string) => {
    e.stopPropagation();
    const htmlContent = generateStandaloneHtml(title, dataToExport);
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/\s+/g, '_')}_ReviewPro.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Intersection Observer logic for Scroll Spy (Active Nav Link)
  useEffect(() => {
    if (!parsedData) return;

    const handleIntersect = (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const newId = entry.target.id;
          setActiveId(newId);
          
          // Scroll active link into view
          const linkEl = navLinksRef.current.get(newId);
          if (linkEl) {
             linkEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
          }
        }
      });
    };

    observer.current = new IntersectionObserver(handleIntersect, {
      rootMargin: '-20% 0px -50% 0px', 
      threshold: 0.1
    });

    setTimeout(() => {
        const elements = document.querySelectorAll('article');
        elements.forEach(el => observer.current?.observe(el));
    }, 100);

    return () => observer.current?.disconnect();
  }, [parsedData]);

  // Progress update logic
  const updateProgress = useCallback((id: string, revealed: number, total: number) => {
    setProgressMap(prev => {
      const newState = { ...prev, [id]: { revealed, total } };
      return newState;
    });
  }, []);

  useEffect(() => {
    let totalBlanks = 0;
    let totalRevealed = 0;
    Object.values(progressMap).forEach((val: { total: number; revealed: number }) => {
      totalBlanks += val.total;
      totalRevealed += val.revealed;
    });
    
    if (totalBlanks === 0) setGlobalProgress(0);
    else setGlobalProgress((totalRevealed / totalBlanks) * 100);
  }, [progressMap]);

  // Circular Progress Calculation
  const radius = 11;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (globalProgress / 100) * circumference;


  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf') {
        alert("Please upload a valid PDF file.");
        return;
      }

      setIsLoading(true);
      setLoadingProgress(0);
      setLoadingStatus(isThinkingMode ? "Thinking deeply..." : "Starting AI analysis...");
      setTempParsedData(null); 
      setExamTitle(''); // Reset title

      try {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
          const base64String = (reader.result as string).split(',')[1];
          try {
            const data = await parseExamPDF(
                base64String,
                apiKey,
                isThinkingMode,
                (status, progress) => {
                    setLoadingStatus(status);
                    setLoadingProgress(progress);
                }
            );
            setTempParsedData(data); 
            setProgressMap({});
          } catch (error) {
            console.error(error);
            alert("Failed to process PDF with Gemini. Please try again.");
          } finally {
            setIsLoading(false);
          }
        };
        reader.onerror = (error) => {
           console.error("File reading error", error);
           setIsLoading(false);
        }
      } catch (error) {
         console.error("Upload handling error", error);
         setIsLoading(false);
      }
    }
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen bg-bg text-primary font-sans selection:bg-accent/20">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 w-full h-[60px] glass-nav z-50 flex items-center transition-all duration-300">
        <div className="max-w-[92%] w-full mx-auto flex justify-between items-center px-2">
          {/* Left side: Logo + Links */}
          <div className="flex items-center gap-5 overflow-hidden flex-1">
            <div 
                className="flex items-center gap-2 font-bold text-lg cursor-pointer whitespace-nowrap"
                onClick={() => {
                    setParsedData(null);
                    setTempParsedData(null);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
            >
                <span className="text-primary"> Review Pro AI</span>
            </div>

            {parsedData && (
                <div className="flex gap-[6px] overflow-x-auto no-scrollbar mask-linear pr-5 flex-1 min-w-0 items-center h-full" id="nav-links">
                {parsedData.questions.map(q => (
                    <a 
                    key={q.id} 
                    id={`nav-${q.id}`}
                    href={`#${q.id}`}
                    ref={(el) => { if (el) navLinksRef.current.set(q.id, el); }}
                    onClick={(e) => {
                        e.preventDefault();
                        const el = document.getElementById(q.id);
                        if (el) {
                            const offset = 90;
                            const bodyRect = document.body.getBoundingClientRect().top;
                            const elementRect = el.getBoundingClientRect().top;
                            const offsetPosition = elementRect - bodyRect - offset;
                            window.scrollTo({ top: offsetPosition, behavior: "smooth" });
                        }
                    }}
                    style={activeId === q.id ? {
                        backgroundColor: 'var(--nav-active-bg)',
                        color: 'var(--nav-active-text)',
                        fontWeight: 600,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                    } : {}}
                    className={`
                        text-xs font-medium px-3 py-1.5 rounded-full transition-all duration-300 cubic-bezier(0.25, 0.1, 0.25, 1) whitespace-nowrap flex-shrink-0
                        ${activeId !== q.id ? 'text-secondary hover:bg-divider hover:text-primary' : ''}
                    `}
                    >
                    {q.id.toUpperCase().replace('Q', 'Q')}
                    </a>
                ))}
                </div>
            )}
          </div>

          <div className="flex items-center gap-4 flex-shrink-0 ml-4">
             
             {/* API Key Reset */}
             {apiKey && !parsedData && (
                 <button 
                    onClick={removeKey} 
                    className="text-secondary hover:text-primary transition-colors"
                    title="Reset API Key"
                >
                     <Key size={16} />
                 </button>
             )}

             {/* Thinking Toggle */}
             {apiKey && !parsedData && !isLoading && !tempParsedData && (
                <button 
                    onClick={() => setIsThinkingMode(!isThinkingMode)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all
                        ${isThinkingMode 
                            ? 'bg-purple-600 text-white border-purple-600 shadow-lg shadow-purple-500/20' 
                            : 'bg-card text-secondary border-divider hover:bg-blank'}
                    `}
                >
                    <BrainCircuit size={14} />
                    <span className="hidden sm:inline">{isThinkingMode ? 'Thinking On' : 'Thinking Off'}</span>
                </button>
             )}
            
            {/* Progress Ring */}
            <div className="relative w-7 h-7 flex items-center justify-center" title="Review Progress">
               <svg width="28" height="28" className="transform -rotate-90">
                 <circle cx="14" cy="14" r="11" fill="transparent" className="stroke-ring" strokeWidth="3" strokeDasharray="69" />
                 <circle 
                   cx="14" 
                   cy="14" 
                   r="11" 
                   fill="transparent" 
                   className="stroke-progress transition-all duration-500 ease-out" 
                   strokeWidth="3" 
                   strokeDasharray={circumference}
                   strokeDashoffset={strokeDashoffset}
                   strokeLinecap="round"
                 />
               </svg>
            </div>
          </div>
        </div>
      </nav>

      {/* API Key Input Screen */}
      {!apiKey && (
        <header className="flex flex-col items-center justify-center min-h-[80vh] px-5 text-center animate-fade-up">
           <div className="mb-6 p-4 bg-card rounded-[2rem] shadow-xl shadow-black/5 border border-divider">
                <Key size={48} className="text-accent" />
           </div>
           <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 bg-gradient-to-br from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
                Get Started.
            </h1>
            <p className="text-xl md:text-2xl text-secondary font-normal mb-10 max-w-2xl">
                Please enter your Gemini API Key to continue.
            </p>
            <div className="w-full max-w-md flex flex-col md:flex-row gap-3">
                  <input 
                    type="password" 
                    value={inputKey}
                    onChange={e => setInputKey(e.target.value)}
                    className="flex-1 bg-card border border-divider rounded-full px-6 py-4 outline-none focus:border-accent text-primary placeholder-secondary shadow-sm"
                    placeholder="sk-..."
                  />
                  <button 
                    onClick={saveKey} 
                    disabled={!inputKey.trim()}
                    className="bg-accent text-white rounded-full px-8 py-4 font-semibold hover:bg-accent-hover shadow-lg shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                  >
                      Save
                  </button>
            </div>
        </header>
      )}

      {/* Hero / Upload / Library Section */}
      {!parsedData && apiKey && (
        <div className="flex flex-col items-center min-h-[80vh] px-5 pt-32 pb-20 animate-fade-up">
           
           {!tempParsedData && !isLoading && (
               <div className="text-center mb-12">
                    <div className="inline-block mb-6 p-4 bg-card rounded-[2rem] shadow-xl shadow-black/5 transition-all duration-500 hover:scale-105 border border-divider">
                        <BookOpen size={48} className="text-accent" />
                    </div>
                    <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 bg-gradient-to-br from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
                        Mastering English.
                    </h1>
                    <p className="text-xl md:text-2xl text-secondary font-normal max-w-2xl mx-auto">
                        Upload your Mock Exam PDF.<br />
                        Gemini 3 Pro will extract text, translations, and create study blanks instantly.
                    </p>
               </div>
           )}

          <div className="relative group w-full max-w-md mx-auto mb-20">
             <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="application/pdf" 
             />

             {!isLoading && !tempParsedData && (
                 <>
                    <button 
                        onClick={triggerUpload}
                        className="relative w-full overflow-hidden bg-accent hover:bg-accent-hover text-white text-lg font-semibold px-10 py-4 rounded-full shadow-xl shadow-blue-500/30 transition-all hover:-translate-y-1 active:scale-95"
                    >
                        <span className="relative z-10 flex items-center justify-center gap-3">
                            <Upload size={20} /> Upload PDF
                        </span>
                    </button>
                    <div className="mt-4 text-xs text-secondary flex items-center justify-center gap-1 text-center">
                        {isThinkingMode ? (
                            <><BrainCircuit size={12} className="text-purple-500"/> Deep Thinking Enabled (Slower, Detailed)</>
                        ) : (
                            <><Zap size={12} className="text-yellow-500"/> Standard Speed (Gemini 3 Pro)</>
                        )}
                    </div>
                 </>
             )}

             {isLoading && (
                 <div className="w-full bg-card rounded-3xl p-6 shadow-xl shadow-black/5 border border-divider animate-fade-up">
                     <div className="flex items-center justify-between mb-3">
                         <span className="text-sm font-semibold text-primary flex items-center gap-2">
                             {isThinkingMode ? <BrainCircuit size={16} className="text-purple-500 animate-pulse"/> : <Sparkles size={16} className="text-accent animate-spin"/>}
                             {loadingStatus}
                         </span>
                         <span className="text-xs text-secondary font-mono">{loadingProgress}%</span>
                     </div>
                     <div className="w-full bg-blank rounded-full h-2 overflow-hidden">
                         <div 
                            className="bg-accent h-full rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${loadingProgress}%` }}
                         />
                     </div>
                 </div>
             )}

             {/* Success / Save State */}
             {tempParsedData && (
                 <div className="w-full bg-card rounded-3xl p-8 shadow-xl shadow-black/5 border border-divider animate-fade-up flex flex-col items-center text-center">
                     <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                         <Sparkles className="text-green-500" size={32} />
                     </div>
                     <h3 className="text-2xl font-bold text-primary mb-2">Analysis Complete</h3>
                     <p className="text-secondary mb-6 text-sm">
                         Ready to review {tempParsedData.questions.length} questions.
                     </p>
                     
                     {/* Save Form */}
                     <div className="w-full mb-6 bg-blank p-1 rounded-2xl flex items-center">
                        <input 
                            type="text"
                            value={examTitle}
                            onChange={(e) => setExamTitle(e.target.value)}
                            placeholder={`Exam ${new Date().toLocaleDateString()}`}
                            className="bg-transparent border-none outline-none px-4 py-2 flex-1 text-sm text-primary placeholder-secondary"
                        />
                     </div>

                     <button 
                        onClick={handleSaveToLibrary}
                        className="w-full bg-primary hover:opacity-90 text-bg text-lg font-semibold px-8 py-4 rounded-full shadow-lg transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2 mb-3"
                     >
                        <Save size={20} /> Save to Library
                     </button>
                     
                     <button 
                        onClick={(e) => handleExportHtml(e, tempParsedData, examTitle || `Mock Exam ${new Date().toLocaleDateString()}`)}
                        className="w-full bg-card border border-divider text-primary hover:bg-blank text-lg font-semibold px-8 py-4 rounded-full transition-all active:scale-95 flex items-center justify-center gap-2 mb-3"
                     >
                        <Download size={20} /> Download HTML
                     </button>
                     
                     <button 
                         onClick={() => {
                             setParsedData(tempParsedData);
                             setTempParsedData(null);
                             window.scrollTo({ top: 0, behavior: 'smooth' });
                         }}
                         className="text-sm text-secondary hover:text-primary underline"
                     >
                         Review without saving
                     </button>
                 </div>
             )}
          </div>

          {/* Library Section */}
          {!isLoading && !tempParsedData && savedExams.length > 0 && (
            <div className="w-full max-w-4xl mx-auto mt-8 animate-fade-up">
                <h3 className="text-xl font-bold mb-6 px-4 flex items-center gap-2 text-primary">
                    <BookOpen size={20}/> Your Library
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 px-2">
                    {savedExams.map(exam => (
                        <div 
                            key={exam.id} 
                            onClick={() => handleLoadExam(exam)}
                            className="glass-card p-5 rounded-2xl border border-divider hover:border-accent/50 cursor-pointer transition-all duration-300 hover:-translate-y-1 group relative"
                        >
                             <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={(e) => handleExportHtml(e, exam.data, exam.title)}
                                    className="text-secondary hover:text-accent p-1 hover:bg-bg rounded-full"
                                    title="Download HTML"
                                >
                                    <Download size={16} />
                                </button>
                                <button 
                                    onClick={(e) => handleDeleteExam(e, exam.id)}
                                    className="text-secondary hover:text-red-500 p-1 hover:bg-bg rounded-full"
                                    title="Delete"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            
                            <div className="flex items-start gap-3 mb-4">
                                <div className="w-10 h-10 bg-accent-bg rounded-xl flex items-center justify-center flex-shrink-0">
                                    <FileText size={20} className="text-accent" />
                                </div>
                                <div className="overflow-hidden">
                                    <h4 className="font-semibold text-primary truncate pr-6">{exam.title}</h4>
                                    <p className="text-xs text-secondary flex items-center gap-1 mt-1">
                                        <Calendar size={10} /> {exam.date}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-between mt-2">
                                <span className="text-xs font-medium bg-blank px-2 py-1 rounded-md text-secondary">
                                    {exam.questionCount} Questions
                                </span>
                                <span className="text-xs font-semibold text-accent flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                    Study <ArrowRight size={12} />
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      {parsedData && (
        <main className="pt-32 pb-20 px-5 md:max-w-[85%] mx-auto">
           {/* Hero */}
           <div className="text-center py-[60px] px-[20px] max-w-[85%] mx-auto animate-fade-up">
              <h1 className="text-[58px] font-bold tracking-[-0.03em] mb-6 bg-gradient-to-br from-[var(--text-primary)] to-[var(--text-secondary)] bg-clip-text text-transparent leading-tight">
                  Mastering English.
              </h1>
              <p className="text-[22px] text-secondary font-normal">
                  2025 Oct Mock Exam Review.<br/>
                  Refined for clarity and focus.
              </p>
              <div className="mt-6 flex justify-center">
                   <button 
                    onClick={() => {
                         setParsedData(null);
                         setTempParsedData(null);
                    }}
                    className="text-sm text-accent hover:underline opacity-70 hover:opacity-100 transition-opacity flex items-center gap-1"
                  >
                    <ArrowRight size={14} className="rotate-180"/> Back to Library
                  </button>
              </div>
           </div>

           <div className="space-y-8">
              {parsedData.questions.map((q) => (
                <StudyCard 
                  key={q.id} 
                  data={q} 
                  onProgressUpdate={updateProgress}
                  apiKey={apiKey}
                />
              ))}
           </div>
        </main>
      )}

      <footer className="py-10 text-center text-secondary text-xs border-t border-divider bg-bg">
        <p>Designed with  style aesthetics. Powered by Gemini 3 Pro.</p>
      </footer>
    </div>
  );
}

export default App;