import { getServerSession } from "next-auth/next"
import { NextResponse } from "next/server"

import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import prisma from "@/lib/prisma"

export async function GET(request: Request, { params }: { params: { slug: string } }) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const url = await prisma.url.findUnique({
      where: {
        shortUrl: params.slug,
        userId: session.user.id,
      },
    })

    if (!url) {
      return NextResponse.json({ error: "URL not found" }, { status: 404 })
    }

    return NextResponse.json(url)
  } catch (error) {
    console.error("Error fetching URL:", error)
    return NextResponse.json({ error: "Failed to fetch URL" }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: { slug: string } }) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()

    // Find the URL first to verify ownership
    const existingUrl = await prisma.url.findUnique({
      where: {
        shortUrl: params.slug,
      },
    })

    if (!existingUrl) {
      return NextResponse.json({ error: "URL not found" }, { status: 404 })
    }

    if (existingUrl.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Check if trying to update shortUrl and if it already exists
    if (body.shortUrl && body.shortUrl !== params.slug) {
      const slugExists = await prisma.url.findUnique({
        where: {
          shortUrl: body.shortUrl,
        },
      })

      if (slugExists) {
        return NextResponse.json({ error: "This short URL is already taken" }, { status: 400 })
      }
    }

    // Update URL
    const updatedUrl = await prisma.url.update({
      where: {
        shortUrl: params.slug,
      },
      data: body,
    })

    return NextResponse.json(updatedUrl)
  } catch (error) {
    console.error("Error updating URL:", error)
    return NextResponse.json({ error: "Failed to update URL" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { slug: string } }) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Find the URL first to verify ownership
    const existingUrl = await prisma.url.findUnique({
      where: {
        shortUrl: params.slug,
      },
    })

    if (!existingUrl) {
      return NextResponse.json({ error: "URL not found" }, { status: 404 })
    }

    if (existingUrl.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Delete URL
    await prisma.url.delete({
      where: {
        shortUrl: params.slug,
      },
    })

    return NextResponse.json({ message: "URL deleted successfully" })
  } catch (error) {
    console.error("Error deleting URL:", error)
    return NextResponse.json({ error: "Failed to delete URL" }, { status: 500 })
  }
}
