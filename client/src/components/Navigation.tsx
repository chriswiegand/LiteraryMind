import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useUnreadNotificationCount, useNotifications, useMarkAllNotificationsRead } from "@/hooks/use-notifications";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Sparkles, LogOut, Bell, Award, Users, BarChart3 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";

export function Navigation() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { data: unreadCount } = useUnreadNotificationCount();
  const { data: notifications } = useNotifications();
  const markAllRead = useMarkAllNotificationsRead();

  const navItems = [
    { href: "/", label: "My Library", icon: BookOpen },
    { href: "/stats", label: "Performance", icon: BarChart3 },
    { href: "/badges", label: "Badges", icon: Award },
    { href: "/recommendations", label: "Recommendations", icon: Sparkles },
    { href: "/clubs", label: "Book Clubs", icon: Users },
  ];

  if (!user) return null;

  const recentNotifications = notifications?.slice(0, 5) || [];

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center px-4 md:px-6">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <BookOpen className="h-6 w-6 text-primary" />
          <span className="hidden font-display text-xl font-bold sm:inline-block">
            BookWise
          </span>
        </Link>
        <div className="mr-4 hidden md:flex">
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
              >
                <div className={`flex items-center gap-2 cursor-pointer transition-colors hover:text-foreground/80 ${
                  location === item.href ? "text-primary font-semibold" : "text-foreground/60"
                }`}>
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </div>
              </Link>
            ))}
          </nav>
        </div>
        <div className="ml-auto flex items-center space-x-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative" data-testid="button-notifications">
                <Bell className="h-5 w-5" />
                {unreadCount && unreadCount.count > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                    {unreadCount.count > 9 ? "9+" : unreadCount.count}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80" align="end">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Notifications</span>
                {unreadCount && unreadCount.count > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markAllRead.mutate()}
                    className="text-xs h-auto py-1"
                  >
                    Mark all read
                  </Button>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <ScrollArea className="h-[300px]">
                {recentNotifications.length > 0 ? (
                  recentNotifications.map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      className={`flex flex-col items-start gap-1 p-3 ${!notification.isRead ? "bg-muted/50" : ""}`}
                    >
                      <div className="flex items-center gap-2">
                        {notification.type === "badge_earned" && <Award className="h-4 w-4 text-yellow-500" />}
                        {notification.type === "streak_milestone" && <Sparkles className="h-4 w-4 text-orange-500" />}
                        {notification.type === "recommendation" && <BookOpen className="h-4 w-4 text-blue-500" />}
                        <span className="font-medium text-sm">{notification.title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No notifications yet
                  </div>
                )}
              </ScrollArea>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full" data-testid="button-user-menu">
                <div className="flex h-full w-full items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                  {user.firstName?.[0] || user.email?.[0] || "U"}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.firstName} {user.lastName}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => logout()}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}
