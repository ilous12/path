"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { SketchMode } from "./sketch-mode";
import type * as React from "react";

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="celeste-dark"
      disableTransitionOnChange
      enableColorScheme
      enableSystem
      {...props}
    >
      {children}
      <SketchMode />
    </NextThemesProvider>
  );
}
