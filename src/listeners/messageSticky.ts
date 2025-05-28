import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import { Client, EmbedBuilder } from 'discord.js';

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
		const mainServer = await client.guilds.fetch(process.env.MAIN_GUILD_ID);
		if (!mainServer) throw new Error("Main server not found");

		const subscribedChannel = mainServer.channels.cache.get(process.env.SUBSCRIBED_CHANNEL_ID);
		if (!subscribedChannel?.isTextBased()) throw new Error("Subscribed channel is not a text based channel");

		const status = this.container.serverStatus;
		const embed = new EmbedBuilder()
			.setThumbnail("https://cdn3.emoji.gg/emojis/9214-allay.gif")
			.setDescription(`# <a:minecraft:1377277509338398782> CelestiaMC
				\n${status.online ? 
					`-# Play now on \`celestia.vtuberacademy.live\`` : 
					`<:offline:1377277505031110737> Server is offline`}
				\n<a:onlinelive:1377277513621045278> Online: \` ${status.online ? status.players.length : 0} \` <:offline:1377277505031110737> Offline: \` ${status.offlinePlayers} \` <:lava:1377277551600205934> Total Players: \` ${status.uniquePlayers} \`
				${status.online && status.players.length > 0 ? `\n-# Players on the server: ${status.players.join(", ")}` : ""}`)
			.addFields(
				status.maintenance.enabled ?
					status.maintenance.endCron !== "" ?
						[{
							name: '📌 Maintenance End:',
							value: ` <t:${Math.floor(new Date(status.maintenance.endCron).getTime() / 1000)}:R>`,
							inline: true
						}]
						: []
					: status.maintenance.startCron !== "" ?
						[{
							name: '📌 Next Scheduled Maintenance',
							value: ` <t:${Math.floor(new Date(status.maintenance.startCron).getTime() / 1000)}:R>`,
							inline: true
						}]
						: []
			)
			.setColor(status.maintenance.enabled ? 'Orange' : '#2f3136');

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
