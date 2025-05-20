"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { getSavedProgressList, loadSavedProgress } from "@/lib/file-utils"
import { useShipmentStore } from "@/lib/store"

export function SavedProgress() {
  const [savedProgressList, setSavedProgressList] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()
  const { setScannedItems, setProgressName, setActiveTab } = useShipmentStore()

  useEffect(() => {
    const loadSavedProgressList = async () => {
      try {
        const list = await getSavedProgressList()
        setSavedProgressList(list)
      } catch (error) {
        toast({
          title: "Error loading saved progress",
          description: "Could not load your saved progress list",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadSavedProgressList()
  }, [toast])

  const handleLoadProgress = async (name: string) => {
    try {
      const items = await loadSavedProgress(name)

      if (items.length === 0) {
        toast({
          title: "Empty progress",
          description: "This saved progress contains no items",
          variant: "destructive",
        })
        return
      }

      // Update the global state
      setScannedItems(items)
      setProgressName(name)

      toast({
        title: "Progress loaded",
        description: `Loaded ${items.length} items from "${name}"`,
      })

      // Navigate to scan items page
      setActiveTab("scan")
    } catch (error) {
      toast({
        title: "Error loading progress",
        description: "Could not load the selected progress",
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return <div className="text-center py-8">Loading saved progress...</div>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Saved Progress</CardTitle>
          <CardDescription>Load your previously saved scanning sessions</CardDescription>
        </CardHeader>
        <CardContent>
          {savedProgressList.length > 0 ? (
            <div className="space-y-4">
              {savedProgressList.map((name) => (
                <div key={name} className="flex items-center justify-between p-3 border rounded-md">
                  <span className="font-medium">{name}</span>
                  <Button onClick={() => handleLoadProgress(name)}>Load</Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              No saved progress found. Start a new scanning session and save your progress.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
