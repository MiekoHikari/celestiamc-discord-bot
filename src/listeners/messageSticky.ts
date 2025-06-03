import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import { Client, EmbedBuilder } from 'discord.js';
import { config } from '../config';

@ApplyOptions<Listener.Options>({
	event: Events.MessageCreate,
	once: false
})
export class MessageStickyListener extends Listener {
	public override async run(message: any) {
		// Only process messages in the subscribed channel
		if (message.channelId !== process.env.SUBSCRIBED_CHANNEL_ID) return;

		// If this is our status message, don't process it
		if (message.id === this.container.lastStatusMessage?.id) return;

		// If we're already updating, don't process new messages
		if (this.container.lastStatusMessage?.isUpdating) return;

		// Increment message count for our status message if it exists
		if (this.container.lastStatusMessage?.id) {
			this.container.lastStatusMessage.messageCount++;
			
			// If message count reached 10, update the status message
			if (this.container.lastStatusMessage.messageCount >= 10) {
				this.container.lastStatusMessage.isUpdating = true;
				try {
					await this.updateStatusMessage(message.client);
				} finally {
					this.container.lastStatusMessage.isUpdating = false;
				}
			}
		}
	}

	public async updateStatusMessage(client: Client) {
		const mainServer = await client.guilds.fetch(config.discord.guild.mainId);
		if (!mainServer) throw new Error("Main server not found");

		const subscribedChannel = mainServer.channels.cache.get(config.discord.guild.subscribedChannelId);
		if (!subscribedChannel?.isTextBased()) throw new Error("Subscribed channel is not a text based channel");

		const status = this.container.serverStatus;
		const embed = new EmbedBuilder()
			.setThumbnail(config.discord.embed.thumbnails.status)
			.setDescription(`# ${config.discord.embed.icons.server.online} CelestiaMC
				\n${status.online ? 
					`-# Play now on \`${config.server.minecraft.address}\`` : 
					`${config.discord.embed.icons.server.offline} Server is offline`}
				\n${config.discord.embed.icons.server.playerCount} Online: \` ${status.online ? status.players.length : 0} \` ${config.discord.embed.icons.server.offline} Offline: \` ${status.offlinePlayers} \` ${config.discord.embed.icons.server.lava} Total Players: \` ${status.uniquePlayers} \`
				${status.online && status.players.length > 0 ? `\n-# Players on the server: ${status.players.join(", ")}` : ""}`)
			.addFields(
				status.maintenance.enabled ?
					status.maintenance.endCron !== "" ?
						[{
							name: `${config.discord.embed.icons.maintenance} Maintenance End:`,
							value: `${status.maintenance.endCron}`,
							inline: true
						}]
						: []
					: status.maintenance.startCron !== "" ?
						[{
							name: `${config.discord.embed.icons.maintenance} Next Scheduled Maintenance`,
							value: `${status.maintenance.startCron}`,
							inline: true
						}]
						: []
			)
			.setColor(status.maintenance.enabled ? config.discord.embed.colors.status.maintenance : config.discord.embed.colors.status.online);

		// If we have an existing message and it hasn't scrolled too far up
		if (this.container.lastStatusMessage.id && this.container.lastStatusMessage.messageCount < 10) {
			try {
				// Try to edit the existing message
				const oldMessage = await subscribedChannel.messages.fetch(this.container.lastStatusMessage.id);
				await oldMessage.edit({ embeds: [embed] });
				
				// Update tracking
				this.container.lastStatusMessage = {
					id: oldMessage.id,
					messageCount: this.container.lastStatusMessage.messageCount,
					lastStatus: { ...status },
					isUpdating: false
				};
				return;
			} catch (error) {
				// If message can't be found or edited, we'll fall through to creating a new one
				console.log('Could not edit existing message, creating new one');
			}
		}

		// Delete old message if it exists
		if (this.container.lastStatusMessage.id) {
			try {
				const oldMessage = await subscribedChannel.messages.fetch(this.container.lastStatusMessage.id);
				await oldMessage.delete();
			} catch (error) {
				// Message might have been deleted already, ignore error
			}
		}

		// Send new message
		const message = await subscribedChannel.send({
			embeds: [embed],
			flags: ['SuppressNotifications']
		});

		// Update tracking with new message
		this.container.lastStatusMessage = {
			id: message.id,
			messageCount: 0,
			lastStatus: { ...status },
			isUpdating: false
		};
	}
}
