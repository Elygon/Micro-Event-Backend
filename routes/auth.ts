import express, { Request, Response } from 'express'
const router = express.Router()

import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from '../models/user'
import token from '../middleware/userToken'
import{ sendVerificationOTP, sendResetPassword, sendDeleteAccountMail } from '../utils/nodemailer'
import { BRAND } from "../utils/emailTemplate"


// ======================== TYPES ========================
type JoinBody = {
    firstname: string
    middlename?: string
    lastname: string
    username: string
    email: string
    password: string
    interests: string[]
}

type LoginBody = {
    email: string
    username: string
    password: string
}

type ChangePasswordBody = {
    old_password: string
    new_password: string
    confirm_new_password: string
}

type ForgotPasswordBody = {
  email: string
}

type ResetPasswordBody = {
    new_password: string
    confirm_password: string
    resetPasswordCode: string
}


// create account
router.post('/join', async (req: Request, res: Response) => {
    const { firstname, middlename, lastname, username, email, /*phone_no,*/ password, interests } = req.body as JoinBody

    if (!firstname || !lastname || !username || !email /*|| !phone_no*/ || !password || !interests)
        return res.status(400).send({ status: 'error', msg: 'All fields must be filled' })

    // Start try block
    try {
        //Check if user already exists
        const check = await User.findOne({ email })
        if (check) {
            return res.status(409).send({ status: 'ok', msg: 'An account with this email already exists' })
        }

        //Hash password
        const hashedpassword = await bcrypt.hash(password, 10)

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString()

        // OTP expires in 15 minutes
        const otpExpiry = new Date(Date.now() + 15 * 60 * 1000)

        //Create new user
        const user = new User()
        user.firstname = firstname
        user.middlename = middlename
        user.lastname = lastname
        user.username = username
        user.email = email
        /*user.phone_no = phone_no || null*/
        user.password = hashedpassword
        user.interests = interests
        user.isVerified = false
        user.verificationOTP = otp
        user.otpExpiresAt = otpExpiry
        user.profile_img_url = ""
        user.profile_img_id = ""

        await user.save()

        /*
        // Generate verification token (optional if you want email/phone verification (expires in 30 minutes))
        const verificationToken = jwt.sign(
            { userId: user._id, email: user.email, phone_no: user.phone_no },
            process.env.JWT_SECRET,
            { expiresIn: "30m" }
        )*/

        // send verification OTP
        if (email) {
            await sendVerificationOTP(email, firstname, otp)
        }

        return res.status(201).send({
            status: "ok", msg: "Account created! Check your email to verify your account.", user: {
                _id: user._id,
                firstname: user.firstname,
                middlename: user.middlename,
                lastname: user.lastname,
                username: user.username,
                email: user.email,
                interests: user.interests,
                isVerified: user.isVerified
            }
        })

    } catch (error: any) {
        if (error.name == "JsonWebTokenError")
            return res.status(400).send({ status: 'error', msg: 'Invalid token' })

        return res.status(500).send({ status: 'error', msg: 'An error occured.', error })
    }
})

// endpoint to verify OTP
router.post("/verify_otp", async (req: Request, res: Response) => {
    try {
        const { email, otp } = req.body

        if (!email || !otp) {
            return res.status(400).send({ status: "error", msg: "Email and OTP are required" })
        }

        const user: any = await User.findOne({ email })

        if (!user) {
            return res.status(404).send({ status: "error", msg: "User with this email not found" })
        }

        // Already verified
        if (user.isVerified)
            return res.status(409).send({ status: "ok", msg: "Account already verified" })

        // Wrong OTP
        if  (user.verificationOTP !== otp) {
            return res.status(400).send({ status: "error", msg: "Invalid OTP" })
        }

        // OTP expired
        if (new Date() > user.otpExpiresAt) {
            return res.status(400).send({ status: "error", msg: "OTP expired" })
        }

        // Verify account
        user.isVerified = true
        user.verificationOTP = ""
        user.otpExpiresAt = null
        await user.save()
        
        return res.status(200).send({ status: "ok", msg: "Account successfully verified" })
        
    } catch (error: any) {
        console.log(error)
        if (error.name === "TokenExpiredError")
            return res.status(400).send({ status: "error", msg: "Verification link expired" })
            
        if (error.name === "JsonWebTokenError")
            return res.status(400).send({ status: "error", msg: "Invalid verification token" })
            
        console.error(error)
        return res.status(500).send({ status: "error", msg: "Verification failed" })
    }
})


