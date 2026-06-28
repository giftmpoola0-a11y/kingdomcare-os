"use client"

import { Menu, Search, Bell, ShieldCheck } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

export function AppTopbar({ onMenu }: { onMenu: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/85 px-4 py-3 backdrop-blur-md md:px-6">
      <button
        onClick={onMenu}
        className="rounded-lg p-2 text-foreground hover:bg-accent lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="size-5" />
      </button>

      {/* Search */}
      <div className="relative hidden flex-1 max-w-md sm:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search residents, tasks, notes…"
          className="h-10 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <div className="flex flex-1 items-center justify-end gap-2 sm:gap-3">
        <Badge className="gap-1.5 rounded-full border-transparent bg-accent px-3 py-1.5 text-accent-foreground hover:bg-accent">
          <ShieldCheck className="size-3.5" />
          Admin
        </Badge>

        <button
          className="relative rounded-xl border border-border bg-card p-2.5 text-foreground transition-colors hover:bg-accent"
          aria-label="Notifications"
        >
          <Bell className="size-[18px]" />
          <span className="absolute right-2 top-2 size-2 rounded-full bg-destructive ring-2 ring-card" />
        </button>

        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card py-1 pl-1 pr-3">
          <Avatar className="size-8">
            <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
              AD
            </AvatarFallback>
          </Avatar>
          <div className="hidden leading-tight md:block">
            <p className="text-sm font-medium text-foreground">Admin</p>
            <p className="text-xs text-muted-foreground">Owner</p>
          </div>
        </div>
      </div>
    </header>
  )
}