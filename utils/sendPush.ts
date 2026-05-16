import admin from '../services/firebase'

const sendPush = async (deviceToken: string, title: string, body: string): Promise<boolean> => {
    try {
        await admin.messaging().send({
            token: deviceToken,
            notification: { title, body }
        })

        console.log('Push notification sent')
        return true
    } catch (error) {
        console.error('Push notification error:', error)
        return false
    }
}

export default sendPush