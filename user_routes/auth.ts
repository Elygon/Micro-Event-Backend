import express, { Request, Response } from 'express'
const router = express.Router()

import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from '../models/user'

import token from '../middleware/userToken'


// ======================== TYPES ========================
type RegisterBody = {
    firstname: string
    middlename?: string
    lastname: string
    username: string
    email: string
    password: string
}

type LoginBody = {
    email: string
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
router.post('/register', async (req: Request, res: Response) => {
    const { firstname, middlename, lastname, username, email, /*phone_no,*/ password } = req.body as RegisterBody

    if (!firstname || !lastname || !username || !email /*|| !phone_no*/ || !password)
        return res.status(400).send({ status: 'error', msg: 'All fields must be filled' })

    // Start try block
    try {
        //Check if user already exists
        const check = await User.findOne({ email })
        if (check) {
            return res.status(200).send({ status: 'ok', msg: 'An account with this email already exists' })
        }

        //Hash password
        const hashedpassword = await bcrypt.hash(password, 10)

        //Create new user
        const user = new User()
        user.firstname = firstname
        user.middlename = middlename
        user.lastname = lastname
        user.username = username
        user.email = email
        /*user.phone_no = phone_no || null*/
        user.password = hashedpassword
        //user.is_verified = false
        user.profile_img_url = ""
        user.profile_img_id = ""

        await user.save()

        /*
        // Generate verification token (optional if you want email/phone verification (expires in 30 minutes))
        const verificationToken = jwt.sign(
            { userId: user._id, email: user.email, phone_no: user.phone_no },
            process.env.JWT_SECRET,
            { expiresIn: "30m" }
        )
        
        // Optionallly, send OTP/email verification only if email is provided
        if (email) {
            await sendOTP(email, fullname, verificationToken)
        }
*/
        return res.status(200).send({
            status: "ok", msg: "success"
            /*msg: "Account created! Check your email to verify your account."*/, user
        })

    } catch (error: any) {
        if (error.name == "JsonWebTokenError")
            return res.status(400).send({ status: 'error', msg: 'Invalid token' })

        return res.status(500).send({ status: 'error', msg: 'An error occured.', error })
    }
})

// endpoint to verify account
/*
router.get("/verify/:token", async (req, res) => {
    const { token } = req.params

    try {
        const user = jwt.verify(token, process.env.JWT_SECRET)
        
        const Vuser = await User.findById({_id: user._id})
        if (!Vuser)
            return res.status(400).send({ status: "error", msg: "User not found" })
        
        if (Vuser.is_verified)
            return res.status(200).send({ status: "ok", msg: "Account already verified" })
        Vuser.is_verified = true
        await Vuser.save()
        
        return res.status(200).send({ status: "ok", msg: "Account successfully verified" })
        
    } catch (error) {
        if (error.name === "TokenExpiredError")
            return res.status(400).send({ status: "error", msg: "Verification link expired" })
            
        if (error.name === "JsonWebTokenError")
            return res.status(400).send({ status: "error", msg: "Invalid verification token" })
            
        console.error(error)
        return res.status(500).send({ status: "error", msg: "Verification failed" })
    }
})
*/

//endpoint to Login
router.post('/login', async (req: Request, res: Response) => {
    const { email, password } = req.body as LoginBody
    if (!email || !password)
        return res.status(400).send({ status: 'error', msg: 'All fields must be filled' })

    try {
        // Fetch user using email
        let user: any = await User.findOne({ email }).lean()
        if (!user)
            return res.status(400).send({
                status: 'error', msg: 'No account found with the provided email'
            })

        // check if user's account has been verified
        /*
        if (user.is_verified) {
            return res.status(400).send({ status: "error", msg: "Please verify your account first." })
        }*/

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

        // create token
        const token = jwt.sign({
            _id: user._id,
            email: user.email
        }, process.env.JWT_SECRET as string, { expiresIn: '1d' })

        //update user document to online
        user = await User.findOneAndUpdate({ _id: user._id }, { is_online: true }, { new: true }).lean()

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
        await User.findByIdAndUpdate(userId, { is_online: false })

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
            return res.status(400).send({ status: 'error', msg: 'User not found' })
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
            process.env.JWT_SECRET as string,
            { expiresIn: '10m' }
        );

        // Send email (or SMS later if implemented)
        //await sendPasswordReset(user.email, user.firstname, resetToken)

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

            return res.send(`<!DOCTYPE html>
                <html>
                <head>\
                    <title>Forgot Password</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1">    
                    <style>
                        body {
                            font-family: Arial, Helvetica, sans-serif;
                            margin-top: 10%;
                        }
                        form{
                            width: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            margin-left: 26%;
                            margin-top: 0%;
                        }
                        @media screen and (max-width: 900px) {
                            form{
                                width: 50%;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                            }
                        }
                        input[type=text]
                        {
                            width: 100%;
                            padding: 12px 20px;
                            margin: 8px 0;
                            display: inline-block;
                            border: 1px solid #ccc;
                            box-sizing: border-box;
                        }
  
                        button {
                            background-color: #04AA6D;
                            color: white;
                            padding: 14px 20px;
                            margin: 8px 0;
                            border: none;
                            cursor: pointer;
                            width: 100%;
                        }
  
                        button:hover {
                            opacity: 0.8
                        }   
  
                        .container {
                            padding: 16px;
                        }
  
                        span.psw {
                            float: right;
                            padding-top: 16px;
                        }
  
                        /* Change styles for span and cancel button on extra small screens */
                        @media screen and (max-width: 300px) {
                            span.psw {
                                display: block;
                                float: none;
                            }
  
                            .cancelbtn {
                                width: 100%;
                            }
                        }
                    </style>
                </head>
                <body>    
                    <h2 style="display: flex; align-items: center; justify-content: center; margin-bottom: 0;">Recover Account</h2>
                    <h6 style="display: flex; align-items: center; justify-content: center; font-weight: 200;">Enter the new password
                        you want to use in recovering your account
                    </h6>    
          
                    <form action="http://localhost:1000/auth/reset_password" method="post">
                        <div class="imgcontainer"> </div>
                        <div class="container">
                            <input type="password" placeholder="Enter new password" name="new_password" required style="border-radius: 5px" minlength="11">
                            <input type="password" placeholder="Confirm new password" name="confirm_password" required style="border-radius: 5px" minlength="11">
                            <input type="hidden" name="resetPasswordCode" value="${resetPasswordCode}"><br>
                            <button type="submit" style="border-radius: 5px; background-color: #1aa803">Submit</button>
                        </div>
                    </form>
                </body>
                </html>`
            )
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
        return res.status(200).send(`</div>
      <h1>Reset Password</h1>
      <p>Your password has been reset successfully!!!</p>
      <p>You can now login with your new password.</p>
      </div>`);
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


//endpoint to delete account
router.post('/delete', token, async (req: Request, res: Response) => {
    try {
        //Find the user and delete the account
        const deleted = await User.findByIdAndDelete((req as any).user._id)

        //Check if the user exists and was deleted
        if (!deleted)
            return res.status(400).send({ status: 'error', msg: 'No user Found' })

        return res.status(200).send({ status: 'ok', msg: 'success' })

    } catch (error) {
        console.log(error)

        if (error == "JsonWebTokenError")
            return res.status(400).send({ status: 'error', msg: 'Invalid token' })

        return res.status(500).send({ status: 'error', msg: 'An error occured' })
    }

})

export default router