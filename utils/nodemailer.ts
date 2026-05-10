import nodemailer from 'nodemailer'
import { buildEmailTemplate, BRAND } from "../utils/emailTemplate"

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.mail_user,
        pass: process.env.mail_pass
    }
})

// send verification otp
export const sendVerificationOTP = async ( email: string, firstname: string, otp: string ) => {
    return await transporter.sendMail({
        from: `"Micro-Event Discovery" <${process.env.MAIL_USER}>`,
        to: email,
        subject: "Verify Your Account",

        html: buildEmailTemplate(
            "Account Verification",

            `
            <p>Hello ${firstname},</p>

            <p>
                Use the verification code below to verify your account.
            </p>

            <div style="
                margin:30px 0;
                padding:25px;
                text-align:center;
                background:${BRAND.secondary};
                border-radius:12px;
                border:1px solid ${BRAND.border};
            ">
                <span style="
                    font-size:36px;
                    font-weight:bold;
                    letter-spacing:10px;
                    color:${BRAND.primary};
                ">
                    ${otp}
                </span>
            </div>

            <p>
                This OTP expires in <strong>15 minutes</strong>.
            </p>

            <p style="
                font-size:14px;
                color:#888;
                margin-top:30px;
            ">
                If you did not create this account,
                you can safely ignore this email.
            </p>
            `
        )
    })
}



// send reset password email
export const sendResetPassword = async ( email: string, firstname: string, resetLink: string ) => {
    return await transporter.sendMail({
        from: `"Micro-Event Discovery" <${process.env.MAIL_USER}>`,
        to: email,
        subject: "Reset Your Password",

        html: buildEmailTemplate(
            "Password Reset",

            `
            <p>Hello ${firstname},</p>

            <p>
                We received a request to reset your password for your
                <strong>Micro-Event Discovery</strong> account.
            </p>

            <div style="
                margin:30px 0;
                padding:25px;
                text-align:center;
                background:${BRAND.secondary};
                border-radius:12px;
                border:1px solid ${BRAND.border};
            ">

                <p style="
                    font-size:18px;
                    color:${BRAND.textDark};
                    margin-bottom:15px;
                ">
                    Click the button below to reset your password
                </p>

                <a href="${resetLink}" style="
                    display:inline-block;
                    padding:14px 28px;
                    background:${BRAND.primary};
                    color:#fff;
                    text-decoration:none;
                    border-radius:10px;
                    font-weight:bold;
                ">
                    Reset Password
                </a>

            </div>

            <p>
                This link will expire in <strong>10 minutes</strong> for your security.
            </p>

            <p style="
                font-size:14px;
                color:#888;
                margin-top:30px;
            ">
                If you did not request this, you can safely ignore this email.
            </p>
            `
        )
    })
}