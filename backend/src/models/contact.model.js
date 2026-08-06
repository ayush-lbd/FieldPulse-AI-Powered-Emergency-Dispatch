import mongoose from 'mongoose';

const contactSchema = new mongoose.Schema({
    phoneNumber: {
        type: String,
        required: true,
        unique: true,
        index: true // Makes lookups instantaneous when a new webhook arrives
    },
    profileName: {
        type: String,
        default: 'Unknown'
    },
    rescueStatus: {
        type: String,
        enum: ['pending', 'dispatched', 'rescued', 'safe'],
        default: 'pending'
    },
    lastKnownLocation: {
        latitude: { type: Number },
        longitude: { type: Number },
        updatedAt: { type: Date } // Tracks exactly when they last sent a pin
    }
}, { 
    timestamps: true // Automatically manages createdAt and updatedAt fields
});

export const Contact = mongoose.model('Contact', contactSchema);