"use client";

import { useEffect } from "react";
import { useApiPanelStore } from "@/store/api-panel";
import type { ApiPanelConfig } from "@/types";

/**
 * Page-level ApiPanel — registers the panel config with the store.
 * The actual UI is rendered by ApiPanelProvider in the layout.
 * Usage: drop <ApiPanel id="..." title="..." /> anywhere inside a page.
 */
export function ApiPanel({
  id,
  title,
  defaultPosition = "right",
  suggestions,
  nextSteps,
}: ApiPanelConfig) {
  const registerPanel = useApiPanelStore((s) => s.registerPanel);
  const unregisterPanel = useApiPanelStore((s) => s.unregisterPanel);

  useEffect(() => {
    registerPanel({ id, title, defaultPosition: defaultPosition ?? "right", suggestions, nextSteps });
    return () => unregisterPanel(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return null;
}
