import Link from "next/link";
import { Button } from "ui/button";
import { ArrowLeft } from "lucide-react";

export default function NodeDesignerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="sticky top-0 z-10 shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 w-full items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link href="/workflow/node-designer">
              <Button variant="ghost" size="icon" className="shrink-0">
                <ArrowLeft className="size-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Node Designer</h1>
              <p className="text-xs text-muted-foreground">
                Define custom node types with Input → Process → Output graphs.
              </p>
            </div>
          </div>
          <Link href="/workflow">
            <Button variant="outline" size="sm">
              Back to Workflows
            </Button>
          </Link>
        </div>
      </header>
      <main className="flex flex-1 flex-col px-4 py-6">{children}</main>
    </div>
  );
}
