"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useAuthStore } from "@/lib/auth-store"
import { useRouter } from "next/navigation"
import { generateCode, getProUsers, deleteUser } from "@/lib/admin-utils"

type ProUser = {
  email: string
  createdAt: string
}

export default function AdminConsole() {
  const [proUsers, setProUsers] = useState<ProUser[]>([])
  const [generatedCode, setGeneratedCode] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()
  const { userType } = useAuthStore()
  const router = useRouter()

  // Check if user is admin
  useEffect(() => {
    if (userType !== "admin") {
      router.push("/")
      toast({
        title: "Access denied",
        description: "You must be an admin to access this page",
        variant: "destructive",
      })
    } else {
      loadUsers()
    }
  }, [userType, router, toast])

  const loadUsers = async () => {
    try {
      const users = await getProUsers()
      setProUsers(users)
    } catch (error) {
      toast({
        title: "Error loading users",
        description: "Could not load pro users",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerateCode = async () => {
    try {
      const code = await generateCode()
      setGeneratedCode(code)
      toast({
        title: "Code generated",
        description: "New activation code has been generated",
      })
    } catch (error) {
      toast({
        title: "Error generating code",
        description: "Could not generate activation code",
        variant: "destructive",
      })
    }
  }

  const handleDeleteUser = async (email: string) => {
    if (confirm(`Are you sure you want to delete user ${email}?`)) {
      try {
        await deleteUser(email)
        setProUsers(proUsers.filter((user) => user.email !== email))
        toast({
          title: "User deleted",
          description: `User ${email} has been deleted`,
        })
      } catch (error) {
        toast({
          title: "Error deleting user",
          description: "Could not delete user",
          variant: "destructive",
        })
      }
    }
  }

  const handleCopyCode = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode)
      toast({
        title: "Code copied",
        description: "Activation code copied to clipboard",
      })
    }
  }

  return (
    <main className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Admin Console</h1>
        <Button variant="outline" onClick={() => router.push("/dashboard")}>
          Back to Dashboard
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Generate Activation Code</CardTitle>
            <CardDescription>Create a single-use code for new pro users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button onClick={handleGenerateCode} className="w-full">
                Generate New Code
              </Button>

              {generatedCode && (
                <div className="mt-4 space-y-2">
                  <div className="p-3 bg-gray-100 rounded-md break-all font-mono text-sm">{generatedCode}</div>
                  <Button onClick={handleCopyCode} variant="outline" size="sm" className="w-full">
                    Copy to Clipboard
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pro Users</CardTitle>
            <CardDescription>Manage users with pro access</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-4">Loading users...</div>
            ) : proUsers.length > 0 ? (
              <div className="space-y-4">
                {proUsers.map((user) => (
                  <div key={user.email} className="flex justify-between items-center p-3 border rounded-md">
                    <div>
                      <div className="font-medium">{user.email}</div>
                      <div className="text-sm text-gray-500">Added: {user.createdAt}</div>
                    </div>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteUser(user.email)}>
                      Delete
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">No pro users found</div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
