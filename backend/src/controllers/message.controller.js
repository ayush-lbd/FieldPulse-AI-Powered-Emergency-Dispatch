import { Message } from '../models/message.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

// @desc    Get all messages/locations for a specific contact
// @route   GET /api/v1/messages/:contactId
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