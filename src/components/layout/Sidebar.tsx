import { NavLink } from "react-router-dom"
import { LayoutDashboard, BarChart2, ShoppingCart, Zap, MessageSquare, Bell, Settings } from "lucide-react"

const links = [
  { to: "/",            label: "Dashboard",       icon: LayoutDashboard, end: true  },
  { to: "/ads",         label: "Ads Performance", icon: BarChart2,       end: false },
  { to: "/orders",      label: "Orders",          icon: ShoppingCart,    end: false },
  { to: "/automations", label: "Automations",     icon: Zap,             end: false },
  { to: "/inbox",       label: "Inbox & Comments",icon: MessageSquare,   end: false },
  { to: "/alerts",      label: "Alerts / Logs",   icon: Bell,            end: false },
  { to: "/settings",    label: "Settings",        icon: Settings,        end: false },
]

export default function Sidebar() {
  return (
    <div className="w-64 bg-white border-r p-4 flex flex-col">
      <div className="text-xl font-bold mb-8">AdOps Dashboard</div>
      <nav className="flex-1">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2 rounded-lg mb-2 transition ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`
            }
          >
            <l.icon size={18} />
            {l.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
