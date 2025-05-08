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

    // Get total clicks and earnings
    const totalStats = await prisma.url.aggregate({
      where: {
        userId: session.user.id,
      },
      _sum: {
        clicks: true,
        earnings: true,
      },
    })

    // Get previous period stats for comparison
    const previousStartDate = new Date(startDate)
    const previousEndDate = new Date(now)

    if (timeRange === "7d") {
      previousStartDate.setDate(previousStartDate.getDate() - 7)
      previousEndDate.setDate(previousEndDate.getDate() - 7)
    } else if (timeRange === "30d") {
      previousStartDate.setDate(previousStartDate.getDate() - 30)
      previousEndDate.setDate(previousEndDate.getDate() - 30)
    } else if (timeRange === "90d") {
      previousStartDate.setDate(previousStartDate.getDate() - 90)
      previousEndDate.setDate(previousEndDate.getDate() - 90)
    } else if (timeRange === "12m") {
      previousStartDate.setMonth(previousStartDate.getMonth() - 12)
      previousEndDate.setMonth(previousEndDate.getMonth() - 12)
    }

    // Get click events for the current period
    const clickEvents = await prisma.clickEvent.findMany({
      where: {
        url: {
          userId: session.user.id,
        },
        createdAt: {
          gte: startDate,
          lte: now,
        },
      },
      include: {
        url: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    })

    // Get click events for the previous period
    const previousClickEvents = await prisma.clickEvent.findMany({
      where: {
        url: {
          userId: session.user.id,
        },
        createdAt: {
          gte: previousStartDate,
          lte: previousEndDate,
        },
      },
      include: {
        url: true,
      },
    })

    // Calculate percentage changes
    const currentPeriodClicks = clickEvents.length
    const previousPeriodClicks = previousClickEvents.length
    const clicksPercentChange =
      previousPeriodClicks > 0 ? ((currentPeriodClicks - previousPeriodClicks) / previousPeriodClicks) * 100 : 0

    const currentPeriodEarnings = clickEvents.reduce((sum, event) => sum + event.earnings, 0)
    const previousPeriodEarnings = previousClickEvents.reduce((sum, event) => sum + event.earnings, 0)
    const earningsPercentChange =
      previousPeriodEarnings > 0 ? ((currentPeriodEarnings - previousPeriodEarnings) / previousPeriodEarnings) * 100 : 0

    // Get active URLs count
    const activeUrlsCount = await prisma.url.count({
      where: {
        userId: session.user.id,
      },
    })

    // Get new URLs in this period
    const newUrlsCount = await prisma.url.count({
      where: {
        userId: session.user.id,
        createdAt: {
          gte: startDate,
        },
      },
    })

    const balanceResult = await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: {
        balance: true,
      },
    })
    

    // Calculate average earnings per click
    const avgEarningsPerClick = currentPeriodClicks > 0 ? currentPeriodEarnings / currentPeriodClicks : 0

    // Group click events by date for the chart
    const dailyData: { date: string; clicks: any; earnings: any }[] = []
    const dateMap = new Map()

    // Initialize with all dates in the range
    const currentDate = new Date(startDate)
    while (currentDate <= now) {
      const dateStr = currentDate.toISOString().split("T")[0]
      dateMap.set(dateStr, { date: dateStr, clicks: 0, earnings: 0 })
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // Fill in actual data
    clickEvents.forEach((event) => {
      const dateStr = event.createdAt.toISOString().split("T")[0]
      if (dateMap.has(dateStr)) {
        const data = dateMap.get(dateStr)
        data.clicks += 1
        data.earnings += event.earnings
        dateMap.set(dateStr, data)
      }
    })

    // Convert map to array and format dates
    dateMap.forEach((value) => {
      const date = new Date(value.date)
      const formattedDate = `${date.getMonth() + 1}/${date.getDate()}`
      dailyData.push({
        date: formattedDate,
        clicks: value.clicks,
        earnings: value.earnings,
      })
    })

    return NextResponse.json({
      balance : balanceResult?.balance ?? 0,
      totalClicks: totalStats._sum.clicks || 0,
      totalEarnings: totalStats._sum.earnings || 0,
      clicksPercentChange,
      earningsPercentChange,
      activeUrlsCount,
      newUrlsCount,
      avgEarningsPerClick,
      dailyData,
    })
  } catch (error) {
    console.error("Error fetching analytics overview:", error)
    return NextResponse.json({ error: "Failed to fetch analytics data" }, { status: 500 })
  }
}
