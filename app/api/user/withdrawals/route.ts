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
    const withdrawals = await prisma.withdrawal.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(withdrawals)
  } catch (error) {
    console.error("Error fetching withdrawals:", error)
    return NextResponse.json({ error: "Failed to fetch withdrawals" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { amount } = body

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid withdrawal amount" }, { status: 400 })
    }

    // Get user to check balance and required fields
    const user = await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: {
        balance: true,
        name: true,
        address: true,
        city: true,
        country: true,
        zipCode: true,
        paymentEmail: true,
        paymentMethod: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check if user has completed their profile
    if (!user.name || !user.address || !user.city || !user.country || !user.zipCode || !user.paymentEmail) {
      return NextResponse.json(
        {
          error: "Incomplete profile",
          missingFields: {
            name: !user.name,
            address: !user.address,
            city: !user.city,
            country: !user.country,
            zipCode: !user.zipCode,
            paymentEmail: !user.paymentEmail,
          },
        },
        { status: 400 },
      )
    }

    // Check if user has enough balance
    if (user.balance < amount) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 })
    }

    // Create withdrawal request
    const withdrawal = await prisma.withdrawal.create({
      data: {
        userId: session.user.id,
        amount,
        paymentEmail: user.paymentEmail,
        paymentMethod: user.paymentMethod || "paypal",
      },
    })

    // Update user balance
    await prisma.user.update({
      where: {
        id: session.user.id,
      },
      data: {
        balance: {
          decrement: amount,
        },
      },
    })

    return NextResponse.json(withdrawal)
  } catch (error) {
    console.error("Error creating withdrawal:", error)
    return NextResponse.json({ error: "Failed to create withdrawal" }, { status: 500 })
  }
}
