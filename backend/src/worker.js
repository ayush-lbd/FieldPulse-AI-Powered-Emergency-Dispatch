import dotenv from 'dotenv';
// Load environment variables from .env file
dotenv.config();
import { sendWhatsAppMessage } from './services/whatsapp.service.js';
import amqp from 'amqplib';
import { connectDB } from './database/db.js'; 
import { Contact } from './models/contact.model.js';
import { Message } from './models/message.model.js';
import { GoogleGenAI } from '@google/genai';
import { io } from 'socket.io-client';
import axios from 'axios';

const socket = io('http://localhost:3000');
socket.on('connect', () => {
  console.log('⚡ Worker connected to main Socket.io server!');
});

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
// --- NEW: Updated AI Processing Function for Text, Audio, and Images ---
async function processMessageWithGemini(contentsInput) {
    console.log(`🧠 Sending content to Gemini...`);

    const systemInstruction = `
        You are a highly trained disaster management AI. 
        Analyze the incoming distress report (which could be text, an audio voice note, or an image) and extract the critical information into the requested JSON format.
    `;

    try {
        // We pass the contents as an array so Gemini can read both text and media parts natively
        const finalContents = [systemInstruction].concat(
            Array.isArray(contentsInput) ? contentsInput : [contentsInput]
        );

        const response = await ai.models.generateContent({
            model: 'gemini-3.6-flash',
            contents: finalContents,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                temperature: 0.2 
            }
        });

        return JSON.parse(response.text);

    } catch (error) {
        console.error("❌ Error processing with Gemini:", error);
        return null;
    }
}

async function downloadMetaMedia(mediaId) {
    const META_TOKEN = process.env.META_ACCESS_TOKEN;
    
    // 1. Get the media URL from Meta
    const urlRes = await axios.get(`https://graph.facebook.com/v18.0/${mediaId}`, {
        headers: { Authorization: `Bearer ${META_TOKEN}` }
    });
    
    // 2. Download the binary data
    const mediaRes = await axios.get(urlRes.data.url, {
        headers: { Authorization: `Bearer ${META_TOKEN}` },
        responseType: 'arraybuffer' // Crucial for audio/images
    });
    
    return {
        mimeType: urlRes.data.mime_type,
        data: Buffer.from(mediaRes.data, 'binary').toString('base64') // Convert for Gemini
    };
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
        else if (contact.rescueStatus === 'safe') {
            // Repeat victim facing a NEW danger! Reset their status to alert dispatchers.
            contact.rescueStatus = 'pending';
            await contact.save();
            console.log(`🚨 Status reset to PENDING for repeat contact: ${phoneNumber}`);
        }

        // 2. Prepare message fields
        let textContent = null;
        let locationData = null;
        let aiAnalysis = null; // --- NEW: Variable to hold Gemini's JSON output ---

        if (messageType === 'text') {
            textContent = message.text?.body;
            
            aiAnalysis = await processMessageWithGemini(`Analyze this distress text: ${textContent}`);
            
            if (aiAnalysis) {
                console.log("✅ Gemini Analysis Complete:", aiAnalysis);
                const autoReply = `🚨 *Automated System:* We have classified your report as a ${aiAnalysis.urgency} ${aiAnalysis.category} incident. Rescue coordinators are reviewing your situation now.`;
                await sendWhatsAppMessage(phoneNumber, autoReply);
            }

        } else if (messageType === 'audio' || messageType === 'image') {
            const mediaId = messageType === 'audio' ? message.audio.id : message.image.id;
            
            console.log(`📥 Downloading ${messageType} from Meta...`);
            const mediaData = await downloadMetaMedia(mediaId);
            
            // Format media payload for Gemini SDK
            const mediaPart = {
                inlineData: {
                    data: mediaData.data,
                    mimeType: mediaData.mimeType
                }
            };

            aiAnalysis = await processMessageWithGemini([
                mediaPart, 
                `Analyze this ${messageType} distress report. Extract the emergency details into the required JSON fields.`
            ]);

            if (aiAnalysis) {
                console.log(`✅ Gemini ${messageType} Analysis Complete:`, aiAnalysis);
                textContent = `[Attached ${messageType} analyzed by AI: ${aiAnalysis.summary}]`;
                
                const autoReply = `🚨 *Automated System:* We received your ${messageType}. Classified as a ${aiAnalysis.urgency} ${aiAnalysis.category} incident. Help is being coordinated.`;
                await sendWhatsAppMessage(phoneNumber, autoReply);
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
        }else {
            // --- NEW: Fallback for Documents, Videos, Stickers, etc. ---
            console.log(`⚠️ Received unsupported message type: ${messageType}`);
            
            textContent = `[Received unsupported file type: ${messageType}]`;
            
            const replyText = `🚨 *Automated System:* We cannot process ${messageType} files. Please send a text message, a voice note, or a photo describing your emergency.`;
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
        
        socket.emit('worker:new_message', {
            contact,
            message: savedMessage,
            aiAnalysis
        });
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