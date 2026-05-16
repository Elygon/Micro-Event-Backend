import cron from 'node-cron'
import User from '../models/user'
import Event from '../models/event'
import Attendance from '../models/attendance'
import Notification from '../models/notification'
import sendPush from './sendPush'

const initCron = () => {
    // DELETE SCHEDULED ACCOUNTS
    cron.schedule('0 0 * * *', async() => {
        console.log('Checking for accounts to permanently delete...')

        try {
            const now = new Date()

            const deletedUsers = await User.deleteMany({
                scheduledDeletionAt: { $lte: now }
            })

            console.log(`${deletedUsers.deletedCount} accounts deleted`)
        } catch (error: any) {
            console.log(error)
        }
    })


    // EVENT REMINDERS
    cron.schedule('*/10 * * * *', async () => {
        console.log('Checking event reminders...')

        try {
            const now = new Date()

            const events = await Event.find({ isCancelled: false })

            for (const event of events as any[]) {
                const timeLeft = event.startDate.getTime() - now.getTime()

                let reminderType = ''
                let title = ''
                let msg = ''

                // 48 hours
                if (
                    timeLeft <= 48 * 60 * 60 * 1000 && timeLeft > 24 * 60 * 60 * 1000 && !event.reminderSent.fortyEightHour
                ) {
                    reminderType = 'fortyEightHour'
                    title = 'Event Reminder'
                    msg = `${event.title} starts in 2 days`
                }

                // 24 hours
                else if (
                    timeLeft <=24 * 60 * 60 * 1000 && timeLeft > 60 * 60 * 1000 && !event.reminderSent.twentyFourHour
                ) {
                    reminderType = 'twentyFourHour'
                    title = 'Event Reminder'
                    msg = `${event.title} starts in 24 hours`
                } 
                // 1hour
                else if (
                    timeLeft <= 60 * 60 * 1000 && timeLeft > 0 && !event.reminderSent.oneHour
                ) {
                    reminderType = 'oneHour'
                    title = 'Event Starting Soon'
                    msg = `${event.title} starts in 1 hour`
                }

                if (!reminderType) continue

                const attendees = await Attendance.find({ event: event._id, status: 'going' })
                .populate('user', '_id deviceToken')

                await Promise.all(
                    (attendees as any[]).map(async (attendee) => {
                        await Notification.create({
                            user: attendee.user._id,
                            type: 'event_reminder',
                            title,
                            msg,
                            event: event._id
                        })

                        if (attendee.user.deviceToken) {
                            await sendPush(
                                attendee.user.deviceToken,
                                title,
                                msg
                            )
                        }
                    })
                )

                event.reminderSent[reminderType] = true
                await event.save()
            }
        } catch (error: any) {
            console.error('Reminder cron error:', error)
        }
    })
}

export default initCron