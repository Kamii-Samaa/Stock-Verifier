import { NextResponse } from "next/server"
import { sendUserConfirmationEmail, sendAdminNotificationEmail } from "@/lib/email"

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    await sendUserConfirmationEmail(email)
    await sendAdminNotificationEmail(email)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error sending test emails:", error)
    return NextResponse.json({ error: "Failed to send emails" }, { status: 500 })
  }
}
