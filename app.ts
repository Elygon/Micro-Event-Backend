import express, { Application } from 'express'
const app: Application = express()

import dotenv from 'dotenv'
dotenv.config()

// middlewares
app.use(express.json())
app.use(express.urlencoded({extended: true}))

// database connection
import mongoose from 'mongoose'
mongoose.connect(process.env.mongo_uri as string)
const con = mongoose.connection
con.on('open', error => {
    if(error) {
        console.log(`Error connecting to the database ${error}`)
    } else {
        console.log('Connected to the Database')
    }
})


//routes
import auth from './user_routes/auth'
app.use('/auth', auth)

import profile from './user_routes/profile'
app.use('/profile', profile)

// server
const port = process.env.PORT || 4600
app.listen(port, () => {
  console.log(`server listening at port ${port}`)
})

export default app