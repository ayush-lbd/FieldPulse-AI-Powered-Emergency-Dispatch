
export const handleIncomingMessage = (req, res) => {
    const incomingData = req.body;
    
    console.log('--- New Incoming WhatsApp Message ---');
    console.log('From:', incomingData.From);
    console.log('Body:', incomingData.Body);
    
    
    if (incomingData.NumMedia > 0 && incomingData.MediaContentType0.includes('audio')) {
        console.log('Audio URL:', incomingData.MediaUrl0);
    }

    // Twilio expects an XML (TwiML) response to acknowledge receipt
    res.set('Content-Type', 'text/xml');
    res.send(`
        <Response>
            <Message>Message received. Our system is processing your report.</Message>
        </Response>
    `);
};