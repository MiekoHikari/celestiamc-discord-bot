import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import { Message } from 'discord.js';

@ApplyOptions<Listener.Options>({
	event: Events.MessageCreate
})
export class UserEvent extends Listener {
	public override async run(message: Message) {
		if (message.author.bot) return;
		if (message.channelId !== process.env.SUBSCRIBED_CHANNEL_ID) return;

		const postURL = process.env.MCAPI_URL + "chat";
		
		try {
			const response = await fetch(postURL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					discordUserName: message.member?.displayName || message.author.username,
					message: message.content
				})
			});

			if (!response.ok) {
				console.error(`Failed to relay message to Minecraft: ${response.statusText}`);
			}
		} catch (error) {
			console.error('Error relaying message to Minecraft:', error);
		}
	}
}
