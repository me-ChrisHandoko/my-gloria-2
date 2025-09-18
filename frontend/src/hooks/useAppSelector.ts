import { useSelector, TypedUseSelectorHook } from 'react-redux';
import type { RootState } from '@/store';

/**
 * Typed version of useSelector hook
 * Use this instead of plain `useSelector` for type safety
 *
 * @example
 * const user = useAppSelector(state => state.auth.user);
 * const isAuthenticated = useAppSelector(selectIsAuthenticated);
 */
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;