import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';

/**
 * GET /api/whatsapp
 * Meta Webhook Verification Handshake
 */
export const verifyWebhook = asyncHandler(async (req, res) => {
    const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;

    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log("✅ Webhook verified successfully by Meta!");
        // Send raw challenge string back to Meta as requested
        return res.status(200).send(challenge);
    }

    throw new ApiError(403, "Webhook verification failed. Token mismatch.");
});

/**
 * POST /api/whatsapp
 * Handles incoming Meta WhatsApp payloads (Text, Audio/Voice, Media)
 */
export const handleIncomingMessage = asyncHandler(async (req, res) => {
    const incomingData = req.body;

    if (!incomingData || incomingData.object !== 'whatsapp_business_account') {
        throw new ApiError(400, "Invalid payload or not a WhatsApp Business event");
    }

    // Safely parse Meta's nested JSON payload
    const entry = incomingData.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    if (message) {
        const senderNumber = message.from;
        const messageType = message.type;

        console.log('\n--- New Incoming Meta WhatsApp Message ---');
        console.log('From:', senderNumber);
        console.log('Type:', messageType);

        if (messageType === 'text') {
            console.log('Text Content:', message.text?.body);
        } else if (messageType === 'audio') {
            // Voice notes and audio files come with a media ID
            console.log('Audio Media ID:', message.audio?.id);
            console.log('Is Voice Note?:', message.audio?.voice || false);
            console.log('MIME Type:', message.audio?.mime_type);
        }
    }

    // Meta strictly requires an HTTP 200 OK response within 20 seconds
    return res.status(200).json(
        new ApiResponse(200, {}, "Event received successfully")
    );
});