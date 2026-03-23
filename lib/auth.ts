import { betterAuth } from "better-auth";
import { polar, checkout, portal, webhooks } from "@polar-sh/better-auth";
import { Polar } from "@polar-sh/sdk";
import { pool } from "./db";
import { sendVerificationEmail, sendPasswordResetEmail } from "./email";

// Resolve a Better Auth user ID from a Polar customer object.
// Tries in order: externalId → polarCustomerId column → email.
async function resolveUserId(
  customer: { id?: string; externalId?: string | null; email?: string } | undefined | null
): Promise<string | null> {
  if (!customer) return null;

  if (customer.externalId) {
    const { rows } = await pool.query<{ id: string }>(
      `SELECT id FROM "user" WHERE id = $1`,
      [customer.externalId]
    );
    if (rows[0]) return rows[0].id;
  }

  if (customer.id) {
    const { rows } = await pool.query<{ id: string }>(
      `SELECT id FROM "user" WHERE "polarCustomerId" = $1`,
      [customer.id]
    );
    if (rows[0]) return rows[0].id;
  }

  if (customer.email) {
    const { rows } = await pool.query<{ id: string }>(
      `SELECT id FROM "user" WHERE email = $1`,
      [customer.email]
    );
    if (rows[0]) return rows[0].id;
  }

  return null;
}

const polarClient = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN,
  server: "sandbox",
});

export const auth = betterAuth({
  database: pool,
  emailAndPassword: {
    enabled: true,
    sendVerificationEmail: async ({ user, url }: { user: { email: string }; url: string }) => {
      await sendVerificationEmail(user.email, url);
    },
    sendResetPassword: async ({ user, url }: { user: { email: string }; url: string }) => {
      await sendPasswordResetEmail(user.email, url);
    },
  },
  trustedOrigins: [process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"],
  plugins: [
    polar({
      client: polarClient,
      createCustomerOnSignUp: true,
      use: [
        checkout({
          products: [
            {
              productId: process.env.POLAR_PRODUCT_ID!,
              slug: "pro",
            },
          ],
          successUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/dashboard?checkout=success`,
          authenticatedUsersOnly: true,
        }),
        portal(),
        webhooks({
          secret: process.env.POLAR_WEBHOOK_SECRET!,
          onSubscriptionActive: async (payload) => {
            const userId = await resolveUserId(payload.data.customer);
            if (userId) {
              await pool.query(
                `UPDATE "user" SET plan = 'pro', "polarSubscriptionId" = $2, "polarCustomerId" = $3 WHERE id = $1`,
                [userId, payload.data.id, payload.data.customer?.id]
              );

              // Record revenue event on all user's sites
              const amount = (payload.data.amount ?? 0) / 100;
              const currency = (payload.data.currency ?? "USD").toUpperCase();
              const { rows: sites } = await pool.query<{ id: string }>(
                `SELECT id FROM sites WHERE user_id = $1`,
                [userId]
              );
              for (const site of sites) {
                await pool.query(
                  `INSERT INTO custom_events (site_id, session_id, name, revenue, currency, pathname)
                   VALUES ($1, $2, 'subscription_started', $3, $4, '/dashboard')`,
                  [site.id, `polar_${payload.data.id}`, amount || null, amount ? currency : null]
                );
              }
            }
          },
          onSubscriptionCanceled: async (payload) => {
            const userId = await resolveUserId(payload.data.customer);
            if (userId) {
              await pool.query(
                `UPDATE "user" SET "polarSubscriptionId" = NULL WHERE id = $1`,
                [userId]
              );
            }
          },
          onSubscriptionRevoked: async (payload) => {
            const userId = await resolveUserId(payload.data.customer);
            if (userId) {
              await pool.query(
                `UPDATE "user" SET "polarSubscriptionId" = NULL WHERE id = $1`,
                [userId]
              );
            }
          },
        }),
      ],
    }),
  ],
});
