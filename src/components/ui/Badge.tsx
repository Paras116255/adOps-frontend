interface Props {
  type: "success" | "warning" | "danger" | "info"
  children: React.ReactNode
}

export default function Badge({ type, children }: Props) {
  const styles = {
    success: "bg-green-100 text-green-700",
    warning: "bg-yellow-100 text-yellow-700",
    danger: "bg-red-100 text-red-700",
    info: "bg-blue-100 text-blue-700",
  }

  return (
    <span
      className={`px-3 py-1 text-xs rounded-full font-medium ${styles[type]}`}
    >
      {children}
    </span>
  )
}
