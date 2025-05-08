import { getServerSession } from "next-auth/next"
import { NextResponse } from "next/server"

import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import prisma from "@/lib/prisma"

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get("timeRange") || "30d"
    const metric = searchParams.get("metric") || "clicks" // clicks or earnings
    const limit = Number.parseInt(searchParams.get("limit") || "5", 10)

    // Calculate the date range based on the timeRange parameter
    const now = new Date()
    const startDate = new Date()

    switch (timeRange) {
      case "7d":
        startDate.setDate(now.getDate() - 7)
        break
      case "30d":
        startDate.setDate(now.getDate() - 30)
        break
      case "90d":
        startDate.setDate(now.getDate() - 90)
        break
      case "12m":
        startDate.setMonth(now.getMonth() - 12)
        break
      default:
        startDate.setDate(now.getDate() - 30)
    }

    // Get top URLs by clicks or earnings
    const urls = await prisma.url.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        id: true,
        shortUrl: true,
        originalUrl: true,
        clicks: true,
        earnings: true,
        clickEvents: {
          where: {
            createdAt: {
              gte: startDate,
            },
          },
          select: {
            earnings: true,
          },
        },
      },
      orderBy: {
        [metric === "earnings" ? "earnings" : "clicks"]: "desc",
      },
      take: limit,
    })

    // Calculate period-specific metrics
    const topUrls = urls.map((url) => {
      const periodEarnings = url.clickEvents.reduce((sum, event) => sum + event.earnings, 0)
      const periodClicks = url.clickEvents.length

      return {
        url: url.shortUrl,
        originalUrl: url.originalUrl,
        clicks: periodClicks,
        earnings: periodEarnings,
        totalClicks: url.clicks,
        totalEarnings: url.earnings,
      }
    })

    // Sort by the requested metric for the specific period
    topUrls.sort((a, b) => {
      if (metric === "earnings") {
        return b.earnings - a.earnings
      }
      return b.clicks - a.clicks
    })

    return NextResponse.json(topUrls)
  } catch (error) {
    console.error("Error fetching top URLs:", error)
    return NextResponse.json({ error: "Failed to fetch top URLs data" }, { status: 500 })
  }
}
