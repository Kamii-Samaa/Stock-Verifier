"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

type UserType = "admin" | "guest" | "pro" | null

type AuthStore = {
  isAuthenticated: boolean
  userType: UserType
  userEmail: string | null
  trialStartTime: number | null
  login: (userType: UserType, email: string) => void
  logout: () => void
  setUserType: (userType: UserType) => void
  startTrial: () => void
  isTrialExpired: () => boolean
  getRemainingTrialTime: () => number
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      userType: null,
      userEmail: null,
      trialStartTime: null,
      login: (userType, email) => set({ isAuthenticated: true, userType, userEmail: email }),
      logout: () => set({ isAuthenticated: false, userType: null, userEmail: null, trialStartTime: null }),
      setUserType: (userType) => set({ userType }),
      startTrial: () => {
        // Set the trial start time to the current timestamp
        set({ trialStartTime: Date.now() })
        console.log("Trial started at:", Date.now())
      },
      isTrialExpired: () => {
        const { trialStartTime } = get()
        if (!trialStartTime) return false
        // 30 minutes in milliseconds
        const trialDuration = 5 * 60 * 1000
        return Date.now() - trialStartTime > trialDuration
      },
      getRemainingTrialTime: () => {
        const { trialStartTime } = get()
        if (!trialStartTime) return 0
        const trialDuration = 5 * 60 * 1000
        const elapsed = Date.now() - trialStartTime
        return Math.max(0, trialDuration - elapsed)
      },
    }),
    {
      name: "shipment-verification-auth",
    },
  ),
)
