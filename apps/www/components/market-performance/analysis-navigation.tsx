"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, type ComponentProps } from "react";

import { analysisEntryStore } from "./analysis-entry";

const RETURN_KEY = "marsAnalysisReturn";
type ReturnEntry = { pathname: string; from: string };

// Keep return destinations on their own history entries, including back/forward.
export function AnalysisNavigationTracker() {
  useEffect(() => {
    const onLink = (event: MouseEvent) => {
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        event.defaultPrevented
      )
        return;
      const link =
        event.target instanceof Element
          ? event.target.closest("a[href]")
          : null;
      if (
        !(link instanceof HTMLAnchorElement) ||
        link.target === "_blank" ||
        link.hasAttribute("download") ||
        link.hasAttribute("data-analysis-back")
      )
        return;
      const destination = new URL(link.href, window.location.href);
      if (
        destination.origin !== window.location.origin ||
        !/\/analysis(?:\/|$)/.test(destination.pathname)
      )
        return;
      if (
        destination.pathname === window.location.pathname &&
        destination.search === window.location.search
      )
        return;
      analysisEntryStore.enter(destination.pathname);
    };
    document.addEventListener("click", onLink, true);
    return () => document.removeEventListener("click", onLink, true);
  }, []);
  const pathname = usePathname();
  const query = useSearchParams().toString();
  const previous = useRef<{ pathname: string; url: string } | null>(null);
  const activeReturn = useRef<ReturnEntry | null>(null);
  useEffect(() => {
    const current = { pathname, url: `${pathname}${query ? `?${query}` : ""}` };
    const stored = window.history.state?.[RETURN_KEY] as
      | ReturnEntry
      | undefined;
    const prior = previous.current;
    let entry = stored?.pathname === pathname ? stored : null;
    if (!entry && prior?.pathname === pathname) entry = activeReturn.current;
    if (!entry && prior && prior.pathname !== pathname) {
      const expectedParent = pathname.endsWith("/analysis/market")
        ? pathname.replace(/\/market$/, "")
        : pathname.endsWith("/analysis")
          ? pathname.replace(/analysis$/, "")
          : pathname.includes("/events/")
            ? prior.pathname
            : null;
      if (expectedParent === prior.pathname) {
        entry = { pathname, from: prior.url };
      }
    }
    activeReturn.current = entry;
    previous.current = current;
    if (stored !== entry) {
      window.history.replaceState(
        { ...window.history.state, [RETURN_KEY]: entry },
        "",
      );
    }
  }, [pathname, query]);
  return null;
}

export function AnalysisBackLink(props: ComponentProps<typeof Link>) {
  const router = useRouter();
  return (
    <Link
      {...props}
      data-analysis-back="true"
      replace
      onClick={(event) => {
        props.onClick?.(event);
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        )
          return;
        const entry = window.history.state?.[RETURN_KEY] as
          | ReturnEntry
          | undefined;
        if (entry?.pathname === window.location.pathname) {
          event.preventDefault();
          router.back();
        }
      }}
    />
  );
}
