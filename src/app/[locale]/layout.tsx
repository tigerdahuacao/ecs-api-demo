import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Navbar } from "@/components/common/Navbar";
import { CartInitializer } from "@/components/common/CartInitializer";
import { ApiPanelProvider } from "@/components/common/ApiPanelProvider";
import "../globals.css";

export const metadata: Metadata = {
  title: "ECS Demo — E-Commerce Payment Playground",
  description: "Full-stack e-commerce payment API demo",
};

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as "zh" | "en")) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const t = localStorage.getItem('theme');
                const p = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (t === 'dark' || (!t && p)) document.documentElement.classList.add('dark');
              } catch(e) {}
            `,
          }}
        />
      </head>
      <body className="bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 min-h-screen">
        <NextIntlClientProvider messages={messages}>
          <CartInitializer />
          {/*
            ApiPanelProvider wraps everything so it can:
            1. Apply padding to push content away from sidebar panels
            2. Render all registered panel UIs at layout level
          */}
          <ApiPanelProvider>
            <Navbar />
            <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
          </ApiPanelProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
