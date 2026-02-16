import { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

type Ad = {
  id: string
  name: string
  spend: number
  purchases: number
  cpp: number
  status: boolean
}

type AdSet = {
  id: string
  name: string
  spend: number
  purchases: number
  cpp: number
  status: boolean
  ads: Ad[]
}

type Campaign = {
  id: string
  name: string
  spend: number
  purchases: number
  cpp: number
  status: boolean
  adSets: AdSet[]
}

export default function Ads() {
  const [expanded, setExpanded] = useState<string[]>([])

  const toggleExpand = (id: string) => {
    setExpanded((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const data: Campaign[] = [
    {
      id: "c1",
      name: "Summer Sale 2024",
      spend: 12450,
      purchases: 234,
      cpp: 53.21,
      status: true,
      adSets: [
        {
          id: "a1",
          name: "Interest - Fashion Lovers",
          spend: 6200,
          purchases: 124,
          cpp: 50,
          status: true,
          ads: [
            {
              id: "ad1",
              name: "Carousel - Product Mix",
              spend: 3100,
              purchases: 65,
              cpp: 47.69,
              status: true,
            },
            {
              id: "ad2",
              name: "Video - Brand Story",
              spend: 3100,
              purchases: 59,
              cpp: 52.54,
              status: true,
            },
          ],
        },
      ],
    },
  ]

  const cppColor = (cpp: number) => {
    if (cpp <= 60) return "text-green-600"
    if (cpp <= 100) return "text-yellow-600"
    return "text-red-600"
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Ads Performance</h1>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-sm text-gray-500">
            <tr>
              <th className="p-3">Name</th>
              <th>Spend</th>
              <th>Purchases</th>
              <th>CPP</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.map((campaign) => (
              <>
                <tr
                  key={campaign.id}
                  className="border-t hover:bg-gray-50 transition"
                >
                  <td
                    className="p-3 flex items-center gap-2 cursor-pointer"
                    onClick={() => toggleExpand(campaign.id)}
                  >
                    {expanded.includes(campaign.id) ? (
                      <ChevronDown size={16} />
                    ) : (
                      <ChevronRight size={16} />
                    )}
                    <span className="font-semibold">
                      {campaign.name}
                    </span>
                  </td>
                  <td>${campaign.spend}</td>
                  <td>{campaign.purchases}</td>
                  <td className={cppColor(campaign.cpp)}>
                    ${campaign.cpp}
                  </td>
                  <td className="text-green-600">
                    {campaign.status ? "ON" : "OFF"}
                  </td>
                </tr>

                <AnimatePresence>
                  {expanded.includes(campaign.id) &&
                    campaign.adSets.map((adSet) => (
                      <motion.tr
                        key={adSet.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="bg-gray-50 border-t"
                      >
                        <td className="pl-10 p-3 font-medium">
                          {adSet.name}
                        </td>
                        <td>${adSet.spend}</td>
                        <td>{adSet.purchases}</td>
                        <td className={cppColor(adSet.cpp)}>
                          ${adSet.cpp}
                        </td>
                        <td>ON</td>
                      </motion.tr>
                    ))}
                </AnimatePresence>
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
