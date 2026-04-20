import type { Metadata } from "next";

const APP_NAME = "Buildra App";
const APP_DESCRIPTION = "Built with Buildra";

/**
 * Build per-page Metadata with consistent title formatting and sane
 * Open Graph defaults. Use in every `app/<route>/page.tsx`:
 *
 *   export const metadata = buildMetadata("Customers", "Manage your CRM contacts");
 *
 * The root layout uses `title.template` so page titles render as
 * "Customers · Buildra App" without each page having to remember the suffix.
 */
export function buildMetadata(
  title: string,
  description: string = APP_DESCRIPTION,
): Metadata {
  return {
    title,
    description,
    openGraph: {
      title: `${title} · ${APP_NAME}`,
      description,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: `${title} · ${APP_NAME}`,
      description,
    },
  };
}

export const ROOT_METADATA: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
};
