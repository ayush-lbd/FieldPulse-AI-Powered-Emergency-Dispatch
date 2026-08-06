import amqp from 'amqplib';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
const QUEUE_NAME = 'whatsapp_messages';

async function startWorker() {
    try {
        const connection = await amqp.connect(RABBITMQ_URL);
        const channel = await connection.createChannel();
        
        // Ensure the queue exists
        await channel.assertQueue(QUEUE_NAME, { durable: true });
        console.log('👷 Worker started! Waiting for messages in queue:', QUEUE_NAME);

        // Tell RabbitMQ to push messages to this function
        channel.consume(QUEUE_NAME, (msg) => {
            if (msg !== null) {
                console.log('\n✅ [Worker] Picked up a new message!');
                
                // Convert the buffer back into a readable JavaScript object
                const messageData = JSON.parse(msg.content.toString());
                
                // Log the raw data (you can customize this later)
                console.log('Data payload received:', JSON.stringify(messageData, null, 2));

                // IMPORTANT: Tell RabbitMQ we finished processing this message
                channel.ack(msg);
                console.log('🗑️ [Worker] Message processed and removed from queue.');
            }
        }, { noAck: false }); // noAck: false means we MUST explicitly call channel.ack(msg)

    } catch (error) {
        console.error('❌ Worker failed to connect:', error);
    }
}

startWorker();