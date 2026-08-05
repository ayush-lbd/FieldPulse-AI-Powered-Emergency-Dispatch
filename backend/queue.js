import amqp from 'amqplib';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
export const QUEUE_NAME = 'whatsapp_messages';

export async function connectQueue() {
    try {
        const connection = await amqp.connect(RABBITMQ_URL);
        const channel = await connection.createChannel();
        
        await channel.assertQueue(QUEUE_NAME, { durable: true });
        console.log('✅ Connected to RabbitMQ!');
        
        return channel;
    } catch (error) {
        console.error('❌ Failed to connect to RabbitMQ:', error);
    }
}