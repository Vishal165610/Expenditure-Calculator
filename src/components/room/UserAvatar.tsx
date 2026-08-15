import { avatarClasses, initialsOf } from "@/lib/room";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/data";

const sizes = {
  sm: "size-7 text-[11px]",
  md: "size-9 text-xs",
  lg: "size-12 text-sm",
};

export function UserAvatar({
  profile,
  size = "md",
  className,
}: {
  profile?: Pick<Profile, "name" | "avatar_color"> | undefined;
  size?: keyof typeof sizes;
  className?: string;
}) {
  const color = avatarClasses[profile?.avatar_color ?? "teal"] ?? avatarClasses["teal"];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold ring-2",
        color,
        sizes[size],
        className,
      )}
      title={profile?.name}
    >
      {initialsOf(profile?.name ?? "?")}
    </span>
  );
}

export function AvatarStack({ profiles }: { profiles: Profile[] }) {
  return (
    <span className="flex -space-x-2">
      {profiles.map((p) => (
        <UserAvatar key={p.id} profile={p} size="sm" className="ring-card" />
      ))}
    </span>
  );
}
