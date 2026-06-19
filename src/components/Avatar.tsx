import { cn, getInitials } from "@/lib/utils";

interface AvatarProps {
  name: string;
  color: string;
  size?: "sm" | "md" | "lg";
  online?: boolean;
  className?: string;
}

const sizes = {
  sm: "h-9 w-9 text-xs",
  md: "h-11 w-11 text-sm",
  lg: "h-14 w-14 text-base",
};

const dotSizes = {
  sm: "h-2.5 w-2.5 border-2",
  md: "h-3 w-3 border-2",
  lg: "h-3.5 w-3.5 border-[3px]",
};

export function Avatar({
  name,
  color,
  size = "md",
  online,
  className,
}: AvatarProps) {
  return (
    <div className={cn("relative shrink-0", className)}>
      <div
        className={cn(
          "flex items-center justify-center rounded-full font-semibold text-white shadow-sm",
          sizes[size]
        )}
        style={{ backgroundColor: color }}
      >
        {getInitials(name)}
      </div>
      {online !== undefined && (
        <span
          className={cn(
            "absolute bottom-0 right-0 rounded-full border-surface",
            dotSizes[size],
            online ? "bg-emerald-400" : "bg-zinc-500"
          )}
        />
      )}
    </div>
  );
}
