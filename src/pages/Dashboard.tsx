export default function Dashboard() {
  const cards = [
    { title: "Total Spend (Meta)", value: "$45,350.00", change: "-12.5%" },
    { title: "Total Orders", value: "594", change: "+8.2%" },
    { title: "Revenue", value: "$89,420.00", change: "+15.3%" },
    { title: "Average CPP", value: "$76.35" },
    { title: "Active Campaigns", value: "4" },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-5 gap-4 mb-8">
        {cards.map((c) => (
          <div
            key={c.title}
            className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition"
          >
            <div className="text-sm text-gray-500">{c.title}</div>
            <div className="text-xl font-bold">{c.value}</div>
            {c.change && (
              <div
                className={`text-sm ${
                  c.change.includes("+")
                    ? "text-green-600"
                    : "text-red-500"
                }`}
              >
                {c.change} vs last period
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="font-semibold mb-4">Campaign Overview</h2>
        <table className="w-full text-left">
          <thead className="text-gray-500 text-sm border-b">
            <tr>
              <th>Campaign</th>
              <th>Spend</th>
              <th>Purchases</th>
              <th>CPP</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td>Summer Sale 2024</td>
              <td>$12,450</td>
              <td>234</td>
              <td className="text-green-600">$53.21</td>
              <td className="text-green-600">ON</td>
            </tr>
            <tr className="border-b">
              <td>New Arrivals - Q4</td>
              <td>$8,900</td>
              <td>89</td>
              <td className="text-yellow-600">$100.00</td>
              <td className="text-green-600">ON</td>
            </tr>
            <tr>
              <td>Holiday Collection</td>
              <td>$15,200</td>
              <td>95</td>
              <td className="text-red-600">$160.00</td>
              <td className="text-green-600">ON</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

