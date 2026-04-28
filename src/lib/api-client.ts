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
    const store = useApiPanelStore.getState();
    store.setEntry(panelId, {
      request,
      response: { status: res.status, ok: res.ok, data },
      timestamp: Date.now(),
    });
    // Auto-open the panel when new data arrives
    const instance = store.instances[panelId];
    if (!instance?.isOpen) {
      store.setOpen(panelId, true);
    }
  }

  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? "Request failed");
  }

  return data;
}
