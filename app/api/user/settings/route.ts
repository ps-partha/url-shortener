import { getServerSession } from "next-auth/next"
import { NextResponse } from "next/server"
import { z } from "zod"

import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import prisma from "@/lib/prisma"

// Define the settings schema
const settingsSchema = z.object({
  notifications: z.object({
    email: z.boolean().default(true),
    marketing: z.boolean().default(false),
    security: z.boolean().default(true),
    updates: z.boolean().default(true),
  }),
  appearance: z.object({
    theme: z.enum(["light", "dark", "system"]).default("system"),
    reducedMotion: z.boolean().default(false),
    fontSize: z.enum(["small", "medium", "large"]).default("medium"),
  }),
  security: z.object({
    sessionTimeout: z.number().min(5).max(60).default(30),
    twoFactorEnabled: z.boolean().default(false),
  }),
  api: z.object({
    apiKeyEnabled: z.boolean().default(false),
    apiKey: z.string().optional(),
    lastGenerated: z.string().optional(),
  }),
})

export type UserSettings = z.infer<typeof settingsSchema>

// Default settings
export const defaultSettings: UserSettings = {
  notifications: {
    email: true,
    marketing: false,
    security: true,
    updates: true,
  },
  appearance: {
    theme: "system",
    reducedMotion: false,
    fontSize: "medium",
  },
  security: {
    sessionTimeout: 30,
    twoFactorEnabled: false,
  },
  api: {
    apiKeyEnabled: false,
    apiKey: undefined,
    lastGenerated: undefined,
  },
}

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
    let settings: UserSettings
    try {
      settings = user.settings ? JSON.parse(user.settings) : defaultSettings
      // Validate and merge with defaults to ensure all fields exist
      settings = settingsSchema.parse({
        ...defaultSettings,
        ...settings,
      })
    } catch (e) {
      console.error("Error parsing settings:", e)
      settings = defaultSettings
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error("Error fetching settings:", error)
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()

    // Get current settings
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

    // Parse current settings or use defaults
    let currentSettings: UserSettings
    try {
      currentSettings = user.settings ? JSON.parse(user.settings) : defaultSettings
    } catch (e) {
      console.error("Error parsing settings:", e)
      currentSettings = defaultSettings
    }

    // Merge with new settings
    const mergedSettings = {
      ...currentSettings,
      ...body,
      // Handle nested objects
      notifications: {
        ...currentSettings.notifications,
        ...(body.notifications || {}),
      },
      appearance: {
        ...currentSettings.appearance,
        ...(body.appearance || {}),
      },
      security: {
        ...currentSettings.security,
        ...(body.security || {}),
      },
      api: {
        ...currentSettings.api,
        ...(body.api || {}),
      },
    }

    // Validate the merged settings
    const validatedSettings = settingsSchema.parse(mergedSettings)

    // Update user settings
    await prisma.user.update({
      where: {
        id: session.user.id,
      },
      data: {
        settings: JSON.stringify(validatedSettings),
      },
    })

    return NextResponse.json(validatedSettings)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid settings format", details: error.errors }, { status: 400 })
    }
    console.error("Error updating settings:", error)
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 })
  }
}
