import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    contactId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Contact',
        required: true,
        index: true 
    },
    messageId: {
        type: String,
        required: true,
        unique: true 
    },
    messageType: {
        type: String,
        enum: ['text', 'image', 'audio', 'location', 'document', 'unknown'],
        required: true
    },
    textContent: {
        type: String,
        default: null
    },
    locationData: {
        latitude: { type: Number },
        longitude: { type: Number }
    },
    mediaId: {
        type: String,
        default: null
    },
    timestamp: {
        type: Date,
        required: true
    }
}, { 
    timestamps: true 
});

export const Message = mongoose.model('Message', messageSchema);