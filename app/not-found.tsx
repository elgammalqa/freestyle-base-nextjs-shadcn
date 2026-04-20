import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-start gap-4 py-16">
      <p className="text-sm font-mono text-muted-foreground">404</p>
      <h2 className="text-3xl font-semibold tracking-tight">
        Page not found
      </h2>
      <p className="text-muted-foreground">
        That URL doesn&apos;t match any page in this app. It may have been
        moved or never existed.
      </p>
      <Button asChild className="mt-2">
        <Link href="/">Back to dashboard</Link>
      </Button>
    </div>
  );
}
