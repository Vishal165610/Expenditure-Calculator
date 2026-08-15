import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Megaphone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/room/UserAvatar";
import { useSession } from "@/hooks/use-session";
import { useAddNotice, useDeleteNotice, useNotices } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/notices")({
  head: () => ({
    meta: [
      { title: "Notice Board — Room C67" },
      {
        name: "description",
        content: "Room C67 notice board for reminders, chores and house announcements.",
      },
      { property: "og:title", content: "Notice Board — Room C67" },
      {
        property: "og:description",
        content: "Post reminders and announcements everyone in Room C67 can see.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NoticesPage,
});

function NoticesPage() {
  const { userId, profile, profiles } = useSession();
  const { data: notices = [] } = useNotices();
  const addNotice = useAddNotice(userId ?? "", profile?.name ?? "Someone");
  const deleteNotice = useDeleteNotice();
  const [message, setMessage] = useState("");

  const submit = () => {
    const text = message.trim();
    if (!text) return;
    addNotice.mutate(text, {
      onSuccess: () => {
        setMessage("");
        toast.success("Notice posted");
      },
      onError: () => toast.error("Couldn't post that notice."),
    });
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Notice board</h1>
        <p className="text-sm text-muted-foreground">Short announcements for the room.</p>
      </header>

      <section className="rounded-3xl border bg-card p-5 shadow-card">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="e.g. Water tank cleaning on Sunday morning"
          rows={3}
          className="rounded-2xl"
        />
        <div className="mt-3 flex justify-end">
          <Button
            className="rounded-full"
            disabled={!message.trim() || addNotice.isPending}
            onClick={submit}
          >
            <Megaphone className="size-4" /> Post notice
          </Button>
        </div>
      </section>

      {notices.length === 0 && (
        <div className="rounded-3xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          No notices yet.
        </div>
      )}

      <div className="space-y-3">
        {notices.map((n) => {
          const author = profiles.find((p) => p.id === n.author_id);
          return (
            <article key={n.id} className="flex gap-3 rounded-3xl border bg-card p-4 shadow-card">
              <UserAvatar profile={author} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  {n.author_id === userId ? "You" : (author?.name ?? "Someone")}
                  <span className="ml-2 text-[11px] font-normal text-muted-foreground">
                    {new Date(n.created_at).toLocaleString("en-IN", {
                      day: "numeric",
                      month: "short",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{n.message}</p>
              </div>
              {n.author_id === userId && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Delete notice"
                  className="rounded-full text-muted-foreground hover:text-destructive"
                  onClick={() => deleteNotice.mutate(n.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
