import { getServerSession } from "next-auth/next"
import { NextResponse } from "next/server"
import crypto from "crypto"

import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import prisma from "@/lib/prisma"

import { defaultSettings } from "../settings/route"

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: {
        settings: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Parse settings or return defaults
    let settings
    try {
      settings = user.settings ? JSON.parse(user.settings) : defaultSettings
    } catch (e) {
      console.error("Error parsing settings:", e)
      settings = defaultSettings
    }

    // Return API key status
    return NextResponse.json({
      enabled: settings.api?.apiKeyEnabled || false,
      lastGenerated: settings.api?.lastGenerated || null,
      // Don't return the actual API key for security reasons
    })
  } catch (error) {
    console.error("Error fetching API key status:", error)
    return NextResponse.json({ error: "Failed to fetch API key status" }, { status: 500 })
  }
}

export async function POST() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: {
        settings: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Parse settings or use defaults
    let settings
    try {
      settings = user.settings ? JSON.parse(user.settings) : defaultSettings
    } catch (e) {
      console.error("Error parsing settings:", e)
      settings = defaultSettings
    }

    // Generate new API key
    const apiKey = `sk_${crypto.randomBytes(24).toString("hex")}`
    const now = new Date().toISOString()

    // Update settings with new API key
    const updatedSettings = {
      ...settings,
      api: {
        ...settings.api,
        apiKeyEnabled: true,
        apiKey: apiKey,
        lastGenerated: now,
      },
    }

    // Save updated settings
    await prisma.user.update({
      where: {
        id: session.user.id,
      },
      data: {
        settings: JSON.stringify(updatedSettings),
      },
    })

    return NextResponse.json({
      apiKey,
      lastGenerated: now,
      message: "API key generated successfully",
    })
  } catch (error) {
    console.error("Error generating API key:", error)
    return NextResponse.json({ error: "Failed to generate API key" }, { status: 500 })
  }
}

export async function DELETE() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: {
        settings: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Parse settings or use defaults
    let settings
    try {
      settings = user.settings ? JSON.parse(user.settings) : defaultSettings
    } catch (e) {
      console.error("Error parsing settings:", e)
      settings = defaultSettings
    }

    // Update settings to revoke API key
    const updatedSettings = {
      ...settings,
      api: {
        ...settings.api,
        apiKeyEnabled: false,
        apiKey: undefined,
      },
    }

    // Save updated settings
    await prisma.user.update({
      where: {
        id: session.user.id,
      },
      data: {
        settings: JSON.stringify(updatedSettings),
      },
    })

    return NextResponse.json({ message: "API key revoked successfully" })
  } catch (error) {
    console.error("Error revoking API key:", error)
    return NextResponse.json({ error: "Failed to revoke API key" }, { status: 500 })
  }
}
