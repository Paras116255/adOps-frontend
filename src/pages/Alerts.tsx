import Badge from "../components/ui/Badge"

export default function Alerts() {
  const alerts = [
    {
      text: "Rule 'Auto-stop high CPP' triggered",
      type: "warning",
    },
    {
      text: "Campaign 'Summer Sale 2024' turned ON",
      type: "info",
    },
    {
      text: "Meta Ads data synced successfully",
      type: "success",
    },
    {
      text: "CPP alert: exceeds $100 threshold",
      type: "danger",
    },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Alerts & Logs</h1>

      <div className="bg-white rounded-xl shadow-sm p-6">
        {alerts.map((a, i) => (
          <div
            key={i}
            className="flex justify-between items-center border-b py-4 last:border-none"
          >
            <div>{a.text}</div>
            <Badge type={a.type as any}>{a.type}</Badge>
          </div>
        ))}
      </div>
    </div>
  )
}
