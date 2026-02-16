import { useState } from "react"
import { Calendar } from "lucide-react"
import { motion } from "framer-motion"

export default function Topbar() {
  const [brand, setBrand] = useState("Brand A")
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-white border-b px-6 py-4 flex justify-between items-center">
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="border px-4 py-1 rounded-lg bg-gray-50"
        >
          {brand}
        </button>

        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bg-white shadow rounded mt-2 w-40"
          >
            {["Brand A", "Brand B", "Brand C"].map((b) => (
              <div
                key={b}
                onClick={() => {
                  setBrand(b)
                  setOpen(false)
                }}
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
              >
                {b}
              </div>
            ))}
          </motion.div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 border px-3 py-1 rounded-lg bg-gray-50">
          <Calendar size={16} />
          Jan 20 – Jan 27, 2024
        </div>
        <div className="text-green-600 text-sm">Synced 2 min ago</div>
      </div>
    </div>
  )
}
