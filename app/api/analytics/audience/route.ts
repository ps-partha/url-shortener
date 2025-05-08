import { getServerSession } from "next-auth/next"
import { NextResponse } from "next/server"

import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import prisma from "@/lib/prisma"
import { getCountryFromIP, processLocationCounts } from "@/lib/geo-ip"

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

        // Get all click events for the user in the specified time range
        const clickEvents = await prisma.clickEvent.findMany({
            where: {
                url: {
                    userId: session.user.id,
                },
                createdAt: {
                    gte: startDate,
                },
            },
            select: {
                id: true,
                userAgent: true,
                referer: true,
                ipAddress: true,
            },
        })

        // Process user agents to determine device types
        const deviceData = processDeviceData(clickEvents)

        // Process referrers to determine traffic sources
        const referrerData = processReferrerData(clickEvents)

        // Process IP addresses to determine locations
        const locationData = processLocationData(clickEvents)

        return NextResponse.json({
            deviceData,
            referrerData,
            locationData,
            totalClicks: clickEvents.length,
        })
    } catch (error) {
        console.error("Error fetching audience data:", error)
        return NextResponse.json({ error: "Failed to fetch audience data" }, { status: 500 })
    }
}

// Helper functions to process the data
function processDeviceData(clickEvents: any[]) {
    const devices = {
        desktop: 0,
        mobile: 0,
        tablet: 0,
    }

    clickEvents.forEach((event) => {
        const userAgent = event.userAgent || ""
        if (userAgent.includes("Mobile") || userAgent.includes("Android")) {
            if (userAgent.includes("iPad") || userAgent.includes("Tablet")) {
                devices.tablet++
            } else {
                devices.mobile++
            }
        } else {
            devices.desktop++
        }
    })

    const total = clickEvents.length || 1
    return [
        { name: "Desktop", value: Math.round((devices.desktop / total) * 100) },
        { name: "Mobile", value: Math.round((devices.mobile / total) * 100) },
        { name: "Tablet", value: Math.round((devices.tablet / total) * 100) },
    ]
}

function processReferrerData(
    clickEvents: { userAgent: string | null; referer: string | null; id: string; ipAddress: string | null }[],
) {
    const referrers = {
        direct: 0,
        social: 0,
        search: 0,
        email: 0,
        other: 0,
    }

    // Expanded list of domains for better categorization
    const socialDomains = [
        "facebook.com",
        "twitter.com",
        "x.com",
        "instagram.com",
        "linkedin.com",
        "pinterest.com",
        "tiktok.com",
        "reddit.com",
        "tumblr.com",
        "snapchat.com",
        "youtube.com",
        "vimeo.com",
        "discord.com",
        "whatsapp.com",
        "telegram.org",
        "t.me",
        "fb.com",
        "fb.me",
        "lnkd.in",
        "pin.it",
    ]

    const searchDomains = [
        "google.com",
        "google.",
        "bing.com",
        "yahoo.com",
        "duckduckgo.com",
        "baidu.com",
        "yandex.com",
        "ecosia.org",
        "ask.com",
        "aol.com",
        "search.",
        "qwant.com",
        "startpage.com",
        "searchencrypt.com",
    ]

    const emailDomains = [
        "gmail.com",
        "outlook.com",
        "yahoo.com",
        "mail.",
        "hotmail.com",
        "protonmail.com",
        "zoho.com",
        "icloud.com",
        "aol.com",
        "gmx.",
        "webmail.",
        "email.",
        "inbox.",
    ]

    clickEvents.forEach((event) => {
        const referer = (event.referer || "").toLowerCase()

        if (!referer || referer === "direct" || referer.includes("bookmark")) {
            referrers.direct++
        } else if (socialDomains.some((domain) => referer.includes(domain))) {
            referrers.social++
        } else if (searchDomains.some((domain) => referer.includes(domain))) {
            referrers.search++
        } else if (emailDomains.some((domain) => referer.includes(domain))) {
            referrers.email++
        } else {
            referrers.other++
        }
    })

    const total = clickEvents.length || 1

    // Calculate percentages and ensure they sum to 100%
    let directPercent = Math.round((referrers.direct / total) * 100)
    let socialPercent = Math.round((referrers.social / total) * 100)
    let searchPercent = Math.round((referrers.search / total) * 100)
    let emailPercent = Math.round((referrers.email / total) * 100)
    let otherPercent = Math.round((referrers.other / total) * 100)

    // Adjust to ensure total is 100%
    const sum = directPercent + socialPercent + searchPercent + emailPercent + otherPercent
    if (sum !== 100) {
        // Add or subtract the difference from the largest category
        const diff = 100 - sum
        const max = Math.max(directPercent, socialPercent, searchPercent, emailPercent, otherPercent)

        if (max === directPercent) directPercent += diff
        else if (max === socialPercent) socialPercent += diff
        else if (max === searchPercent) searchPercent += diff
        else if (max === emailPercent) emailPercent += diff
        else otherPercent += diff
    }

    return [
        { name: "Direct", value: directPercent },
        { name: "Social Media", value: socialPercent },
        { name: "Search Engines", value: searchPercent },
        { name: "Email", value: emailPercent },
        { name: "Other Websites", value: otherPercent },
    ]
}

function processLocationData(
    clickEvents: { userAgent: string | null; referer: string | null; id: string; ipAddress: string | null }[],
) {
    // Create a map to count occurrences of each country
    const countryCount: Record<string, number> = {}

    // Process each IP address to determine the country
    clickEvents.forEach((event) => {
        const ipAddress = event.ipAddress || ""
        const country = getCountryFromIP(ipAddress)

        if (country) {
            countryCount[country] = (countryCount[country] || 0) + 1
        } else {
            countryCount["Unknown"] = (countryCount["Unknown"] || 0) + 1
        }
    })

    const total = clickEvents.length || 1
    return processLocationCounts(countryCount, total)
}
