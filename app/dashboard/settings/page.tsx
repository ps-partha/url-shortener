import { Suspense } from "react"

import { SettingsSkeleton } from "@/components/skeletons/settings-skeleton"
import SettingsContent from "@/components/dashboard/settings-content"

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsSkeleton />}>
      <SettingsContent />
    </Suspense>
  )
}
