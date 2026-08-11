"use client";

import { useEffect, useState } from "react";

interface FetchState<T> {
  data: T | null;
  error: string | null;
}

/**
 * Re-fetches whenever `url` changes - callers build `url` from the current filter
 * state (typically the page's own URL query string), so a filter change naturally
 * triggers a fresh request rather than re-slicing an already-fetched dataset.
 *
 * Data and error are replaced together in one state update, and only from inside the
 * fetch promise's own callbacks - never synchronously in the effect body - so a filter
 * change doesn't flash the UI to a loading/error state before the new response lands;
 * the previous data just stays on screen until it's replaced.
 */
export function useFetchJson<T>(url: string): FetchState<T> {
  const [state, setState] = useState<FetchState<T>>({ data: null, error: null });

  useEffect(() => {
    let cancelled = false;
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`API returned ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (!cancelled) setState({ data: json, error: null });
      })
      .catch((err) => {
        if (!cancelled) setState({ data: null, error: String(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return state;
}
