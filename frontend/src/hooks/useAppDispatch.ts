import { useDispatch } from 'react-redux';
import type { AppDispatch } from '@/store';

/**
 * Typed version of useDispatch hook
 * Use this instead of plain `useDispatch` for type safety
 *
 * @example
 * const dispatch = useAppDispatch();
 * dispatch(setUser(userData));
 */
export const useAppDispatch = () => useDispatch<AppDispatch>();