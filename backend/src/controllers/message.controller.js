import { Message } from '../models/message.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { Contact } from '../models/contact.model.js';
import { sendWhatsAppMessage } from '../services/whatsapp.service.js';
// @desc    Get all messages/locations for a specific contact
// @route   GET /api/v1/messages/:contactId

export const sendManualReply = async (req, res) => {
    try {
        const { contactId } = req.params;
        const { text } = req.body;

        // 1. Find the contact to get their phone number
        const contact = await Contact.findById(contactId);
        if (!contact) {
            return res.status(404).json(new ApiResponse(404, null, "Contact not found"));
        }

        // 2. Send the message via Meta/Twilio API
        await sendWhatsAppMessage(contact.phoneNumber, text);

        // 3. Save this outgoing message to MongoDB so it appears in the timeline
        const savedMessage = await Message.create({
            contactId,
            messageId: `outbound_${Date.now()}`,
            messageType: 'text',
            textContent: text,
            timestamp: new Date(),
            isFromDispatcher: true // Optional: Add this boolean to your Message schema
        });

        return res.status(200).json(new ApiResponse(200, savedMessage, "Reply sent successfully"));
    } catch (error) {
        return res.status(500).json(new ApiResponse(500, null, error.message));
    }
};

export const getMessagesByContact = asyncHandler(async (req, res) => {
    const { contactId } = req.params;

    // Sort by timestamp ascending (1) to show oldest messages at the top, newest at the bottom
    const messages = await Message.find({ contactId }).sort({ timestamp: 1 });

    if (!messages) {
        throw new ApiError(404, "No messages found for this contact");
    }

    return res.status(200).json(
        new ApiResponse(200, messages, "Message history fetched successfully")
    );
});