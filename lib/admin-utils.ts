"use server"

import { writeFile, readFile, mkdir, unlink } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"
import { v4 as uuidv4 } from "uuid"
import crypto from "crypto"
import nodemailer from "nodemailer"
import { USERS_PATH, CODES_PATH } from "./constants"

// Ensure storage directories exist
async function ensureStorageDirs() {
  try {
    if (!existsSync(USERS_PATH)) {
      await mkdir(USERS_PATH, { recursive: true })
    }
    if (!existsSync(CODES_PATH)) {
      await mkdir(CODES_PATH, { recursive: true })
    }
  } catch (error) {
    console.error("Error creating storage directories:", error)
    throw new Error("Failed to create storage directories")
  }
}

// Generate a random activation code
export async function generateCode(): Promise<string> {
  await ensureStorageDirs()

  // Generate a 16-character code with letters and numbers (more user-friendly)
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = ""
  const randomBytes = crypto.randomBytes(16)

  for (let i = 0; i < 16; i++) {
    const index = randomBytes[i] % characters.length
    code += characters.charAt(index)
  }

  // Save the code to the codes directory
  const codePath = join(CODES_PATH, `${code}.json`)
  await writeFile(codePath, JSON.stringify({ used: false, createdAt: new Date().toISOString() }))

  return code
}

// Validate an activation code
export async function validateCode(code: string): Promise<boolean> {
  try {
    const codePath = join(CODES_PATH, `${code}.json`)
    const codeData = JSON.parse(await readFile(codePath, "utf-8"))

    // Check if the code has already been used
    if (codeData.used) {
      return false
    }

    return true
  } catch (error) {
    // If file doesn't exist or can't be read, code is invalid
    return false
  }
}

// Register a new pro user
export async function registerProUser(code: string, email: string, password: string): Promise<boolean> {
  await ensureStorageDirs()

  try {
    // Validate the code first
    const isValid = await validateCode(code)
    if (!isValid) {
      return false
    }

    // Check if user already exists
    const usersPath = join(USERS_PATH, "users.json")
    let users = []

    try {
      const usersData = await readFile(usersPath, "utf-8")
      users = JSON.parse(usersData)
    } catch (error) {
      // If file doesn't exist, create an empty array
      users = []
    }

    // Check if email already exists
    if (users.some((user: any) => user.email === email)) {
      throw new Error("Email already exists")
    }

    // Hash the password with salt for better security
    const salt = crypto.randomBytes(16).toString("hex")
    const hashedPassword = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex")

    // Add the new user
    users.push({
      id: uuidv4(),
      email,
      password: hashedPassword,
      salt,
      createdAt: new Date().toISOString(),
      activationCode: code,
    })

    // Save the updated users list
    await writeFile(usersPath, JSON.stringify(users, null, 2))

    // Mark the code as used
    const codePath = join(CODES_PATH, `${code}.json`)
    await writeFile(
      codePath,
      JSON.stringify(
        {
          used: true,
          usedBy: email,
          createdAt: new Date().toISOString(),
        },
        null,
        2,
      ),
    )

    // Send email notifications
    await sendUserConfirmationEmail(email)
    await sendAdminNotificationEmail(email)

    return true
  } catch (error) {
    console.error("Error registering user:", error)
    throw error
  }
}

// Login a pro user
export async function loginProUser(email: string, password: string): Promise<boolean> {
  try {
    const usersPath = join(USERS_PATH, "users.json")
    const usersData = await readFile(usersPath, "utf-8")
    const users = JSON.parse(usersData)

    // Find the user
    const user = users.find((u: any) => u.email === email)

    if (!user) return false

    // Verify password with salt
    const hashedPassword = crypto.pbkdf2Sync(password, user.salt, 1000, 64, "sha512").toString("hex")

    return hashedPassword === user.password
  } catch (error) {
    console.error("Error during login:", error)
    // If file doesn't exist or can't be read, login fails
    return false
  }
}

