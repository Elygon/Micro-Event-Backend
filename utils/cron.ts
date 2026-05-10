import cron from 'node-cron'
import User from '../models/user'

const initCron = () => {
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
}

export default initCron
