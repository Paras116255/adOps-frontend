import { useState } from "react"

export default function Automations() {
  const [autoStop, setAutoStop] = useState(true)
  const [threshold, setThreshold] = useState(120)

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Automations</h1>

      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="font-semibold">
              Auto-stop high CPP ads
            </h2>
            <p className="text-sm text-gray-500">
              Automatically pause ads when CPP exceeds threshold
            </p>
          </div>

          <input
            type="checkbox"
            checked={autoStop}
            onChange={() => setAutoStop(!autoStop)}
            className="w-5 h-5"
          />
        </div>

        <div className="flex items-center gap-2">
          <span>$</span>
          <input
            type="number"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="border rounded px-2 py-1 w-24"
          />
        </div>
      </div>
    </div>
  )
}
