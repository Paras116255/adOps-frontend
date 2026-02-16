import { motion } from "framer-motion"

interface Props {
  enabled: boolean
  onChange: () => void
}

export default function Toggle({ enabled, onChange }: Props) {
  return (
    <div
      onClick={onChange}
      className={`w-12 h-6 rounded-full p-1 cursor-pointer transition ${
        enabled ? "bg-primary" : "bg-gray-300"
      }`}
    >
      <motion.div
        layout
        className="bg-white w-4 h-4 rounded-full shadow"
        animate={{ x: enabled ? 20 : 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />
    </div>
  )
}
