/**
 * @file src/store/__tests__/payment.test.ts
 * Tests for usePaymentStore — express checkout global state
 */
import { describe, it, expect, beforeEach } from "vitest";
import { usePaymentStore } from "../payment";

describe("usePaymentStore", () => {
  beforeEach(() => {
    usePaymentStore.setState({ expressOrderId: null });
  });

  it("has null expressOrderId initially", () => {
    expect(usePaymentStore.getState().expressOrderId).toBeNull();
  });

  it("setExpressOrder stores the orderId", () => {
    usePaymentStore.getState().setExpressOrder("ORDER-123");
    expect(usePaymentStore.getState().expressOrderId).toBe("ORDER-123");
  });

  it("setExpressOrder overwrites a previous orderId", () => {
    usePaymentStore.getState().setExpressOrder("ORDER-AAA");
    usePaymentStore.getState().setExpressOrder("ORDER-BBB");
    expect(usePaymentStore.getState().expressOrderId).toBe("ORDER-BBB");
  });

  it("clearExpressOrder resets to null", () => {
    usePaymentStore.getState().setExpressOrder("ORDER-123");
    usePaymentStore.getState().clearExpressOrder();
    expect(usePaymentStore.getState().expressOrderId).toBeNull();
  });

  it("clearExpressOrder is a no-op when already null", () => {
    usePaymentStore.getState().clearExpressOrder();
    expect(usePaymentStore.getState().expressOrderId).toBeNull();
  });
});
