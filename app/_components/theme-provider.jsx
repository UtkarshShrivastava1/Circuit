"use client";

import React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children, ...props }) {
  return <NextThemesProvider  attribute="class"
      defaultTheme="light"   // set light as default
      enableSystem={false}   // disable system theme detection
      {...props}>{children}</NextThemesProvider>;
}
