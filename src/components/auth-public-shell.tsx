import type { ReactNode } from "react";

import { ImobControlBrand } from "@/components/imobcontrol-brand";
import { Card, CardContent } from "@/components/ui/card";

export function AuthPublicShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
      <div className="w-full max-w-[460px]">
        <div className="mb-9">
          <ImobControlBrand />
        </div>

        <div className="mb-6">
          <div className="mb-3 inline-flex rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
            {eyebrow}
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.035em] text-foreground">
            {title}
          </h1>
          <p className="mt-2.5 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>

        <Card className="overflow-hidden border-border/70 bg-card/95 shadow-[0_18px_60px_-28px_rgba(15,39,71,0.28)]">
          <div className="h-1 bg-gradient-to-r from-[#35A4F5] via-[#2F78BC] to-[#0F2747]" />
          <CardContent className="p-6 sm:p-8">{children}</CardContent>
        </Card>
      </div>
    </div>
  );
}
