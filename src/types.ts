export interface VocabItem {
    word: string;
    meaning: string;
  }
  
  export interface ExamQuestion {
    id: string;
    tag: string;
    text: string;
    trans: string;
    vocab: VocabItem[];
    summary: string;
  }
  
  export interface ParsedExamData {
    questions: ExamQuestion[];
  }
  
  export type ChatMessage = {
    role: 'user' | 'model';
    text: string;
  };

  export type ProgressCallback = (status: string, progress: number) => void;