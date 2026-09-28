import type { HTMLAttributes } from "react";

type MarkProps = {
  className?: string;
  inverse?: boolean;
};

export function ImobControlMark({ className = "h-9 w-9", inverse = false }: MarkProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="ImobControl"
    >
      <path d="M7 52V35.5L19 28v24H7Z" fill="#35A4F5" />
      <path d="M24 52V24L36 16.5V52H24Z" fill="#2F78BC" />
      <path
        d="M41 52V12.5L51.5 6 58 10.1V52H41Z"
        fill={inverse ? "#FFFFFF" : "#0F2747"}
      />
    </svg>
  );
}

type BrandProps = HTMLAttributes<HTMLDivElement> & {
  compact?: boolean;
  inverse?: boolean;
  showTagline?: boolean;
};

export function ImobControlBrand({
  className = "",
  compact = false,
  inverse = false,
  showTagline = true,
  ...props
}: BrandProps) {
  const foreground = inverse ? "text-white" : "text-[#0F2747]";
  const secondary = inverse ? "text-white/65" : "text-muted-foreground";

  return (
    <div className={`flex items-center gap-3 ${className}`} {...props}>
      <ImobControlMark className={compact ? "h-9 w-9" : "h-11 w-11"} inverse={inverse} />
      {!compact && (
        <div className="min-w-0 leading-tight">
          <div className={`text-[1.05rem] font-bold tracking-[-0.03em] ${foreground}`}>
            ImobControl
          </div>
          {showTagline && (
            <div className={`mt-0.5 text-xs font-medium ${secondary}`}>
              Gestão imobiliária
            </div>
          )}
        </div>
      )}
    </div>
  );
}
