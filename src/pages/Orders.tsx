import Badge from "../components/ui/Badge"

export default function Orders() {
  const orders = [
    {
      id: "ORD-10234",
      date: "2024-01-27 14:32",
      value: "$189.99",
      campaign: "Summer Sale 2024",
      brand: "Brand A",
      status: "attributed",
    },
    {
      id: "ORD-10236",
      date: "2024-01-27 14:15",
      value: "$89.50",
      campaign: "-",
      brand: "Brand B",
      status: "pending",
    },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Orders (Shopify)</h1>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-sm text-gray-500">
            <tr>
              <th className="p-3">Order ID</th>
              <th>Date</th>
              <th>Value</th>
              <th>Campaign</th>
              <th>Brand</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t hover:bg-gray-50">
                <td className="p-3">{o.id}</td>
                <td>{o.date}</td>
                <td>{o.value}</td>
                <td>{o.campaign}</td>
                <td>{o.brand}</td>
                <td>
                  {o.status === "attributed" ? (
                    <Badge type="success">Attributed</Badge>
                  ) : (
                    <Badge type="warning">Pending (30–45 min)</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
