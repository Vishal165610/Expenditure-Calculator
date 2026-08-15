import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Room C67 — Shared Expense Tracker" },
      {
        name: "description",
        content:
          "Track rent, utilities and shared roommate expenses for Room C67 with smart settle-up.",
      },
      { property: "og:title", content: "Room C67 — Shared Expense Tracker" },
      {
        property: "og:description",
        content: "Rent, metered utilities, shared expenses and one-tap settle-up for four roommates.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
});
