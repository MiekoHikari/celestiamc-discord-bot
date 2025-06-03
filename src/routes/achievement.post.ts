import { Route } from '@sapphire/plugin-api';
import { WebhookClient } from 'discord.js';
import { z } from 'zod';
import { config } from '../config';
import { ExistingPlayer } from '../lib/database';
import { memberProfileCache } from '../lib/cache';

// Extend the Request type to include IP and body
interface MinecraftRequest extends Route.Request {
	ip: string;
	body: unknown;
}

// Define the expected payload schema
const AchievementPayloadSchema = z.object({
	payload: z.object({
		eventType: z.literal('ACHIEVEMENT_UNLOCKED'),
		playerName: z.string(),
		advancementId: z.string(),
		advancementTitle: z.string(),
		uuid: z.string()
	})
});

export class UserRoute extends Route {
	public override async run(request: MinecraftRequest, response: Route.Response) {
		this.container.logger.info("Achievement unlocked event received");
		try {
			// Validate payload
			const { payload } = AchievementPayloadSchema.parse(await request.readBody());
			this.container.logger.info(`Processing achievement for ${payload.playerName}`);

			// Get webhook URL from config
			const webhookUrl = config.discord.webhook.url;
			if (!webhookUrl) {
				return response.status(500).json({ error: 'Discord webhook not configured' });
			}

			// Create webhook client
			const webhookClient = new WebhookClient({ url: webhookUrl });

			// Get the main guild
			const mainGuild = await this.container.client.guilds.fetch(config.discord.guild.mainId);
			if (!mainGuild) {
				return response.status(500).json({ error: 'Main guild not found' });
			}

			// Find player profile first
			const profile = await ExistingPlayer.findOne({ uuid: payload.uuid });
			if (!profile?.discordId) {
				return response.status(404).json({ error: 'Player not found' });
			}

			// Try to get member from cache first
			let member = memberProfileCache.get(profile.discordId);
			
			// If not in cache, fetch from Discord and cache it
			if (!member) {
				member = await mainGuild.members.fetch({ user: profile.discordId, force: true }).catch(() => null);
				if (member) {
					memberProfileCache.set(profile.discordId, member);
				}
			}

			// Use server profile if available, otherwise fall back to user profile
			const displayName = member?.displayName || member?.user.displayName || payload.playerName;
			const avatarURL = member?.displayAvatarURL() || member?.user.displayAvatarURL() || `https://mc-heads.net/avatar/${payload.uuid}`;


			// Send message to Discord
			await webhookClient.send({
				content: `${config.discord.embed.icons.achievement} ${displayName} has earned the achievement **${payload.advancementTitle}**!`,
				username: displayName,
				avatarURL: avatarURL
			});

			this.container.logger.info(`Achievement announcement for ${payload.playerName} relayed to Discord`);
			return response.status(200).json({ success: true });
		} catch (error: unknown) {
			if (error instanceof z.ZodError) {
				this.container.logger.error('Invalid payload format:', error.errors.map(e => e.message).join(', '));
				return response.status(400).json({ error: 'Invalid payload format', details: error.errors.map(e => e.message).join(', ') });
			}
			this.container.logger.error('Error processing achievement:', error);
			return response.status(500).json({ error: 'Internal server error' });
		}
	}
}
