import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import messages from "../i18n/messages/en.json";
import "./globals.css";

export const metadata: Metadata = {
  title: "Workflow App",
  description: "AI Workflow Designer",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <body className="h-full overflow-hidden">
        <NextIntlClientProvider locale="en" messages={messages}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <div className="h-full w-full">
              {children}
            </div>
            <Toaster />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
