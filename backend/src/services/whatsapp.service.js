import dotenv from 'dotenv';
dotenv.config();

/**
 * Sends a text message back to a user via the Meta Graph API.
 * @param {string} recipientNumber - The user's WhatsApp number.
 * @param {string} messageText - The text content to send.
 */
export const sendWhatsAppMessage = async (recipientNumber, messageText) => {
    const phoneNumberId = process.env.META_PHONE_NUMBER_ID;
    const accessToken = process.env.META_ACCESS_TOKEN;
    
    // Meta Graph API URL (v19.0 is standard, update if using a newer version)
    const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;

    // The strict JSON payload required by Meta for text messages
    const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipientNumber,
        type: 'text',
        text: {
            body: messageText
        }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || 'Failed to send Meta message');
        }

        console.log(`\n📤 [Meta API] Successfully sent automated reply to ${recipientNumber}`);
        return data;

    } catch (error) {
        console.error('\n❌ [Meta API Error]:', error.message);
        // We do not throw the error here so that a failed reply doesn't crash the worker
    }
};