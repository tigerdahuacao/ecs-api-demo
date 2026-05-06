/**
 * @file src/lib/__tests__/route-logger.test.ts
 * Tests for withLogger — HOF Decorator pattern for route handlers
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { withLogger } from "../route-logger";

// ── 辅助：构造轻量 request / Helper: minimal request-like object ──────────────
function makeReq(method = "GET"): Request {
  return new Request(`http://localhost/test`, { method });
}

// ── 辅助：构造 JSON response / Helper: JSON response ──────────────────────────
function jsonRes(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("withLogger", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── 基本透传 / Passthrough ──────────────────────────────────────────────────

  it("calls the handler with the incoming request", async () => {
    const handler = vi.fn().mockResolvedValue(jsonRes({ ok: true }));
    const req = makeReq("POST");
    await withLogger("[test]", handler)(req);
    expect(handler).toHaveBeenCalledWith(req);
  });

  it("returns the response produced by the handler", async () => {
    const mockRes = jsonRes({ id: "abc" }, 201);
    const res = await withLogger("[test]", async () => mockRes)(makeReq());
    expect(res.status).toBe(201);
  });

  // ── 入口 / 出口日志 / Entry + exit logging ──────────────────────────────────

  it("logs entry with tag and method", async () => {
    await withLogger("[API]", async () => jsonRes({}))(makeReq("DELETE"));
    expect(console.log).toHaveBeenCalledWith("[API] <- DELETE");
  });

  it("logs exit with tag, status, and elapsed time", async () => {
    await withLogger("[API]", async () => jsonRes({ created: true }, 201))(makeReq());
    expect(console.log).toHaveBeenCalledWith(
      expect.stringMatching(/\[API\] -> 201 \(\d+ms\)/)
    );
  });

  // ── 异常捕获 / Exception handling ──────────────────────────────────────────

  it("catches unhandled exceptions and returns HTTP 500", async () => {
    const handler = async () => { throw new Error("boom"); };
    const res = await withLogger("[test]", handler)(makeReq("POST"));
    expect(res.status).toBe(500);
  });

  it("returns JSON body with success:false on exception", async () => {
    const handler = async () => { throw new Error("db error"); };
    const res = await withLogger("[test]", handler)(makeReq());
    const body = await res.json() as { success: boolean; error: string };
    expect(body.success).toBe(false);
    expect(body.error).toContain("db error");
  });

  it("logs exception with console.error", async () => {
    const err = new Error("boom");
    await withLogger("[ERR]", async () => { throw err; })(makeReq());
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("[ERR] EXCEPTION"),
      err
    );
  });

  it("does NOT log exit via console.log when an exception occurs", async () => {
    await withLogger("[test]", async () => { throw new Error(); })(makeReq());
    const logCalls = (console.log as ReturnType<typeof vi.spyOn>).mock.calls;
    const exitCall = logCalls.find((c: unknown[]) => String(c[0]).includes("->"));
    expect(exitCall).toBeUndefined();
  });

  // ── tag 正确传递 / Tag propagation ─────────────────────────────────────────

  it("uses the provided tag in all log messages", async () => {
    await withLogger("[MY_ROUTE]", async () => jsonRes({}))(makeReq());
    const logCalls = (console.log as ReturnType<typeof vi.spyOn>).mock.calls;
    const allMessages = logCalls.map((c: unknown[]) => String(c[0]));
    expect(allMessages.every((m: string) => m.startsWith("[MY_ROUTE]"))).toBe(true);
  });
});
