import amqp from 'amqplib';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
export const QUEUE_NAME = 'whatsapp_messages';

let channel; // This will store our connection

export async function connectQueue() {
    try {
        const connection = await amqp.connect(RABBITMQ_URL);
        channel = await connection.createChannel();
        
        await channel.assertQueue(QUEUE_NAME, { durable: true });
        console.log('✅ Connected to RabbitMQ!');
    } catch (error) {
        console.error('❌ Failed to connect to RabbitMQ:', error);
    }
}

// Any controller can call this function to drop a message in the queue
export function sendToWhatsAppQueue(data) {
    if (!channel) {
        console.error('❌ RabbitMQ Channel not initialized yet!');
        return;
    }
    channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(data)));
    console.log('📥 Message successfully added to RabbitMQ queue!');
}