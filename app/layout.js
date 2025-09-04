// app/layout.js
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./_components/theme-provider";
import NotificationPermission from "./_components/NotificationPermission";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Circuit",
  description: "Employee Management System by Zager Digital Services",
  icons: {
    icon: "/IMG_1570.PNG?v=2",
    shortcut: "/IMG_1570.PNG?v=2",
    apple: "/IMG_1570.PNG?v=2",
  },
  keywords: [
    "Zager Digital Services",
    "ZagerStream",
    "Circuit",
    "Office ERP",
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
