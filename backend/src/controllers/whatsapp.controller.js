import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const handleIncomingMessage = asyncHandler(async (req, res) => {
    const incomingData = req.body;
    
    if (!incomingData) {
        throw new ApiError(400, "No payload received from Twilio");
    }

    console.log('--- New Incoming WhatsApp Message ---');
    console.log('From:', incomingData.From);
    
    if (incomingData.NumMedia > 0 && incomingData.MediaContentType0.includes('audio')) {
        console.log('Audio URL:', incomingData.MediaUrl0);
    }

    // Since Twilio expects XML, we still send TwiML here instead of standard JSON
    res.set('Content-Type', 'text/xml');
    res.send(`
        <Response>
            <Message>Message received. Our system is processing your report.</Message>
        </Response>
    `);
});