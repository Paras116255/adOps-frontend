import Sidebar from "./Sidebar"
import Topbar from "./Topbar"

export default function Layout({ children }: any) {
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <div className="p-6 overflow-auto">{children}</div>
      </div>
    </div>
  )
}
