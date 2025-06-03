import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { MessageFlags } from 'discord.js';
import { ExistingPlayer, findPlayerByDiscordId, linkPlayerDiscord } from '../lib/database';

@ApplyOptions<Command.Options>({
	description: 'Link your minecraft account to your discord account'
})
export class UserCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.addStringOption((option) => 
					option
						.setName('code')
						.setDescription('The verification code you received in the minecraft server')
						.setRequired(true)
						.setMaxLength(6)
						.setMinLength(6)
				)
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const code = interaction.options.getString('code', true);
		const discordId = interaction.user.id;
		
		console.log(`Link command initiated by Discord user ${discordId} with code: ${code}`);
		
		try {
			// Check if user is already linked
			const existingPlayer = await findPlayerByDiscordId(discordId);
			if (existingPlayer) {
				console.log(`User ${discordId} attempted to link but is already linked to player:`, {
					playerName: existingPlayer.playerName,
					uuid: existingPlayer.uuid
				});
				return interaction.reply({ 
					content: `❌ Your Discord account is already linked to Minecraft account: ${existingPlayer.playerName}`, 
					flags: [MessageFlags.Ephemeral] 
				});
			}

			// Find player by verification code
			console.log(`Searching for player with verification code: ${code}`);
			const player = await ExistingPlayer.findOne({ verificationCode: code });
			
			if (!player) {
				return interaction.reply({ 
					content: '❌ Invalid verification code. Please make sure you entered the code correctly.', 
					flags: [MessageFlags.Ephemeral] 
				});
			}

			// Link the player's Discord account
			console.log(`Attempting to link Discord ID ${discordId} to player:`, {
				playerName: player.playerName,
				uuid: player.uuid,
			});

			const linkedPlayer = await linkPlayerDiscord(player.uuid, discordId);
			
			if (!linkedPlayer) {
				console.error(`Failed to link player - linkPlayerDiscord returned null for UUID: ${player.uuid}`);
				return interaction.reply({ 
					content: '❌ An error occurred while linking your account. Please try again later.', 
					flags: [MessageFlags.Ephemeral] 
				});
			}

			console.log(`Successfully linked Discord user ${discordId} to Minecraft account ${player.playerName}`);
			return interaction.reply({ 
				content: `✅ Your Minecraft account (${player.playerName}) has been successfully linked to your Discord account!`, 
				flags: [MessageFlags.Ephemeral] 
			});
		} catch (error) {
			console.error('Error during link command execution:', error);
			if (error instanceof Error) {
				console.error('Error details:', {
					name: error.name,
					message: error.message,
					stack: error.stack
				});
			}
			return interaction.reply({ 
				content: '❌ An unexpected error occurred while trying to link your account. Please try again later.', 
				flags: [MessageFlags.Ephemeral] 
			});
		}
	}
}
