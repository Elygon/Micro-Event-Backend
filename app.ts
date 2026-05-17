import express, { Application } from 'express'
const app: Application = express()

import dotenv from 'dotenv'
dotenv.config()

//import { seedCategories } from "./utils/seedCategories"
import initCron from './utils/cron'

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

//seedCategories()
// Initialize Cron Jobs
initCron()

//routes
import auth from './routes/auth'
app.use('/auth', auth)

import profile from './routes/profile'
app.use('/profile', profile)

import event from './routes/event'
app.use('/event', event)

import savedEvent from './routes/savedEvent'
app.use('/savedEvent', savedEvent)

import attendance from './routes/attendance'
app.use('/attendance', attendance)

import comment from './routes/comment'
app.use('/comment', comment)

import category from './routes/category'
app.use('/category', category)

import users from './routes/users'
app.use('/users', users)

import notification from './routes/notification'
app.use('/notification', notification)

// import testPush from './testPush'
// app.use('/testPush', testPush)

// import devTools from './devTools'
// app.use('/devTools', devTools)

// server
const port = process.env.PORT || 4600
app.listen(port, () => {
  console.log(`server listening at port ${port}`)
})

export default app