import type React from "react"
import type { Metadata } from "next"

import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Manage your shortened URLs and track your earnings",
  robots: {
    index: false,
    follow: false,
  },
}

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return null
  }

  // You can add session checks or redirect logic here if needed

  return <DashboardSidebar>{children}</DashboardSidebar>
}