// endpoint to resend OTP
router.post("/resend_otp", async (req: Request, res: Response) => {
    try {
        const { email } = req.body

        if (!email) {
            return res.status(400).send({ status: "error", msg: "Email is required" })
        }

        // Find user
        const user: any = await User.findOne({ email })

        if (!user) {
            return res.status(404).send({ status: "error", msg: "User with this email not found" })
        }

        // Prevent resending OTP if already verified
        if (user.isVerified)
            return res.status(409).send({ status: "ok", msg: "Account already verified" })


        // Generate new OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString()

        // OTP expires in 15 minutes
        const otpExpiry = new Date(Date.now() + 15 * 60 * 1000)

        // Update user with new OTP
        user.verificationOTP = otp
        user.otpExpiresAt = otpExpiry

        await user.save()

        // send verification OTP
        await sendVerificationOTP(user.email, user.firstname, otp)

        
        return res.status(200).send({ status: "ok", msg: "New OTP successfully sent" })
        
    } catch (error: any) {
        console.log(error)
        if (error.name === "TokenExpiredError")
            return res.status(400).send({ status: "error", msg: "Verification link expired" })
            
        if (error.name === "JsonWebTokenError")
            return res.status(400).send({ status: "error", msg: "Invalid verification token" })
            
        console.error(error)
        return res.status(500).send({ status: "error", msg: "Verification failed" })
    }
})

//endpoint to Login
router.post('/login', async (req: Request, res: Response) => {
    const { email, username, password } = req.body as LoginBody
    if ((!email && !username) || !password)
        return res.status(400).send({ status: 'error', msg: 'All fields must be filled' })

    try {
        const orConditions = []
        if (email) orConditions.push({ email: email.toLowerCase() })
        if (username) orConditions.push({ username: { $regex: `^${username}$`, $options: 'i' } })
        

        console.log('Searching for:', JSON.stringify(orConditions, null, 2));
        // Fetch user using email
        let user = await User.findOne({ $or: orConditions}).lean()

        if (!user)
            return res.status(404).send({
                status: 'error', msg: 'No account found with the provided username or email'
            })

        // check if user's account has been verified
        if (user.isVerified === false) {
            return res.status(403).send({ status: "error", msg: "Please verify your account first." })
        }

        // // check if blocked
        // if (user.is_blocked === true) {
        //     return res.status(400).send({ status: "error", msg: "account blocked" })
        // }

        // // check if banned
        // if (user.is_banned === true) {
        //     return res.status(400).send({ status: "error", msg: "account banned" })
        // }

        // // check if deleted
        // if (user.is_deleted === true) {
        //     return res.status(400).send({ status: "error", msg: "account deleted" })
        // }

        //compare password
        const correct_password = await bcrypt.compare(password, user.password)
        if (!correct_password)
            return res.status(400).send({ status: 'error', msg: 'Password is incorrect' })

        // cancel deletion if user logs in again
        if (user.deletionRequested) {
            await User.findByIdAndUpdate(user._id, {
                deletionRequested: false,
                deletionRequestedAt: null,
                scheduledDeletionAt: null
            })
        }

        // create token
        const token = jwt.sign({
            _id: user._id,
            email: user.email,
            role: user.role
        }, process.env.jwt_secret as string, { expiresIn: '1d' })

        //update user document to online
        user = await User.findOneAndUpdate({ _id: user._id }, { isOnline: true },
            { new: true, select: '_id firstname lastname username email interests isVerified isOnline' }
        ).lean()

        //send response
        res.status(200).send({ status: 'ok', msg: 'success', user, token })

    } catch (error) {
        console.log(error)
        return res.status(500).send({ status: 'error', msg: 'An error occured' })
    }
})

