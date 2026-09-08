import type { FavoriteItem } from './api';

export type FavoritesState = {
  phase: 'loading' | 'ready' | 'error' | 'unauthorized';
  items: FavoriteItem[];
  pending: string[];
  errors: Record<string, string>;
  notice: string;
};
export const initialFavoritesState: FavoritesState = {
  phase: 'loading', items: [], pending: [], errors: {}, notice: '',
};
export type FavoritesAction =
  | { type: 'loaded'; items: FavoriteItem[] }
  | { type: 'load-failed'; status: number }
  | { type: 'remove-start'; id: string }
  | { type: 'remove-done'; id: string }
  | { type: 'remove-failed'; id: string; status: number };

export function favoritesReducer(state: FavoritesState, action: FavoritesAction): FavoritesState {
  switch (action.type) {
    case 'loaded':
      return { ...initialFavoritesState, phase: 'ready', items: action.items };
    case 'load-failed':
      return { ...initialFavoritesState, phase: action.status === 401 ? 'unauthorized' : 'error' };
    case 'remove-start':
      if (state.pending.includes(action.id)) return state;
      return { ...state, pending: [...state.pending, action.id], errors: { ...state.errors, [action.id]: '' }, notice: '' };
    case 'remove-done':
      return { ...state, items: state.items.filter((item) => item.listing.id !== action.id), pending: state.pending.filter((id) => id !== action.id), errors: { ...state.errors, [action.id]: '' }, notice: 'Объявление удалено из избранного.' };
    case 'remove-failed':
      if (action.status === 401) return { ...initialFavoritesState, phase: 'unauthorized' };
      return { ...state, pending: state.pending.filter((id) => id !== action.id), errors: { ...state.errors, [action.id]: 'Не удалось подтвердить удаление. Попробуйте ещё раз.' } };
  }
}
