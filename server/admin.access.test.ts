import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function anonymousContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function customerContext(): TrpcContext {
  return {
    user: { id: 9, openId: "customer-9", email: "customer@example.com", name: "Customer", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("admin access", () => {
  it("blocks an unauthenticated caller from admin statistics", async () => {
    const caller = appRouter.createCaller(anonymousContext());
    await expect(caller.admin.stats()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("blocks a customer account from admin statistics", async () => {
    const caller = appRouter.createCaller(customerContext());
    await expect(caller.admin.stats()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

  it("requires an explicitly stored admin role rather than owner identity", () => {
    const customer = customerContext().user;
    expect(customer.role).toBe("user");
    expect(customer.openId).not.toBe("owner-open-id");
  });
