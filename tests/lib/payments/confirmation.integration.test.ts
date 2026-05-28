// Feature: razorpay-payment-hardening, Property 12: confirmation UI is driven by server truth
//
// The confirmation page is a server component that fetches booking status from
// /api/bookings/by-ref and renders from THAT, never from URL params. So:
//   • "Confirmed · paid" appears iff the server-returned status is paid|confirmed,
//     regardless of any total/name/item URL params;
//   • spoofed URL params never appear in the output — the server's values win.
//
// We render the real page (awaiting the async component, then renderToStaticMarkup)
// with presentational children stubbed, so the assertion targets the status→copy
// logic rather than styling.

import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";
import { renderToStaticMarkup } from "react-dom/server";

// Stub presentational children to passthroughs so the page's own copy renders.
vi.mock("@/components/shared/SiteShell", () => ({ default: ({ children }: any) => children }));
vi.mock("@/components/ui/Button", () => ({ default: ({ children }: any) => children }));
vi.mock("@/components/ui/Ornament", () => ({ default: () => null }));
vi.mock("next/link", () => ({ default: ({ children }: any) => children }));
vi.mock("@/lib/design", () => ({ BRAND: { phone: "+91 12345 67890" } }));
vi.mock("next/headers", () => ({
  headers: () => ({ get: (k: string) => (k.includes("host") ? "localhost:3000" : "http") }),
}));

import ConfirmationPage from "@/app/confirmation/page";

function mockByRef(status: string, dataOverrides: Record<string, unknown> = {}) {
  (globalThis as any).fetch = vi.fn(async () => ({
    status: 200,
    ok: true,
    json: async () => ({
      success: true,
      data: {
        bookingRef: "KB-CONF-0001",
        guestFirstName: "Asha",
        itemName: "Deluxe Room",
        itemType: "room",
        status,
        totalPrice: 5000,
        currency: "INR",
        ...dataOverrides,
      },
    }),
  }));
}

function mockByRefStatus(httpStatus: number) {
  (globalThis as any).fetch = vi.fn(async () => ({
    status: httpStatus,
    ok: httpStatus >= 200 && httpStatus < 300,
    json: async () => ({}),
  }));
}

async function render(searchParams: Record<string, string>): Promise<string> {
  const el = await ConfirmationPage({ searchParams } as any);
  return renderToStaticMarkup(el as any);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Property 12 — confirmation UI driven by server truth", () => {
  it("'Confirmed · paid' shows iff server status is paid|confirmed, for any URL params", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom("paid", "confirmed", "pending", "cancelled", "authorized", "weird"),
        fc.record({
          total: fc.string({ maxLength: 12 }),
          name: fc.string({ maxLength: 12 }),
          item: fc.string({ maxLength: 12 }),
        }),
        async (status, params) => {
          mockByRef(status);
          const html = await render({ ref: "KB-CONF-0001", ...params });
          const shown = html.includes("Confirmed · paid");
          expect(shown).toBe(status === "paid" || status === "confirmed");
        }
      ),
      { numRuns: 150 }
    );
  });

  it("ignores spoofed URL params and renders the server's values", async () => {
    mockByRef("paid", { totalPrice: 5000, guestFirstName: "Asha", itemName: "Deluxe Room" });
    const html = await render({
      ref: "KB-CONF-0001",
      total: "999999",
      name: "HACKER",
      item: "FAKE-ITEM",
    });
    expect(html).toContain("Confirmed · paid");
    expect(html).toContain("5,000"); // server total, en-IN formatted
    expect(html).toContain("Asha"); // server guest name
    expect(html).not.toContain("999999");
    expect(html).not.toContain("HACKER");
    expect(html).not.toContain("FAKE-ITEM");
  });

  it("a paid URL param cannot fake a pending booking into confirmed", async () => {
    mockByRef("pending");
    const html = await render({ ref: "KB-CONF-0001", status: "paid", paid: "true" });
    expect(html).not.toContain("Confirmed · paid");
    expect(html).toContain("Awaiting payment confirmation");
  });

  it("renders not-found for an unknown ref (404)", async () => {
    mockByRefStatus(404);
    const html = await render({ ref: "KB-UNKNOWN" });
    expect(html).toContain("Booking not found");
    expect(html).not.toContain("Confirmed · paid");
  });

  it("renders the reference-required state when ref is absent", async () => {
    const html = await render({});
    expect(html).toContain("Booking reference required");
  });

  it("renders the cancelled state from server status", async () => {
    mockByRef("cancelled");
    const html = await render({ ref: "KB-CONF-0001" });
    expect(html).toContain("cancelled");
    expect(html).not.toContain("Confirmed · paid");
  });
});
