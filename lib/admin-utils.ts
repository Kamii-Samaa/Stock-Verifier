"use server"

import { writeFile, readFile, mkdir, unlink } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"
import { v4 as uuidv4 } from "uuid"
import crypto from "crypto"

// Storage path for user data
const USERS_PATH = "/tmp/shipment-verification/users"
const CODES_PATH = "/tmp/shipment-verification/codes"

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

  // Generate a 30-character code with letters, numbers, and special characters
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+"
  let code = ""
  const randomBytes = crypto.randomBytes(30)

  for (let i = 0; i < 30; i++) {
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

    // Hash the password (in a real app, use a proper password hashing library)
    const hashedPassword = crypto.createHash("sha256").update(password).digest("hex")

    // Add the new user
    users.push({
      id: uuidv4(),
      email,
      password: hashedPassword,
      createdAt: new Date().toISOString(),
      activationCode: code,
    })

    // Save the updated users list
    await writeFile(usersPath, JSON.stringify(users))

    // Mark the code as used
    const codePath = join(CODES_PATH, `${code}.json`)
    await writeFile(codePath, JSON.stringify({ used: true, usedBy: email, createdAt: new Date().toISOString() }))

    // Send email notifications (simulated)
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

    // Hash the provided password
    const hashedPassword = crypto.createHash("sha256").update(password).digest("hex")

    // Find the user
    const user = users.find((u: any) => u.email === email && u.password === hashedPassword)

    return !!user
  } catch (error) {
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
    await writeFile(usersPath, JSON.stringify(users))

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

// Simulated email functions
async function sendUserConfirmationEmail(email: string): Promise<void> {
  console.log(`[SIMULATED EMAIL] To: ${email}
Subject: Welcome to Shipment Verification Pro!
Body: Thank you for upgrading to Pro! Your account has been activated.
Your login credentials:
Email: ${email}
Password: (The password you set during registration)
`)
}

async function sendAdminNotificationEmail(email: string): Promise<void> {
  console.log(`[SIMULATED EMAIL] To: kristophardivine@gmail.com
Subject: New Pro User Registration
Body: A new user has registered for Shipment Verification Pro:
Email: ${email}
Time: ${new Date().toISOString()}
`)
}
