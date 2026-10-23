import { useEffect, useState } from 'react';
import { content } from './client';
import type { CollectionName, Collections } from './types';

interface CollectionState<T> {
  data: T[];
  loading: boolean;
  error?: Error;
}

/** Lê uma coleção inteira do repositório. */
export function useCollection<K extends CollectionName>(collection: K): CollectionState<Collections[K]> {
  const [state, setState] = useState<CollectionState<Collections[K]>>({ data: [], loading: true });

  useEffect(() => {
    let alive = true;
    content
      .list(collection)
      .then((data) => alive && setState({ data, loading: false }))
      .catch((error: Error) => alive && setState({ data: [], loading: false, error }));
    return () => {
      alive = false;
    };
  }, [collection]);

  return state;
}
