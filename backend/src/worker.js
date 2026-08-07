import dotenv from 'dotenv';
// Load environment variables from .env file
dotenv.config();
import { sendWhatsAppMessage } from './services/whatsapp.service.js';
import amqp from 'amqplib';
import { connectDB } from './database/db.js'; 
import { Contact } from './models/contact.model.js';
import { Message } from './models/message.model.js';

// --- NEW: Import the official Google Gen AI SDK ---
import { GoogleGenAI } from '@google/genai';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
const QUEUE_NAME = 'whatsapp_messages';

// --- NEW: Initialize Gemini ---
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// --- NEW: Define the strict JSON structure for Gemini's output ---
const responseSchema = {
    type: "OBJECT",
    properties: {
        category: { 
            type: "STRING", 
            description: "The type of disaster or emergency (e.g., Flood, Medical, Fire, Earthquake, Unknown)" 
        },
        urgency: { 
            type: "STRING", 
            description: "The severity level: Low, Medium, High, or Critical" 
        },
        location: { 
            type: "STRING", 
            description: "Any mentioned addresses, cities, or landmarks (return 'Unknown' if none)" 
        },
        summary: { 
            type: "STRING", 
            description: "A brief, highly professional 1-2 sentence summary of the situation for dispatchers" 
        }
    },
    required: ["category", "urgency", "location", "summary"]
};

// --- NEW: The core AI processing function ---
async function processMessageWithGemini(rawMessageText) {
    console.log(`🧠 Sending to Gemini: "${rawMessageText}"`);

    const prompt = `
        You are a highly trained disaster management AI. 
        Analyze the following distress message from a citizen and extract the critical information.
        
        Distress Message: "${rawMessageText}"
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3.6-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                temperature: 0.2 // Low temperature for factual, consistent extraction
            }
        });

        // Gemini guarantees perfectly structured JSON because of the config above
        return JSON.parse(response.text);

    } catch (error) {
        console.error("❌ Error processing with Gemini:", error);
        return null;
    }
}

/**
 * Async Message Processor
 * Extracts incoming data, updates/creates the Contact, and saves the Message to MongoDB.
 */
const processIncomingMessage = async (rawPayload) => {
    try {
        const entry = rawPayload.entry?.[0];
        const changes = entry?.changes?.[0]?.value;
        const message = changes?.messages?.[0];
        const contactInfo = changes?.contacts?.[0];

        if (!message) {
            console.log('ℹ️ Received webhook update without user message content. Skipping.');
            return;
        }

        const phoneNumber = message.from;
        const profileName = contactInfo?.profile?.name || 'Unknown User';
        const messageId = message.id;
        const messageType = message.type; 
        const messageTimestamp = new Date(parseInt(message.timestamp) * 1000);

        // 1. Find or create the Contact document
        let contact = await Contact.findOne({ phoneNumber });

        if (!contact) {
            contact = await Contact.create({
                phoneNumber,
                profileName,
                rescueStatus: 'pending'
            });
            console.log(`👤 Created new contact record for: ${phoneNumber}`);
        }

        // 2. Prepare message fields
        let textContent = null;
        let locationData = null;
        let aiAnalysis = null; // --- NEW: Variable to hold Gemini's JSON output ---

        if (messageType === 'text') {
            textContent = message.text?.body;
            
            // --- NEW: Pass the text to Gemini before saving ---
            aiAnalysis = await processMessageWithGemini(textContent);
            
            if (aiAnalysis) {
                console.log("✅ Gemini Analysis Complete:", aiAnalysis);
                // Optional: You can also update the contact's overall urgency level here
                // contact.urgency = aiAnalysis.urgency; 
                // await contact.save();
            }

        } else if (messageType === 'location') {
            locationData = {
                latitude: message.location?.latitude,
                longitude: message.location?.longitude
            };

            contact.lastKnownLocation = {
                latitude: message.location?.latitude,
                longitude: message.location?.longitude,
                updatedAt: messageTimestamp
            };
            await contact.save();
            console.log(`📍 Updated last known location for ${phoneNumber}`);
            
            const replyText = "🚨 We have successfully received your coordinates. Rescue teams have been notified and are actively monitoring your location. If you move, please share your location again.";
            await sendWhatsAppMessage(phoneNumber, replyText);
        }

        // 3. Save the Message document linked via contactId
        const savedMessage = await Message.create({
            contactId: contact._id,
            messageId,
            messageType,
            textContent,
            locationData,
            aiAnalysis, // --- NEW: Attach the structured JSON directly to the message! ---
            timestamp: messageTimestamp
        });

        console.log(`💾 Saved message (${messageType}) from ${phoneNumber} to MongoDB! ID: ${savedMessage._id}`);

    } catch (error) {
        console.error('❌ Error processing message payload:', error.message);
        throw error;
    }
};

/**
 * Worker Initialization
 */
async function startWorker() {
    try {
        await connectDB();

        const connection = await amqp.connect(RABBITMQ_URL);
        const channel = await connection.createChannel();

        await channel.assertQueue(QUEUE_NAME, { durable: true });
        console.log('👷 Worker running! Awaiting queued messages...');

        channel.consume(QUEUE_NAME, async (msg) => {
            if (msg !== null) {
                try {
                    const payload = JSON.parse(msg.content.toString());

                    await processIncomingMessage(payload);

                    channel.ack(msg);
                } catch (err) {
                    console.error('❌ Processing failed:', err.message);
                }
            }
        }, { noAck: false });

    } catch (error) {
        console.error('❌ Worker failed to start:', error);
    }
}

startWorker();