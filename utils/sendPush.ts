import admin from '../services/firebase'

const sendPush = async (deviceToken: string, title: string, body: string) => {
    try {
        await admin.messaging().send({
            token: deviceToken,
            notification: { title, body }
        })

        console.log('Push notification sent')
    } catch (error) {
        console.error(error)
    }
}

export default sendPush