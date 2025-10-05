import { forwardRef } from "react";
import { useNotificationStore } from "@/stores/notificationStore";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";

export const NotificationBell = forwardRef((props, ref) => {
  const unreadCount = useNotificationStore((state) => state.unreadCount);

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      ref={ref}
      {...props}
    >
      <Bell className="h-[1.2rem] w-[1.2rem]" />
      {unreadCount > 0 && (
        <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
      <span className="sr-only">Abrir notificaciones</span>
    </Button>
  );
});

NotificationBell.displayName = "NotificationBell";
