// app/layout.js
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./_components/theme-provider";
import NotificationPermission from "./_components/NotificationPermission";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Circuit ",
  description: "Start your journey with Zager Digital Services since 2017",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
        <head>
        <title>{metadata.title}</title>
        <meta name="description" content="Start your journey with Zager Digital Services since 2017" />
        <link rel="icon" href="/logo.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/logo.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/logo.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/logo.png" />
        <meta
          name="keywords"
          content="Start your journey with Zager Digital Services since 2017 by ZagerStream."
        />
      </head>
      <body className={`${inter.className} dark:bg-slate-700 bg-slate-200`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NotificationPermission />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
