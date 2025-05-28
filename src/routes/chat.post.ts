import { Route } from '@sapphire/plugin-api';
import { WebhookClient } from 'discord.js';
import { z } from 'zod';

// Extend the Request type to include IP and body
interface MinecraftRequest extends Route.Request {
	ip: string;
	body: unknown;
}

// Define the expected payload schema
const ChatPayloadSchema = z.object({
	payload: z.object({
		eventType: z.literal('CHAT_MESSAGE'),
		playerName: z.string(),
		message: z.string(),
		uuid: z.string()
	})
});

export class UserRoute extends Route {
	public override async run(request: MinecraftRequest, response: Route.Response) {
		this.container.logger.info("Chat message received");
		try {
			// Validate payload
			const { payload } = ChatPayloadSchema.parse(await request.readBody());
			this.container.logger.info(`Processing message from ${payload.playerName}`);

			// Get webhook URL from environment
			const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
			if (!webhookUrl) {
				return response.status(500).json({ error: 'Discord webhook not configured' });
			}

			// Create webhook client
			const webhookClient = new WebhookClient({ url: webhookUrl });

			// Send message to Discord
            // TODO: Change to verified discord user
			await webhookClient.send({ content: payload.message, username: payload.playerName, avatarURL: `https://mc-heads.net/avatar/${payload.uuid}` });
			this.container.logger.info(`Message from ${payload.playerName} relayed to Discord`);

			return response.status(200).json({ success: true });
		} catch (error: unknown) {
			if (error instanceof z.ZodError) {
				this.container.logger.error('Invalid payload format:', error.errors.map(e => e.message).join(', '));
				return response.status(400).json({ error: 'Invalid payload format', details: error.errors.map(e => e.message).join(', ') });
			}
			this.container.logger.error('Error processing chat message:', error);
			return response.status(500).json({ error: 'Internal server error' });
		}
	}
}
