import { Route } from '@sapphire/plugin-api';
import { WebhookClient, EmbedBuilder } from 'discord.js';
import { z } from 'zod';
import { config } from '../config';

// Extend the Request type to include IP and body
interface MinecraftRequest extends Route.Request {
	ip: string;
	body: unknown;
}

// Define the expected payload schema
const BroadcastPayloadSchema = z.object({
	eventType: z.literal('TPS_DROP_WARNING'),
	currentTPS: z.number(),
	threshold: z.number()
});

export class UserRoute extends Route {
	public override async run(request: MinecraftRequest, response: Route.Response) {
		this.container.logger.info("TPS drop warning received");
		try {
			// Validate payload
			const payload = BroadcastPayloadSchema.parse(await request.readBody());
			this.container.logger.info(`Processing TPS drop warning: ${payload.currentTPS} TPS (threshold: ${payload.threshold})`);

			// Get webhook URL from config
			const webhookUrl = config.discord.webhook.url;
			if (!webhookUrl) {
				return response.status(500).json({ error: 'Discord webhook not configured' });
			}

			// Create webhook client
			const webhookClient = new WebhookClient({ url: webhookUrl });

			// Create an embed for the warning message
			const embed = new EmbedBuilder()
				.setTitle(`${config.discord.embed.icons.warning} Server Performance Warning`)
				.setDescription(`The server's TPS has dropped below the threshold!`)
				.addFields(
					{ name: 'Current TPS', value: `${payload.currentTPS.toFixed(1)}`, inline: true },
					{ name: 'Threshold', value: `${payload.threshold.toFixed(1)}`, inline: true }
				)
				.setColor(config.discord.embed.colors.warning)
				.setTimestamp();

			// Send message to Discord
			await webhookClient.send({
				embeds: [embed],
				username: config.discord.webhook.username,
				avatarURL: config.discord.webhook.avatarUrl
			});

			this.container.logger.info('TPS drop warning relayed to Discord');
			return response.status(200).json({ success: true });
		} catch (error: unknown) {
			if (error instanceof z.ZodError) {
				this.container.logger.error('Invalid payload format:', error.errors.map(e => e.message).join(', '));
				return response.status(400).json({ error: 'Invalid payload format', details: error.errors.map(e => e.message).join(', ') });
			}
			this.container.logger.error('Error processing TPS drop warning:', error);
			return response.status(500).json({ error: 'Internal server error' });
		}
	}
}
