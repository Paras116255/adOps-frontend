import Toggle from "../components/ui/Toggle"
import { useState } from "react"

export default function Settings() {
  const [telegram, setTelegram] = useState(true)
  const [whatsapp, setWhatsapp] = useState(true)
  const [cppThreshold, setCppThreshold] = useState(100)

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h2 className="font-semibold mb-4">Notifications</h2>

          <div className="flex justify-between mb-4">
            <span>Telegram alerts</span>
            <Toggle enabled={telegram} onChange={() => setTelegram(!telegram)} />
          </div>

          <div className="flex justify-between">
            <span>WhatsApp alerts</span>
            <Toggle enabled={whatsapp} onChange={() => setWhatsapp(!whatsapp)} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h2 className="font-semibold mb-4">CPP Threshold</h2>

          <div className="flex items-center gap-2">
            <span>$</span>
            <input
              type="number"
              value={cppThreshold}
              onChange={(e) => setCppThreshold(Number(e.target.value))}
              className="border rounded px-2 py-1 w-24"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
