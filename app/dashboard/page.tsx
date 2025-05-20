"use client"

import { useEffect, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileUpload } from "@/components/file-upload"
import { BarcodeScanner } from "@/components/barcode-scanner"
import { SummaryReport } from "@/components/summary-report"
import { SavedProgress } from "@/components/saved-progress"
import { useShipmentStore } from "@/lib/store"
import { useAuthStore } from "@/lib/auth-store"
import { useRouter } from "next/navigation"
import { TrialTimer } from "@/components/trial-timer"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

export default function Dashboard() {
  const { activeTab, setActiveTab } = useShipmentStore()
  const { isAuthenticated, userType, logout, startTrial, isTrialExpired } = useAuthStore()
  const [showTrialExpired, setShowTrialExpired] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  // Check authentication
  useEffect(() => {
    if (!isAuthenticated && !userType) {
      router.push("/")
    }
  }, [isAuthenticated, userType, router])

  // Start trial timer for guest users when they upload a file
  useEffect(() => {
    if (userType === "guest" && activeTab === "upload") {
      // We'll start the timer when they actually upload a file in the FileUpload component
    }
  }, [userType, activeTab])

  // Check if trial has expired
  useEffect(() => {
    if (userType === "guest" && isTrialExpired()) {
      setShowTrialExpired(true)
      setActiveTab("summary")
    }
  }, [userType, isTrialExpired, setActiveTab])

  const handleLogout = () => {
    logout()
    router.push("/")
    toast({
      title: "Logged out",
      description: "You have been logged out successfully",
    })
  }

  if (!isAuthenticated && !userType) {
    return null // Will redirect in useEffect
  }

  return (
    <main className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Shipment Quantity Verification</h1>
        <div className="flex items-center gap-4">
          {userType === "guest" && <TrialTimer />}
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
          {userType === "admin" && (
            <Button onClick={() => router.push("/admin")} variant="default">
              Admin Console
            </Button>
          )}
        </div>
      </div>

      {showTrialExpired ? (
        <div className="p-8 border rounded-lg bg-gray-50 text-center">
          <h2 className="text-2xl font-bold mb-4">Thank you for using the trial version</h2>
          <p className="text-lg mb-6">Purchase a license to go pro and continue using all features.</p>
          <Button onClick={() => router.push("/upgrade")} size="lg">
            Upgrade to Pro
          </Button>
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="upload">Upload File</TabsTrigger>
            <TabsTrigger value="scan">Scan Items</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="saved">Saved Progress</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="p-4 border rounded-md">
            <FileUpload />
          </TabsContent>

          <TabsContent value="scan" className="p-4 border rounded-md">
            <BarcodeScanner />
          </TabsContent>

          <TabsContent value="summary" className="p-4 border rounded-md">
            <SummaryReport />
          </TabsContent>

          <TabsContent value="saved" className="p-4 border rounded-md">
            <SavedProgress />
          </TabsContent>
        </Tabs>
      )}
    </main>
  )
}
