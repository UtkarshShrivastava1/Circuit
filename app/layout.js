// app/layout.js
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./_components/theme-provider";
import NotificationPermission from "./_components/NotificationPermission";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Circuit",
  description: "Start your journey with Zager Digital Services since 2017",
  icons: {
    icon: "/IMG_1570.PNG?v=2", // ✅ cache-busting query
    shortcut: "/IMG_1570.PNG?v=2",
    apple: "/IMG_1570.PNG?v=2",
  },
  keywords: [
    "Zager Digital Services",
    "ZagerStream",
    "Circuit",
    "Healthcare",
    "Technology",
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
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
