import { Search, Bell } from "lucide-react";
import { Img } from "@/shared/components/ui/Image";
import { ModeToggle } from "./ThemeToggle";

interface HeaderProps {
  children?: React.ReactNode;
}

export function Header({ children }: HeaderProps) {
  return (
    <header className="bg-background border-b border-gray-200 dark:border-gray-700 dark:bg-gray-800 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {children}
          <h1 className="text-lg font-bold text-foreground hidden lg:block">
            لوحة التحكم
          </h1>
        </div>

        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search data, users, or reports"
              className="w-64 pl-4 pr-10 py-2 text-sm  dark:bg-gray-700  bg-muted border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground dark:text-gray-300" />
          </div>

          {/* Notification */}
          <button className="relative p-2 hover:bg-accent rounded-full text-muted-foreground hover:text-accent-foreground">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full"></span>
          </button>

          {/* Theme Toggle */}
          <ModeToggle />

          {/* User Avatar */}
          <button className="w-8 h-8 rounded-full bg-muted overflow-hidden">
            <Img
              src="/images/avatar.jpeg"
              alt="User"
              width={32}
              height={32}
              className="w-full h-full object-cover"
            />
          </button>
        </div>
      </div>
    </header>
  );
}
