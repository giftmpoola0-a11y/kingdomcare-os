import {
  LayoutDashboard,
  Users,
  NotebookPen,
  FileBarChart,
  TriangleAlert,
  Pill,
  ListChecks,
  UserCog,
  Settings,
  type LucideIcon,
} from "lucide-react"

export type NavItem = {
  label: string
  icon: LucideIcon
  href: string
  active?: boolean
  badge?: number
}

export const navItems: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "#", active: true },
  { label: "Residents", icon: Users, href: "#" },
  { label: "New Shift", icon: NotebookPen, href: "#" },
  { label: "Reports", icon: FileBarChart, href: "#" },
  { label: "Incidents", icon: TriangleAlert, href: "#", badge: 2 },
  { label: "Medications", icon: Pill, href: "#", badge: 3 },
  { label: "Tasks", icon: ListChecks, href: "#", badge: 7 },
  { label: "Staff", icon: UserCog, href: "#" },
  { label: "Account", icon: Settings, href: "#" },
]

export type Kpi = {
  label: string
  value: string
  delta: string
  trend: "up" | "down" | "flat"
  tone: "gold" | "sage" | "amber" | "rose"
  hint: string
}

export const kpis: Kpi[] = [
  {
    label: "Active Residents",
    value: "28",
    delta: "+2 this week",
    trend: "up",
    tone: "sage",
    hint: "of 32 beds occupied",
  },
  {
    label: "Open Tasks",
    value: "7",
    delta: "3 due soon",
    trend: "flat",
    tone: "gold",
    hint: "across all wings",
  },
  {
    label: "Medication Alerts",
    value: "3",
    delta: "1 overdue",
    trend: "down",
    tone: "amber",
    hint: "requires review",
  },
  {
    label: "Recent Incidents",
    value: "2",
    delta: "last 24h",
    trend: "down",
    tone: "rose",
    hint: "1 needs follow-up",
  },
]

export type TimelineEvent = {
  time: string
  title: string
  detail: string
  tone: "sage" | "gold" | "amber" | "rose"
  status: string
}

export const timeline: TimelineEvent[] = [
  {
    time: "07:00",
    title: "Morning medication round",
    detail: "Wing A & B — 14 residents",
    tone: "sage",
    status: "Done",
  },
  {
    time: "08:30",
    title: "Breakfast & hydration check",
    detail: "Dining hall — all residents",
    tone: "sage",
    status: "Done",
  },
  {
    time: "10:00",
    title: "Physiotherapy — Margaret Hale",
    detail: "Room 12 · with Dr. Owens",
    tone: "gold",
    status: "In progress",
  },
  {
    time: "12:30",
    title: "Lunch & afternoon meds",
    detail: "Dining hall — 28 residents",
    tone: "amber",
    status: "Upcoming",
  },
  {
    time: "15:00",
    title: "Family visit — Arthur Bennett",
    detail: "Garden lounge",
    tone: "amber",
    status: "Upcoming",
  },
  {
    time: "18:00",
    title: "Evening medication round",
    detail: "Wing A & B",
    tone: "amber",
    status: "Upcoming",
  },
]

export type AttentionItem = {
  resident: string
  room: string
  issue: string
  priority: "urgent" | "warning" | "watch"
  initials: string
}

export const attentionItems: AttentionItem[] = [
  {
    resident: "Eleanor Whitmore",
    room: "Room 04",
    issue: "Fall reported overnight — needs assessment",
    priority: "urgent",
    initials: "EW",
  },
  {
    resident: "Samuel Okafor",
    room: "Room 19",
    issue: "Blood pressure medication overdue by 2h",
    priority: "warning",
    initials: "SO",
  },
  {
    resident: "Margaret Hale",
    room: "Room 12",
    issue: "Reduced appetite — monitor hydration",
    priority: "watch",
    initials: "MH",
  },
]

export type StaffMember = {
  name: string
  role: string
  shift: string
  initials: string
  status: "on-shift" | "break" | "arriving"
}

export const staffOnDuty: StaffMember[] = [
  { name: "Grace Adeyemi", role: "Lead Nurse", shift: "07:00 – 19:00", initials: "GA", status: "on-shift" },
  { name: "Tom Fletcher", role: "Caregiver", shift: "07:00 – 15:00", initials: "TF", status: "on-shift" },
  { name: "Priya Nair", role: "Caregiver", shift: "07:00 – 15:00", initials: "PN", status: "break" },
  { name: "Daniel Osei", role: "Caregiver", shift: "11:00 – 19:00", initials: "DO", status: "arriving" },
]

export type Activity = {
  who: string
  action: string
  target: string
  time: string
  initials: string
}

export const recentActivity: Activity[] = [
  { who: "Grace Adeyemi", action: "completed shift note for", target: "Wing A", time: "8m ago", initials: "GA" },
  { who: "Tom Fletcher", action: "logged medication for", target: "Arthur Bennett", time: "24m ago", initials: "TF" },
  { who: "Priya Nair", action: "reported an incident for", target: "Eleanor Whitmore", time: "1h ago", initials: "PN" },
  { who: "Admin", action: "added a new resident", target: "Joyce Carter", time: "2h ago", initials: "AD" },
  { who: "Daniel Osei", action: "closed task", target: "Restock supplies — Wing B", time: "3h ago", initials: "DO" },
]
