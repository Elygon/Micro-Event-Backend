import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.mail_user,
        pass: process.env.mail_pass
    }
})

// send verification otp
export const sendVerificationOTP = async ( email: string, firstname: string,otp: string) => {
    await transporter.sendMail({
        from: `"Micro-Event Discovery" <${process.env.mail_user}>`,
        to: email,
        subject: 'Verify Your Account',
        html: `
        <div style="font-family: Arial, sans-serif;">
            <h2>Verify Your Account</h2>

            <p>Hello ${firstname},</p>

            <p>Your verification OTP is:</p>

            <h1 style="letter-spacing: 3px;">${otp}</h1>

            <p>This OTP will expire in 15 minutes.</p>
            
            <p>If you did not create this account, please ignore this email.</p>
        </div>
        `
    })
}