//endpoint to Logout
router.post('/logout', token, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user._id

        // Set user offline
        await User.findByIdAndUpdate(userId, { isOnline: false })

        return res.status(200).send({ status: 'ok', msg: 'success' })

    } catch (error) {
        console.log(error)
        if (error == "JsonWebTokenError")
            return res.status(400).send({ status: 'error', msg: 'Invalid token' })

        return res.status(500).send({ status: 'error', msg: 'An error occured' })
    }
})

// endpoint to change password
router.post('/change_password', token, async (req: Request, res: Response) => {
    const { old_password, new_password, confirm_new_password } = req.body as ChangePasswordBody

    //check if fields are passed correctly
    if (!old_password || !new_password || !confirm_new_password) {
        return res.status(400).send({ status: 'error', msg: 'all fields must be filled' })
    }

    // get user document and change password
    try {
        const user: any = await User.findById((req as any).user._id).select("password")

        if (!user) {
            return res.status(404).send({ status: 'error', msg: 'User not found' })
        }

        //Compare old password
        const check = await bcrypt.compare(old_password, user.password)
        if (!check) {
            return res.status(400).send({ status: 'error', msg: 'old password is incorrect' })
        }

        //Prevent reusing old password
        const isSamePassword = await bcrypt.compare(new_password, user.password)
        if (isSamePassword) {
            return res.status(400).send({ status: 'error', msg: 'New password must be different from the old password' })
        }

        //Confirm new passwords match
        if (new_password !== confirm_new_password) {
            return res.status(400).send({ status: 'error', msg: 'Password mismatch' })
        }

        //Hash new password and update
        const updatePassword = await bcrypt.hash(confirm_new_password, 10)
        await User.findByIdAndUpdate((req as any).user._id, { password: updatePassword })

        return res.status(200).send({ status: 'ok', msg: 'success' })
    } catch (error: any) {
        if (error.name === 'JsonWebTokenError') {
            console.log(error)
            return res.status(401).send({ status: 'error', msg: 'Token Verification Failed', error: error.message })
        }
        return res.status(500).send({ status: 'error', msg: 'An error occured', error: error.message })
    }
})


// endpoint for a user to reset their password
router.post('/forgot_password', async (req: Request, res: Response) => {
    const { email/*, phone_no*/ } = req.body as ForgotPasswordBody

    if (!email/*&& !phone_no*/) {
        return res.status(400).send({ status: 'error', msg: 'Email is required' })
    }

    try {
        // Fetch user using email
        let user: any = await User.findOne({ email }).lean()

        if (!user) {
            return res.status(400).send({ status: 'error', msg: 'No account found with the provided email' });
        }

        // Create reset token (expires in 10 min)
        const resetToken = jwt.sign(
            { _id: user._id },
            process.env.jwt_secret as string,
            { expiresIn: '10m' }
        );

        const resetLink = `http://localhost:4600/auth/reset_password/${resetToken}`

        // Send email
        await sendResetPassword(user.email, user.firstname, resetLink)

        return res.status(200).send({ status: 'ok', msg: 'Password reset link sent. Please check your email or phone.' })

    } catch (error: any) {
        console.error(error)
        return res.status(500).send({ status: 'error', msg: 'Error occurred', error: error.message })
    }
})


