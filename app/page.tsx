"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/lib/auth-store"

export default function Home() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const { login, setUserType } = useAuthStore()

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Check against hardcoded admin credentials
    if (email === "kristophardivine@gmail.com" && password === "Thantophobia1!") {
      login("admin", email)
      toast({
        title: "Login successful",
        description: "Welcome back, Admin!",
      })
      router.push("/dashboard")
    } else {
      toast({
        title: "Login failed",
        description: "Invalid email or password",
        variant: "destructive",
      })
    }

    setIsLoading(false)
  }

  const handleGuestLogin = () => {
    setUserType("guest")
    toast({
      title: "Guest access granted",
      description: "You have 30 minutes to use the application",
    })
    router.push("/dashboard")
  }

  const handleProUserLogin = () => {
    router.push("/login")
  }

  return (
    <main className="container mx-auto py-8 px-4 min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-3xl font-bold mb-8 text-center">Shipment Quantity Verification</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Admin Login</CardTitle>
            <CardDescription>Sign in with your admin credentials</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Signing in..." : "Sign in as Admin"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Guest Access</CardTitle>
              <CardDescription>Try the application for 30 minutes</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleGuestLogin} className="w-full">
                Continue as Guest
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pro User</CardTitle>
              <CardDescription>Sign in with your pro account</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleProUserLogin} variant="outline" className="w-full">
                Sign in as Pro User
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
