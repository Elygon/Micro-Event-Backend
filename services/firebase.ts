import admin from 'firebase-admin'
const serviceAccount = JSON.parse(process.env.firebase_service_account as string)

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
})

export default admin