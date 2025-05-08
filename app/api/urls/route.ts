import { getServerSession } from "next-auth/next"
import { NextResponse } from "next/server"

import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import prisma from "@/lib/prisma"
import { generateSlug } from "@/lib/utils"
import slugify from 'slugify';

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const urls = await prisma.url.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(urls)
  } catch (error) {
    console.error("Error fetching URLs:", error)
    return NextResponse.json({ error: "Failed to fetch URLs" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()

    // Validate request
    if (!body.originalUrl) {
      return NextResponse.json({ error: "Original URL is required" }, { status: 400 })
    }

    // Generate a short URL or use custom one
    

const shortUrl = body.customSlug
  ? slugify(body.customSlug, { lower: true, strict: true })
  : generateSlug();


    // Check if slug already exists
    const existingUrl = await prisma.url.findUnique({
      where: {
        shortUrl,
      },
    })

    if (existingUrl) {
      return NextResponse.json({ error: "This short URL is already taken" }, { status: 400 })
    }

    // Create new URL
    const newUrl = await prisma.url.create({
      data: {
        shortUrl,
        originalUrl: body.originalUrl,
        userId: session.user.id,
      },
    })

    return NextResponse.json(newUrl, { status: 201 })
  } catch (error) {
    console.error("Error creating URL:", error)
    return NextResponse.json({ error: "Failed to create URL" }, { status: 500 })
  }
}
