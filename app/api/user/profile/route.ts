import { getServerSession } from "next-auth/next"
import { NextResponse } from "next/server"

import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import prisma from "@/lib/prisma"

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
        id: true,
        name: true,
        email: true,
        username: true,
        image: true,
        role: true,
        balance: true,
        paymentEmail: true,
        paymentMethod: true,
        city: true,
        zipCode: true,
        country: true,
        address: true
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error("Error fetching user profile:", error)
    return NextResponse.json({ error: "Failed to fetch user profile" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name, username, paymentEmail, paymentMethod, address, city, country, zipCode } = body
    console.log(body)

    // Validate input
    if (paymentMethod && !["paypal", "bank", "crypto"].includes(paymentMethod)) {
      return NextResponse.json({ error: "Invalid payment method" }, { status: 400 })
    }

    // Check if username is already taken
    if (username) {
      const existingUser = await prisma.user.findUnique({
        where: {
          username,
          NOT: {
            id: session.user.id,
          },
        },
      })

      if (existingUser) {
        return NextResponse.json({ error: "Username is already taken" }, { status: 400 })
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: {
        id: session.user.id,
      },
      data: {
        name: name || undefined,
        username: username || undefined,
        paymentEmail: paymentEmail || undefined,
        paymentMethod: paymentMethod || undefined,
        address: address,
        city: city,
        country: country,
        zipCode: zipCode
      },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        image: true,
        role: true,
        balance: true,
        paymentEmail: true,
        paymentMethod: true,
        address: true,
        city: true,
        country: true,
        zipCode: true
      },
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error("Error updating user profile:", error)
    return NextResponse.json({ error: "Failed to update user profile" }, { status: 500 })
  }
}
