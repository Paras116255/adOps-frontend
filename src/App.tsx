import { Routes, Route } from "react-router-dom"
import Layout from "./components/layout/Layout"
import Dashboard from "./pages/Dashboard"
import Ads from "./pages/Ads"
import Orders from "./pages/Orders"
import Automations from "./pages/Automations"
import Inbox from "./pages/Inbox"
import Alerts from "./pages/Alerts"
import Settings from "./pages/Settings"

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/ads" element={<Ads />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/automations" element={<Automations />} />
        <Route path="/inbox" element={<Inbox />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Layout>
  )
}
