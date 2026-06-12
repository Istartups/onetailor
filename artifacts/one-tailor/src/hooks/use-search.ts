import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";

/**
 * A hook that returns the current search string and a function to update it.
 * It also triggers a re-render when the search string changes, even if the pathname stays the same.
 */
export function useSearch() {
  const [search, setSearch] = useState(window.location.search);
  const [location, setLocation] = useLocation();

  useEffect(() => {
    const handlePopState = () => {
      setSearch(window.location.search);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const updateSearch = useCallback((newSearch: string, options?: { replace?: boolean }) => {
    const url = new URL(window.location.href);
    url.search = newSearch;
    
    if (options?.replace) {
      window.history.replaceState(null, "", url.toString());
    } else {
      window.history.pushState(null, "", url.toString());
    }
    
    // Dispatch a popstate event so the hook and other listeners can react
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, []);

  return [search, updateSearch] as const;
}

/**
 * A hook that returns the current pathname AND search string, 
 * ensuring re-renders on any URL change.
 */
export function useFullLocation() {
  const [location] = useLocation();
  const [search] = useSearch();
  
  return location + search;
}
