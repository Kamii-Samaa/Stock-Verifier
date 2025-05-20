import nodemailer from "nodemailer"

// Create a transporter using SMTP credentials
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number.parseInt(process.env.SMTP_PORT || "587"),
  secure: Number.parseInt(process.env.SMTP_PORT || "587") === 465, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
})

// Function to send user confirmation email
export async function sendUserConfirmationEmail(email: string): Promise<void> {
  try {
    await transporter.sendMail({
      from: `"Stock Verifier" <${process.env.FROM_EMAIL}>`,
      to: email,
      subject: "Welcome to Stock Verifier Pro!",
      text: `Thank you for upgrading to Pro! Your account has been activated.
Your login credentials:
Email: ${email}
Password: (The password you set during registration)`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to Stock Verifier Pro!</h2>
          <p>Thank you for upgrading to Pro! Your account has been activated.</p>
          <h3>Your login credentials:</h3>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Password:</strong> (The password you set during registration)</p>
        </div>
      `,
    })
  } catch (error) {
    console.error("Error sending user confirmation email:", error)
    throw error
  }
}

// Function to send admin notification email
export async function sendAdminNotificationEmail(email: string): Promise<void> {
  try {
    await transporter.sendMail({
      from: `"Stock Verifier System" <${process.env.FROM_EMAIL}>`,
      to: "kristophardivine@gmail.com",
      subject: "New Pro User Registration",
      text: `A new user has registered for Stock Verifier Pro:
Email: ${email}
Time: ${new Date().toISOString()}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>New Pro User Registration</h2>
          <p>A new user has registered for Stock Verifier Pro:</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Time:</strong> ${new Date().toISOString()}</p>
        </div>
      `,
    })
  } catch (error) {
    console.error("Error sending admin notification email:", error)
    throw error
  }
}
