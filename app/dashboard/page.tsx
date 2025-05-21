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
import { TrialExpiredSummary } from "@/components/trial-expired-summary"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function Dashboard() {
  const { activeTab, setActiveTab, fileConfig, scannedItems } = useShipmentStore()
  const { isAuthenticated, userType, logout, isTrialExpired } = useAuthStore()
  const [showTrialExpired, setShowTrialExpired] = useState(false)
  const [showTrialExpiredDialog, setShowTrialExpiredDialog] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  // Check authentication
  useEffect(() => {
    if (!isAuthenticated && !userType) {
      router.push("/")
    }
  }, [isAuthenticated, userType, router])

  // Check if trial has expired - run this check every second
  useEffect(() => {
    if (userType !== "guest") return

    const checkTrialStatus = () => {
      if (isTrialExpired()) {
        if (!showTrialExpired) {
          console.log("Trial expired, showing dialog")
          setShowTrialExpired(true)
          setShowTrialExpiredDialog(true)
        }
      }
    }

    // Initial check
    checkTrialStatus()

    // Set up interval to check every second
    const interval = setInterval(checkTrialStatus, 1000)

    return () => clearInterval(interval)
  }, [userType, isTrialExpired, showTrialExpired])

  const handleLogout = () => {
    logout()
    router.push("/")
    toast({
      title: "Logged out",
      description: "You have been logged out successfully",
    })
  }

  const handleUpgrade = () => {
    router.push("/upgrade")
  }

  const handleViewSummary = () => {
    console.log("View Summary clicked")
    setShowTrialExpiredDialog(false)
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
        <TrialExpiredSummary onUpgrade={handleUpgrade} />
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

      {/* Trial Expired Dialog */}
      <Dialog open={showTrialExpiredDialog} onOpenChange={setShowTrialExpiredDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Trial Period Expired</DialogTitle>
            <DialogDescription>Your trial period has ended. Thank you for trying our application!</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p>
              To continue using all features, please upgrade to the Pro version. The summary report has been
              automatically generated for you.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleViewSummary}>
              View Summary
            </Button>
            <Button onClick={handleUpgrade}>Upgrade to Pro</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
