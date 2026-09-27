import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

interface PersonAvatarProps {
  name: string;
  size?: "sm" | "lg";
}

export function PersonAvatar({ name, size = "sm" }: PersonAvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-emerald-100 font-semibold text-emerald-900",
        size === "lg" ? "size-14 text-lg" : "size-9 text-xs",
      )}
    >
      {initials(name)}
    </span>
  );
}
