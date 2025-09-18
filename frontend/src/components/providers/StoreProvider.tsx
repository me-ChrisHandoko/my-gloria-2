'use client';

import { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { store } from '@/store';

interface StoreProviderProps {
  children: ReactNode;
}

/**
 * Redux Store Provider Component
 * Wraps the application with Redux Provider to enable state management
 */
export function StoreProvider({ children }: StoreProviderProps) {
  return <Provider store={store}>{children}</Provider>;
}