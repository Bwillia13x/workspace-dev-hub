
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  cadImageUrl?: string;
  materials?: string[];
  creator: string;
  likes: number;
}

export enum AppView {
  STUDIO = 'STUDIO',
  MARKETPLACE = 'MARKETPLACE'
}

export interface GenerationState {
  isGenerating: boolean;
  stage: 'idle' | 'concept' | 'editing' | 'engineering' | 'publishing';
  error: string | null;
}

export interface DesignDraft {
  conceptImage: string | null; // Base64
  cadImage: string | null; // Base64
  materials: string;
  history: string[]; // History of images for undo potentially
}

export interface SavedDraft {
  id: string;
  name: string;
  timestamp: number;
  data: DesignDraft;
  prompt: string;
}

export type NotificationType = 'success' | 'error' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
}
