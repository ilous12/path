"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ComponentProps } from "react";

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
  useEffect(() => {
    // Observe actual history writes, including router.push and same-path queries.
    // Keep Next's original history implementation and its state fields intact.
    const originalPush = window.history.pushState;
    const originalReplace = window.history.replaceState;
    const push: History["pushState"] = function (this: History, state, unused, url) {
      const from = window.location.pathname + window.location.search;
      const destination = new URL(url?.toString() ?? window.location.href, window.location.href);
      const entry = destination.origin === window.location.origin
        ? { pathname: destination.pathname, from }
        : null;
      originalPush.call(this, { ...state, marsViewState: {}, [RETURN_KEY]: entry }, unused, url);
    };
    const replace: History["replaceState"] = function (this: History, state, unused, url) {
      const entry = window.history.state?.[RETURN_KEY] ?? null;
      originalReplace.call(this, { ...state, marsViewState: state?.marsViewState ?? window.history.state?.marsViewState, [RETURN_KEY]: entry }, unused, url);
    };
    window.history.pushState = push;
    window.history.replaceState = replace;
    return () => {
      if (window.history.pushState === push) window.history.pushState = originalPush;
      if (window.history.replaceState === replace) window.history.replaceState = originalReplace;
    };
  }, []);
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
