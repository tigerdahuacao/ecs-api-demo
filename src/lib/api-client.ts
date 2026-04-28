import { useApiPanelStore } from "@/store/api-panel";

interface FetchOptions extends RequestInit {
  panelId?: string;
}

export async function apiFetch<T>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const { panelId, ...fetchOptions } = options;

  const requestBody = fetchOptions.body
    ? JSON.parse(fetchOptions.body as string)
    : undefined;

  const request = {
    method: fetchOptions.method ?? "GET",
    url,
    body: requestBody,
  };

  const res = await fetch(url, fetchOptions);
  const data = (await res.json()) as T;

  if (panelId) {
    useApiPanelStore.getState().setEntry(panelId, {
      request,
      response: { status: res.status, ok: res.ok, data },
      timestamp: Date.now(),
    });
    // Auto-open panel when new data arrives
    const settings = useApiPanelStore.getState().getSettings(panelId);
    if (!settings.isOpen) {
      useApiPanelStore.getState().setOpen(panelId, true);
    }
  }

  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? "Request failed");
  }

  return data;
}
