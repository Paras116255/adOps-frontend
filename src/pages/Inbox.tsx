export default function Inbox() {
  const messages = [
    {
      name: "Sarah Johnson",
      text: "Hi! I was wondering about shipping time...",
      time: "2 min ago",
    },
    {
      name: "Mike Chen",
      text: "Love your products! Can I get a discount?",
      time: "15 min ago",
    },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Inbox & Comments</h1>

      <div className="bg-white rounded-xl shadow-sm p-6">
        {messages.map((m, i) => (
          <div
            key={i}
            className="border-b py-4 last:border-none hover:bg-gray-50 rounded px-2"
          >
            <div className="font-medium">{m.name}</div>
            <div className="text-sm text-gray-600">{m.text}</div>
            <div className="text-xs text-gray-400">{m.time}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
