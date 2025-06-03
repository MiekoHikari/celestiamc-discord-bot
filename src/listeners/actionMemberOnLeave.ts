import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import { GuildMember } from 'discord.js';
import { ExistingPlayer } from '../lib/database';

@ApplyOptions<Listener.Options>({
	event: Events.GuildMemberRemove,
	name: 'actionMemberOnLeave'
})
export class UserEvent extends Listener {
	public override async run(member: GuildMember) {
		
        try {
            console.log(`Member left: ${member.user.tag} (${member.id})`);
            
            // Find the player in the database
            const player = await ExistingPlayer.findOne({ discordId: member.id });
            
            if (player) {
                console.log(`Found linked player for leaving member:`, {
                    playerName: player.playerName,
                    uuid: player.uuid,
                    verified: player.verified
                });

                // Only remove if they were verified
                if (player.verified) {
                    // Remove the player's record
                    await ExistingPlayer.deleteOne({ _id: player._id });
                    console.log(`Removed verified player record for ${member.user.tag}`);
                } else {
                    console.log(`Player ${player.playerName} was not verified, keeping record`);
                }
            } else {
                console.log(`No linked player found for leaving member ${member.user.tag}`);
            }
        } catch (error) {
            console.error('Error handling member leave:', error);
            if (error instanceof Error) {
                console.error('Error details:', {
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                });
            }
        }
	}
}
