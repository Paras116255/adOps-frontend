import { NavLink } from "react-router-dom"
import { BarChart2, ShoppingCart, Zap, MessageSquare, Bell, Settings } from "lucide-react"

const links = [
  { to: "/", label: "Dashboard", icon: BarChart2 },
  { to: "/ads", label: "Ads Performance", icon: BarChart2 },
  { to: "/orders", label: "Orders", icon: ShoppingCart },
  { to: "/automations", label: "Automations", icon: Zap },
  { to: "/inbox", label: "Inbox & Comments", icon: MessageSquare },
  { to: "/alerts", label: "Alerts / Logs", icon: Bell },
  { to: "/settings", label: "Settings", icon: Settings },
]

export default function Sidebar() {
  return (
    <div className="w-64 bg-white border-r p-4">
      <div className="text-xl font-bold mb-8">AdOps Dashboard</div>
      {links.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-2 rounded-lg mb-2 transition ${
              isActive
                ? "bg-primary text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`
          }
        >
          <l.icon size={18} />
          {l.label}
        </NavLink>
      ))}
    </div>
  )
}