// endpoint to reset password webpage
router.get("/reset_password/:resetPasswordCode", 
    async (req: Request<{ resetPasswordCode: string }>, res: Response) => {
        const { resetPasswordCode } = req.params
        try {
            const data: any = jwt.verify(resetPasswordCode, process.env.JWT_SECRET as  string)

            const sendTime = data.timestamp;
            // check if more than 5 minutes has elapsed
            const timestamp = Date.now()
            if (timestamp > sendTime) {
                console.log("handle the expiration of the request code")
            }

            return res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Reset Password</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                </head>

                <body style="
                    margin:0;
                    font-family:Arial;
                    background:${BRAND.secondary};
                    display:flex;
                    justify-content:center;
                    align-items:center;
                    height:100vh;
                ">

                <div style="
                    width:100%;
                    max-width:420px;
                    background:${BRAND.white};
                    padding:30px;
                    border-radius:14px;
                    border:1px solid ${BRAND.border};
                ">

                    <h2 style="color:${BRAND.primary}; text-align:center;">
                        Recover Account
                    </h2>

                    <p style="color:${BRAND.textLight}; text-align:center;">
                        Enter your new password
                    </p>

                    <form action="/auth/reset_password" method="post">

                    <!-- NEW PASSWORD -->
                    <div style="position:relative; margin:10px 0;">
                        <input type="password" id="new_password" name="new_password"
                            placeholder="New password"
                            required
                            style="
                                width:100%;
                                padding:12px;
                                border:1px solid ${BRAND.border};
                                border-radius:8px;
                                padding-right:42px;
                                box-sizing: border-box;
                            ">

                        <button type="button"
                            onclick="togglePassword('new_password', this)"
                            aria-label="Show password"
                            style="
                                position:absolute;
                                right:10px;
                                top:50%;
                                transform:translateY(-50%);
                                background:none;
                                border:none;
                                cursor:pointer;
                                color:${BRAND.primary};
                            ">

                            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor"
                                fill="none" stroke-width="1.8"
                            >
                                <path d="M1 12s4.5-7 11-7 11 7 11 7-4.5 7-11 7S1 12 1 12Z"/>
                                <circle cx="12" cy="12" r="3"/>
                            </svg>
                        </button>
                    </div>

                    <!-- CONFIRM PASSWORD -->
                    <div style="position:relative; margin:10px 0;">
                        <input type="password" id="confirm_password" name="confirm_password"
                            placeholder="Confirm password"
                            required
                            style="
                                width:100%;
                                padding:12px;
                                border:1px solid ${BRAND.border};
                                border-radius:8px;
                                padding-right:42px;
                                box-sizing: border-box;
                            ">

                        <button type="button"
                            onclick="togglePassword('confirm_password', this)"
                            aria-label="Show password"
                            style="
                                position:absolute;
                                right:10px;
                                top:50%;
                                transform:translateY(-50%);
                                background:none;
                                border:none;
                                cursor:pointer;
                                color:${BRAND.primary};
                            ">

                            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="1.8">
                                <path d="M1 12s4.5-7 11-7 11 7 11 7-4.5 7-11 7S1 12 1 12Z"/>
                                <circle cx="12" cy="12" r="3"/>
                            </svg>
                        </button>
                    </div>

                    <input type="hidden" name="resetPasswordCode" value="${resetPasswordCode}" />

                    <button type="submit" style="
                        width:100%;
                        padding:12px;
                        background:${BRAND.primary};
                        color:white;
                        border:none;
                        border-radius:8px;
                        font-weight:bold;
                        cursor:pointer;
                        margin-top:10px;
                    ">
                        Reset Password
                    </button>
                    </form>
                </div>

                <script>
                function togglePassword(inputId, button) {
                    const input = document.getElementById(inputId);
                    const svg = button.querySelector('svg');

                    if (input.type === 'password') {
                        input.type = 'text';
                        button.setAttribute('aria-label', 'Hide password');

                        svg.innerHTML =
                            '<path d="M1 12s4.5-7 11-7 11 7 11 7-4.5 7-11 7S1 12 1 12Z"></path>' +
                            '<path d="M2 2l20 20" stroke="currentColor" stroke-width="1.8"></path>';
                        
                    } else {
                        input.type = 'password';
                        button.setAttribute('aria-label', 'Show password');

                        svg.innerHTML =
                            '<path d="M1 12s4.5-7 11-7 11 7 11 7-4.5 7-11 7S1 12 1 12Z"></path>' +
                            '<circle cx="12" cy="12" r="3"></circle>';
                    }
                }
                </script>

                </body>
                </html>
            `)
        } catch (e: any) {
            if (e.name === 'JsonWebTokenError') {
                // Handle general JWT errors
                console.error('JWT verification error:', e.message);
                return res.status(401).send(`</div>
                    <h1>Password Reset</h1>
                    <p>Token verification failed</p>
                </div>`);
            } else if (e.name === 'TokenExpiredError') {
                // Handle token expiration
                console.error('Token has expired at:', e.expiredAt);
                return res.status(401).send(`</div>
                    <h1>Password Reset</h1>
                    <p>Token expired</p>
                </div>`);
            }
            console.log(e);
            return res.status(200).send(`</div>
                <h1>Password Reset</h1>
                <p>An error occured!!! ${e.message}</p>
            </div>`)
        }
    }
)

// endpoint to reset password
router.post("/reset_password", async (req: Request, res: Response) => {
    const { new_password, confirm_password, resetPasswordCode } = req.body as ResetPasswordBody

    if (!new_password || !confirm_password || !resetPasswordCode) {
        return res
            .status(400)
            .json({ status: "error", msg: "All fields must be entered" })
    }

    // Check password equality
    if (new_password !== confirm_password) {
        return res
            .status(400)
            .json({ status: "error", msg: "Passwords do not match" });
    }

    // (Optional) check minimum length / complexity on the server side too
    if (new_password.length < 11) {
        return res
            .status(400)
            .json({ status: "error", msg: "Password must be at least 11 characters" });
    }

    try {
        const data: any = jwt.verify(resetPasswordCode, process.env.JWT_SECRET as string)
        const hashedPassword = await bcrypt.hash(new_password, 10)

        console.log("Resetting password for user ID:", data._id)


        // update the password field
        await User.updateOne(
            { _id: data._id },
            {
                $set: { password: hashedPassword },
            }
        );

        // return a response which is a web page
        return res.status(200).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>Password Reset Successful</title>
            </head>

            <body style="
                margin:0;
                padding:0;
                font-family:Arial, sans-serif;
                background:#F4F5FF;
                display:flex;
                justify-content:center;
                align-items:center;
                height:100vh;
            ">

            <div style="
                width:100%;
                max-width:480px;
                background:#FFFFFF;
                border:1px solid #E8E8F0;
                border-radius:18px;
                padding:40px;
                text-align:center;
                box-shadow:0 10px 30px rgba(0,0,0,0.08);
            ">

                <!-- Success Icon -->
                <div style="
                    width:80px;
                    height:80px;
                    background:#12002f;
                    border-radius:50%;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    margin:0 auto 20px auto;
                ">
                    <span style="color:white;font-size:40px;">✓</span>
                </div>

                <!-- Title -->
                <h1 style="
                    color:#12002f;
                    margin-bottom:10px;
                    font-size:26px;
                ">
                    Password Reset Successful
                </h1>

                <!-- Message -->
                <p style="
                    color:#666666;
                    font-size:16px;
                    line-height:1.6;
                    margin-bottom:30px;
                ">
                    Your password has been successfully updated.<br/>
                    You can now log in to your account with your new password.
                </p>

                <!-- Button -->
                <a href="http://localhost:4600/login" style="
                    display:inline-block;
                    padding:14px 28px;
                    background:#12002f;
                    color:#ffffff;
                    text-decoration:none;
                    border-radius:10px;
                    font-weight:bold;
                    font-size:15px;
                ">
                    Go to Login
                </a>

                <!-- Footer note -->
                <p style="
                    margin-top:25px;
                    font-size:13px;
                    color:#888888;
                ">
                    Micro-Event Discovery
               </p>
 
            </div>

            </body>
            </html>
    `)
    } catch (e: any) {
        if (e.name === 'JsonWebTokenError') {
            // Handle general JWT errors
            console.error('JWT verification error:', e.message);
            return res.status(401).send(`</div>
          <h1>Password Reset</h1>
          <p>Token verification failed</p>
          </div>`);
        } else if (e.name === 'TokenExpiredError') {
            // Handle token expiration
            console.error('Token has expired at:', e.expiredAt);
            return res.status(401).send(`</div>
          <h1>Password Reset</h1>
          <p>Token expired</p>
          </div>`);
        }
        console.log("error", e);
        return res.status(200).send(`</div>
      <h1>Reset Password</h1>
      <p>An error occured!!! ${e.message}</p>
      </div>`)
    }
})


