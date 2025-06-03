import mongoose from 'mongoose';

// Define the existing Player document interface
export interface IExistingPlayer {
    playerName: string;
    uuid: string;
    verificationCode: string;
    verified: boolean;
    createdAt: number;
    discordId?: string; // Optional since it will be added during linking
}

// Define the schema for existing players
const existingPlayerSchema = new mongoose.Schema<IExistingPlayer>({
    playerName: { type: String, required: true },
    uuid: { type: String, required: true, unique: true },
    verificationCode: { type: String, required: true },
    verified: { type: Boolean, default: false },
    createdAt: { type: Number, required: true },
    discordId: { type: String, unique: true, sparse: true }
});

// Create the model for existing players
export const ExistingPlayer = mongoose.model<IExistingPlayer>('players', existingPlayerSchema);

// Database connection function
export async function connectToDatabase() {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            dbName: 'CelestiaMC'
        });
        console.log('Successfully connected to MongoDB.');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1);
    }
}

// Helper function to find a player by verification code
export async function findPlayerByVerificationCode(code: string) {
    try {
        // First check if the code exists at all
        const player = await ExistingPlayer.findOne({ verificationCode: code });
        
        if (!player) {
            console.log(`No player found with verification code: ${code}`);
            return null;
        }

        // Check if the player is verified
        if (!player.verified) {
            console.log(`Verification code ${code} exists but player is not verified`);
            return null;
        }

        // Check if the player is already linked (has a non-null discordId)
        if (player.discordId) {
            console.log(`Verification code ${code} exists but is already linked to Discord ID: ${player.discordId}`);
            return null;
        }

        console.log(`Found valid player with verification code ${code}:`, {
            playerName: player.playerName,
            uuid: player.uuid,
            verified: player.verified,
            discordId: player.discordId
        });
        return player;
    } catch (error) {
        console.error('Error in findPlayerByVerificationCode:', error);
        throw error;
    }
}

// Helper function to find a player by Discord ID
export async function findPlayerByDiscordId(discordId: string) {
    try {
        const player = await ExistingPlayer.findOne({ discordId });
        if (player) {
            console.log(`Found existing linked player for Discord ID ${discordId}:`, {
                playerName: player.playerName,
                uuid: player.uuid
            });
        } else {
            console.log(`No player found linked to Discord ID: ${discordId}`);
        }
        return player;
    } catch (error) {
        console.error('Error in findPlayerByDiscordId:', error);
        throw error;
    }
}

// Helper function to link a player's Discord account
export async function linkPlayerDiscord(uuid: string, discordId: string) {
    try {
        const result = await ExistingPlayer.findOneAndUpdate(
            { uuid },
            { $set: { discordId, verified: true } },
            { new: true }
        );
        
        if (!result) {
            console.error(`Failed to link Discord ID ${discordId} to UUID ${uuid} - Player not found`);
            throw new Error('Player not found during linking');
        }
        
        console.log(`Successfully linked Discord ID ${discordId} to player:`, {
            playerName: result.playerName,
            uuid: result.uuid
        });
        return result;
    } catch (error) {
        console.error('Error in linkPlayerDiscord:', error);
        throw error;
    }
} 