// Get all pro users
export async function getProUsers(): Promise<any[]> {
  try {
    const usersPath = join(USERS_PATH, "users.json")
    const usersData = await readFile(usersPath, "utf-8")
    const users = JSON.parse(usersData)

    // Return only necessary information, not passwords
    return users.map((user: any) => ({
      email: user.email,
      createdAt: user.createdAt,
    }))
  } catch (error) {
    // If file doesn't exist or can't be read, return empty array
    return []
  }
}

// Delete a pro user
export async function deleteUser(email: string): Promise<boolean> {
  try {
    const usersPath = join(USERS_PATH, "users.json")
    const usersData = await readFile(usersPath, "utf-8")
    let users = JSON.parse(usersData)

    // Find the user to get their activation code
    const user = users.find((u: any) => u.email === email)
    if (!user) {
      return false
    }

    // Remove the user
    users = users.filter((u: any) => u.email !== email)
    await writeFile(usersPath, JSON.stringify(users, null, 2))

    // Delete the activation code file if it exists
    try {
      const codePath = join(CODES_PATH, `${user.activationCode}.json`)
      await unlink(codePath)
    } catch (error) {
      // Ignore errors if code file doesn't exist
    }

    return true
  } catch (error) {
    console.error("Error deleting user:", error)
    return false
  }
}

// Configure email transporter (using Ethereal for testing)
async function createTestAccount() {
  try {
    // Create a test account at Ethereal
    const testAccount = await nodemailer.createTestAccount()

    // Create a transporter using the test account
    const transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    })

    return { transporter, user: testAccount.user }
  } catch (error) {
    console.error("Failed to create test email account:", error)
    return null
  }
}

// Send confirmation email to user
async function sendUserConfirmationEmail(email: string): Promise<void> {
  try {
    const account = await createTestAccount()

    if (!account) {
      console.log(`[EMAIL FAILED] Could not send confirmation to: ${email}`)
      return
    }

    const info = await account.transporter.sendMail({
      from: `"Shipment Verification" <${account.user}>`,
      to: email,
      subject: "Welcome to Shipment Verification Pro!",
      text: `Thank you for upgrading to Pro! Your account has been activated.
Your login credentials:
Email: ${email}
Password: (The password you set during registration)`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to Shipment Verification Pro!</h2>
          <p>Thank you for upgrading to Pro! Your account has been activated.</p>
          <p><strong>Your login credentials:</strong></p>
          <p>Email: ${email}<br>
          Password: (The password you set during registration)</p>
          <p>You can now enjoy unlimited access to all features.</p>
          <p>Best regards,<br>The Shipment Verification Team</p>
        </div>
      `,
    })

    console.log(`[EMAIL SENT] Message sent to ${email}: ${info.messageId}`)
    console.log(`[EMAIL PREVIEW] Preview URL: ${nodemailer.getTestMessageUrl(info)}`)
  } catch (error) {
    console.error(`[EMAIL ERROR] Failed to send email to ${email}:`, error)
  }
}

// Send notification email to admin
async function sendAdminNotificationEmail(email: string): Promise<void> {
  try {
    const account = await createTestAccount()

    if (!account) {
      console.log(`[EMAIL FAILED] Could not send admin notification about: ${email}`)
      return
    }

    const info = await account.transporter.sendMail({
      from: `"Shipment Verification System" <${account.user}>`,
      to: "kristophardivine@gmail.com",
      subject: "New Pro User Registration",
      text: `A new user has registered for Shipment Verification Pro:
Email: ${email}
Time: ${new Date().toISOString()}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>New Pro User Registration</h2>
          <p>A new user has registered for Shipment Verification Pro:</p>
          <p><strong>Email:</strong> ${email}<br>
          <strong>Time:</strong> ${new Date().toLocaleString()}</p>
        </div>
      `,
    })

    console.log(`[EMAIL SENT] Admin notification sent: ${info.messageId}`)
    console.log(`[EMAIL PREVIEW] Preview URL: ${nodemailer.getTestMessageUrl(info)}`)
  } catch (error) {
    console.error(`[EMAIL ERROR] Failed to send admin notification about ${email}:`, error)
  }
}
