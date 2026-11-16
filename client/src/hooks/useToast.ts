import { create } from 'zustand';

export type ToastTone = 'default' | 'success' | 'error' | 'warning';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
  duration: number;
}

interface ToastState {
  toasts: ToastMessage[];
  push: (toast: Omit<ToastMessage, 'id' | 'tone' | 'duration'> & Partial<ToastMessage>) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

const MAX_VISIBLE = 4;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  push: (toast) => {
    const id = Math.random().toString(36).slice(2, 10);
    const next: ToastMessage = {
      id,
      title: toast.title,
      description: toast.description,
      tone: toast.tone ?? 'default',
      duration: toast.duration ?? 5000,
    };
    // Oldest toasts drop off so the stack never covers the page.
    set((state) => ({ toasts: [...state.toasts, next].slice(-MAX_VISIBLE) }));
    return id;
  },

  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) })),

  clear: () => set({ toasts: [] }),
}));

/** Convenience wrapper so components call `toast.success(...)`. */
export const toast = {
  show: (title: string, description?: string) =>
    useToastStore.getState().push({ title, description, tone: 'default' }),
  success: (title: string, description?: string) =>
    useToastStore.getState().push({ title, description, tone: 'success' }),
  error: (title: string, description?: string) =>
    useToastStore.getState().push({ title, description, tone: 'error', duration: 7000 }),
  warning: (title: string, description?: string) =>
    useToastStore.getState().push({ title, description, tone: 'warning' }),
};

export const useToast = () => {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);
  return { toasts, dismiss, toast };
};
