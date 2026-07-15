import { describe, expect, it } from "vitest";
import { getShareLinkErrorMessage } from "../../src/utils/shareLinkErrors";

describe("getShareLinkErrorMessage", () => {
  it("returns a clear expired message for expired or revoked links", () => {
    expect(getShareLinkErrorMessage({ response: { data: { message: "Share link has expired" } } })).toBe(
      "This link has expired or been revoked.",
    );
  });

  it("falls back to a generic invalid-link message for unknown errors", () => {
    expect(getShareLinkErrorMessage(new Error("Network down"))).toBe(
      "This share link is invalid, expired, or revoked.",
    );
  });
});
