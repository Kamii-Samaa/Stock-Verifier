"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SheetSelector } from "./sheet-selector"
import { uploadFile } from "@/lib/file-utils"
import { useToast } from "@/hooks/use-toast"
import { useAuthStore } from "@/lib/auth-store"

export function FileUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [fileUploaded, setFileUploaded] = useState(false)
  const { toast } = useToast()
  const { userType, startTrial, trialStartTime } = useAuthStore()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]

      // Check if file is Excel
      if (!selectedFile.name.match(/\.(xlsx|xls|xlsm)$/)) {
        toast({
          title: "Invalid file type",
          description: "Please select an Excel file (.xlsx, .xls, or .xlsm)",
          variant: "destructive",
        })
        return
      }

      setFile(selectedFile)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setIsUploading(true)
    try {
      await uploadFile(file)
      setFileUploaded(true)

      // Start the trial timer for guest users if not already started
      if (userType === "guest" && !trialStartTime) {
        startTrial()
        console.log("Trial started at:", Date.now())
        toast({
          title: "Trial started",
          description: "Your 30-minute trial has started",
        })
      }

      toast({
        title: "File uploaded successfully",
        description: "You can now select a sheet and configure columns",
      })
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "There was an error uploading your file",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload Shipment File</CardTitle>
          <CardDescription>Select the Excel file containing shipment data from your supplier</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="file">Excel File</Label>
              <Input id="file" type="file" onChange={handleFileChange} accept=".xlsx,.xls,.xlsm" />
            </div>

            <Button onClick={handleUpload} disabled={!file || isUploading} className="w-full sm:w-auto">
              {isUploading ? "Uploading..." : "Upload File"}
            </Button>

            {file && <p className="text-sm text-gray-500">Selected file: {file.name}</p>}
          </div>
        </CardContent>
      </Card>

      {fileUploaded && <SheetSelector />}
    </div>
  )
}
