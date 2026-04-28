"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Globe } from "lucide-react";

const LOCALE_LABELS: Record<string, string> = {
  zh: "中文",
  en: "EN",
};

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const switchLocale = (next: string) => {
    // Replace leading locale segment
    const segments = pathname.split("/");
    segments[1] = next;
    router.push(segments.join("/"));
    localStorage.setItem("locale", next);
  };

  return (
    <div className="flex items-center gap-1">
      <Globe size={16} className="text-gray-400" aria-hidden />
      {routing.locales.map((l) => (
        <button
          key={l}
          onClick={() => switchLocale(l)}
          className={`px-2 py-1 rounded text-sm font-medium transition-colors ${
            l === locale
              ? "bg-primary-500 text-white"
              : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
          aria-current={l === locale ? "true" : undefined}
        >
          {LOCALE_LABELS[l]}
        </button>
      ))}
    </div>
  );
}