//endpoint to request to delete account
router.post('/request_delete', token, async (req: Request, res: Response) => {
    try {
        const { password } = req.body
        
        if (!password) {
            return res.status(400).send({ status: 'error', msg: 'Password is required to request account deletion' })
        }

        //Find the user
        const user = await User.findById((req as any).user._id)

        //Check if the user exists
        if (!user)
            return res.status(404).send({ status: 'error', msg: 'User not found' })

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch) {
            return res.status(401).send({ status: 'error', msg: 'Incorrect password' })
        }

        // already requested
        if (user.deletionRequested) {
            return res.status(400).send({ status: 'error', msg: 'Deletion already requested' })
        }

        // create secure token
        const deleteToken = jwt.sign(
            { _id: user._id },
            process.env.jwt_secret as string,
            { expiresIn: '10m' }
        )

        // frontend url
        const deleteLink = `http://localhost:4600/auth/confirm_delete/${deleteToken}`

        //send email
        await sendDeleteAccountMail( user.email, user.firstname, deleteLink )

        return res.status(200).send({ status: 'ok', msg: 'Deletion confirmation email sent' })

    } catch (error) {
        console.log(error)

        if (error == "JsonWebTokenError")
            return res.status(400).send({ status: 'error', msg: 'Invalid token' })

        return res.status(500).send({ status: 'error', msg: 'An error occured' })
    }

})

