import mongoose from 'mongoose'

const PasskeySchema = new mongoose.Schema({
  email: { type: String, required: true }, // Ties to the user's email
  credentialID: { type: String, required: true }, // Base64URL encoded credential ID
  credentialPublicKey: { type: String, required: true }, // Base64URL encoded public key
  counter: { type: Number, required: true },
  credentialDeviceType: { type: String, required: true },
  credentialBackedUp: { type: Boolean, required: true },
  transports: { type: [String] },
}, { timestamps: true })

export default mongoose.models.Passkey || mongoose.model('Passkey', PasskeySchema)
