import { buildMetadata } from "@/lib/metadata";

export const metadata = buildMetadata("Home", "Welcome to your new app");

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-[60dvh] max-w-2xl flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">Welcome</h1>
      <p className="text-muted-foreground">
        This is a blank Next.js + Tailwind + shadcn/ui starter with Drizzle and
        a Neon database already wired up. Edit <code className="rounded bg-muted px-1.5 py-0.5 text-sm">app/page.tsx</code> to
        replace this screen, or add a new entity in
        <code className="rounded bg-muted px-1.5 py-0.5 text-sm">db/schema</code> and expose it via
        <code className="rounded bg-muted px-1.5 py-0.5 text-sm">openapi.yaml</code> +
        <code className="rounded bg-muted px-1.5 py-0.5 text-sm">app/api</code>.
      </p>
    </main>
  );
}