// endpoint to delete account webpage
router.get('/confirm_delete/:token', async(req: Request<{ token: string }>, res: Response) => {
    try {
        const { token: deleteToken } = req.params
        const data: any = jwt.verify(
            deleteToken, process.env.jwt_secret as string
        )

        const user: any = await User.findById(data._id)

        if (!user) {
            return res.status(404).send({ status: 'error', msg: 'User not found' })
        }

         // prevent duplicate requests
        if (user.deletionRequested) {
            return res.send(`
                <!DOCTYPE html>
                <html>
                <body style="margin:0; font-family:Arial; background:${BRAND.secondary}; display:flex; justify-content:center; align-items:center; height:100vh;">
                    <div style="width:100%; max-width:420px; background:${BRAND.white}; padding:30px; border-radius:14px; border:1px solid ${BRAND.border}; text-align:center;">
                        <h2 style="color:${BRAND.primary};">Deletion Already Scheduled</h2>
                    </div>
                </body>
                </html>
            `)
        }

        return res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Confirm Deletion</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
            </head>
            <body style="
                margin:0;
                font-family:Arial;
                background:${BRAND.secondary};
                display:flex;
                justify-content:center;
                align-items:center;
                height:100vh;
            ">
                <div style="
                    width:100%;
                    max-width:420px;
                    background:${BRAND.white};
                    padding:30px;
                    border-radius:14px;
                    border:1px solid ${BRAND.border};
                    text-align:center;
                ">

                    <div style="
                        width:70px;
                        height:70px;
                        margin:0 auto 20px;
                        border-radius:50%;
                        background:rgba(109, 27, 59, 0.12);
                        display:flex;
                        align-items:center;
                        justify-content:center;
                    ">
                        <svg viewBox="0 0 24 24" style="
                            width:34px;
                            height:34px;
                            stroke:#6d1b3b;
                            fill:none;
                            stroke-width:2;
                        ">
                            <path d="M12 9v4"></path>
                            <path d="M12 17h.01"></path>
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        </svg>
                    </div>

                    <h2 style="color:${BRAND.primary};">
                        Confirm Account Deletion
                    </h2>
                    <p style="color:${BRAND.textLight};">
                        Are you sure you want to delete your account? It will be permanently deleted in 7 days.
                    </p>
                    <p style="color:${BRAND.textLight}; font-size: 14px;">
                        Logging back in before then will cancel the deletion request.
                    </p>
                    <form action="/auth/confirm_delete" method="POST">
                        <input type="hidden" name="token" value="${deleteToken}" />
                        <button type="submit" style="
                            width:100%;
                            padding:12px;
                            background:#6d1b3b;
                            color:white;
                            border:none;
                            border-radius:8px;
                            font-weight:bold;
                            cursor:pointer;
                            margin-top:24px;
                        ">
                            Yes, Delete My Account
                        </button>
                    </form>
                </div>
            </body>
            </html>
        `)
    } catch (error: any) {

        if (error.name === "TokenExpiredError") {
            return res.status(400).send({ status: 'error', msg: 'Deletion link expired' })
        }

        if (error.name === "JsonWebTokenError") {
            return res.status(400).send({ status: 'error', msg: 'Invalid deletion link' })
        }

        console.log(error)

        return res.status(500).send({ status: 'error', msg: 'Something went wrong' })
    }
})

// actual POST endpoint to process the deletion
router.post('/confirm_delete', async(req: Request, res: Response) => {
    try {
        const { token } = req.body
        
        if (!token) {
            return res.status(400).send({ status: 'error', msg: 'Token is required' })
        }

        const data: any = jwt.verify(
            token, process.env.jwt_secret as string
        )

        const user: any = await User.findById(data._id)

        if (!user) {
            return res.status(404).send({ status: 'error', msg: 'User not found' })
        }

         // prevent duplicate requests
        if (user.deletionRequested) {
            return res.send(`
                <!DOCTYPE html>
                <html>
                <body style="margin:0; font-family:Arial; background:${BRAND.secondary}; display:flex; justify-content:center; align-items:center; height:100vh;">
                    <div style="width:100%; max-width:420px; background:${BRAND.white}; padding:30px; border-radius:14px; border:1px solid ${BRAND.border}; text-align:center;">
                        <h2 style="color:${BRAND.primary};">Deletion Already Scheduled</h2>
                    </div>
                </body>
                </html>
            `)
        }

        // schedule deletion
        user.deletionRequested = true
        user.deletionRequestedAt = new Date()

        // 7 days later
        user.scheduledDeletionAt = new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000
        )

        await user.save()

        res.status(200).send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>Account Update</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
            </head>
            <body style="
                margin: 0;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                background-color: ${BRAND.secondary || '#ffffff'};
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
            ">

            <div style="
                width: 100%;
                max-width: 375px;
                padding: 24px;
                text-align: center;
            ">

                <!-- Minimalist Professional Icon (SVG) -->
                <div style="margin-bottom: 32px;">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="11" stroke="${BRAND.primary}" stroke-width="1.5"/>
                        <path d="M12 7V12L15 15" stroke="${BRAND.primary}" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>
                </div>

                <h2 style="
                    color: ${BRAND.textDark || '#000000'}; 
                    margin: 0 0 16px 0; 
                    font-size: 23px; 
                    font-weight: 765;
                    letter-spacing: -0.8px;
                ">
                    Account Scheduled for Deletion
                </h2>
        
                <p style="
                    color: ${BRAND.textLight || '#65676b'}; 
                    font-size: 16px; 
                    line-height: 1.5; 
                    margin-bottom: 40px;
                ">
                    We've received your request. Your account and all event data will be permanently removed in <strong>7 days</strong>.
                </p>

                <!-- Social-Style Action Button -->
                <button style="
                    background-color: ${BRAND.primary};
                    color: ${BRAND.white || '#ffffff'};
                    border: none;
                    padding: 16px;
                    border-radius: 50px;
                    font-size: 16px;
                    font-weight: 700;
                    width: 100%;
                    margin-bottom: 16px;
                    cursor: pointer;
                ">
                    Keep My Account
                </button>

                <p style="
                    color: ${BRAND.textLight || '#8a8d91'}; 
                    font-size: 14px; 
                    line-height: 1.4;
                ">
                    Logging back in before the deadline will automatically cancel this request.
                </p>
            </div>
            </body>
            </html>
        `)
    } catch (error: any) {
        console.error("DELETION_ERROR:", error);
        if (error.name === "TokenExpiredError") {
            return res.status(400).send({ status: 'error', msg: 'Deletion token expired' })
        }
        if (error.name === "JsonWebTokenError") {
            return res.status(400).send({ status: 'error', msg: 'Invalid deletion token' })
        }
        console.log(error)
        return res.status(500).send({ status: 'error', msg: 'Something went wrong' })
    }
})

export default router