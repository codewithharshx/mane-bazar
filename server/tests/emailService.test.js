const test = require("node:test");
const assert = require("node:assert/strict");
const {
  queuePasswordResetEmail,
  __private__
} = require("../services/emailService");

test("renderTemplate injects dynamic placeholders", () => {
  const rendered = __private__.renderTemplate("Hello {{name}}, reset: {{resetUrl}}", {
    name: "Asha",
    resetUrl: "https://example.com/reset"
  });

  assert.equal(rendered, "Hello Asha, reset: https://example.com/reset");
});

test("queuePasswordResetEmail does not throw in non-production when transport is missing", async () => {
  const originalEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "test";

  await assert.doesNotReject(async () => {
    await queuePasswordResetEmail({
      to: "test@example.com",
      name: "User",
      resetToken: "abc123token",
      expiresMinutes: 30
    });
  });

  process.env.NODE_ENV = originalEnv;
});
