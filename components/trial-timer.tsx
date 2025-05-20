"use client"

import { useEffect, useState } from "react"
import { useAuthStore } from "@/lib/auth-store"
import { AlertCircle, Clock } from "lucide-react"

export function TrialTimer() {
  const { getRemainingTrialTime, isTrialExpired, trialStartTime } = useAuthStore()
  const [remainingTime, setRemainingTime] = useState(getRemainingTrialTime())

  useEffect(() => {
    // Only start the timer if trial has been started
    if (!trialStartTime) return

    const interval = setInterval(() => {
      const remaining = getRemainingTrialTime()
      setRemainingTime(remaining)

      if (remaining <= 0) {
        clearInterval(interval)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [getRemainingTrialTime, trialStartTime])

  // Format time as MM:SS
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  // Determine color based on remaining time
  const getTimerColor = () => {
    if (remainingTime <= 5 * 60 * 1000) return "text-red-600" // Last 5 minutes
    if (remainingTime <= 10 * 60 * 1000) return "text-amber-600" // Last 10 minutes
    return "text-green-600"
  }

  if (!trialStartTime) {
    return (
      <div className="flex items-center gap-2 text-gray-500 font-medium">
        <Clock size={18} />
        <span>Trial not started</span>
      </div>
    )
  }

  if (isTrialExpired()) {
    return (
      <div className="flex items-center gap-2 text-red-600 font-medium">
        <AlertCircle size={18} />
        <span>Trial Period Expired</span>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-2 font-medium ${getTimerColor()}`}>
      <Clock size={18} />
      <span>Trial Time: {formatTime(remainingTime)}</span>
    </div>
  )
}
