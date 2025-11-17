export type View = 'tutor' | 'practice' | 'lab' | 'diagram';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface PracticeProblem {
  problem: string;
  options: {
    a: string;
    b: string;
    c: string;
    d: string;
  };
  correctAnswer: 'a' | 'b' | 'c' | 'd';
  solution: string;
  youtubeLink: string;
}

export interface TopicSummary {
  keyConcepts: string;
  formulas: string;
  solvingTechniques: string;
}
