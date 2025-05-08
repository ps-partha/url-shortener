import { headers } from "next/headers"
import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET(request: Request, { params }: { params: { slug: string } }) {
  const headersList = headers()
  const userAgent = (await headersList).get("user-agent") || ""
  const referer = (await headersList).get("referer") || ""
  const ip = (await headersList).get("x-forwarded-for") || request.headers.get("x-forwarded-for") || ""

  try {
    const url = await prisma.url.findUnique({
      where: {
        shortUrl: params.slug,
      },
    })

    if (!url) {
      return NextResponse.json({ error: "URL not found" }, { status: 404 })
    }

    // Check if this IP and User-Agent already viewed this specific short URL
    const alreadyViewed = await prisma.clickEvent.findFirst({
      where: {
        urlId: url.id,
        ipAddress: ip.toString(),
        userAgent,
      },
    })

    const isUniqueView = !alreadyViewed
    const earnings = isUniqueView ? 0.003 : 0

    // Always record the click (for analytics), even if it's not a paid view
    await prisma.clickEvent.create({
      data: {
        urlId: url.id,
        ipAddress: ip.toString(),
        userAgent,
        referer,
        earnings,
      },
    })

    // Update clicks always
    await prisma.url.update({
      where: {
        id: url.id,
      },
      data: {
        clicks: {
          increment: 1,
        },
        // Only increment earnings if it's a unique view
        ...(isUniqueView && {
          earnings: {
            increment: earnings,
          },
        }),
      },
    })

    // Only update user balance for unique view
    if (isUniqueView) {
      await prisma.user.update({
        where: {
          id: url.userId,
        },
        data: {
          balance: {
            increment: earnings,
          },
        },
      })
    }

    return NextResponse.json({
      originalUrl: url.originalUrl,
      shortUrl: url.shortUrl,
    })
  } catch (error) {
    console.error("Error processing redirect:", error)
    return NextResponse.json({ error: "Failed to process redirect" }, { status: 500 })
  }
}
