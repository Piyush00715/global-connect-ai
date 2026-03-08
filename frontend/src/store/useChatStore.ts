import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  senderId: string;
  originalText: string;
  translatedText?: string;
  senderLanguage: string;
  targetLanguage?: string;
  clarification?: string;
  timestamp: string;
  isSelf?: boolean;
}

interface ChatState {
  userId: string;
  language: string;
  connected: boolean;
  messages: ChatMessage[];
  partnerTyping: boolean;
  setLanguage: (lang: string) => void;
  setConnected: (status: boolean) => void;
  addMessage: (msg: ChatMessage) => void;
  setPartnerTyping: (typing: boolean) => void;
  setUserId: (id: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  userId: '',
  language: 'en',
  connected: false,
  messages: [],
  partnerTyping: false,
  setLanguage: (lang) => set({ language: lang }),
  setConnected: (status) => set({ connected: status }),
  addMessage: (msg: ChatMessage) => set((state) => ({ messages: [...state.messages, msg] })),
  setPartnerTyping: (typing: boolean) => set({ partnerTyping: typing }),
  setUserId: (id) => set({ userId: id })
}));
