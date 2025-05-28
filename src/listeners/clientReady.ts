import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import { Client } from 'discord.js';
import { MessageStickyListener } from './messageSticky';
import { ServerStatus, ServerStatusOnline, ServerStatusOffline, LastStatusMessage } from '../types/serverStatus';

interface StatusResponse {
	Online: boolean;
	players: string[];
	maxPlayers: number;
	uniquePlayers: number;
	offlinePlayers: number;
}

interface MaintenanceResponse {
	enabled: boolean;
	doBackup: boolean;
	message: string;
	motd: string;
	maintenanceIcon: string;
	schedule: {
		startTime: string;
		endTime: string;
		disableOnRestart: boolean;
		maintanceNotifyMessage: string;
	};
	kickOnlinePlayers: boolean;
	configVersion: number;
	allowedUsers: string[];
}

@ApplyOptions<Listener.Options>({
	event: Events.ClientReady,
	once: true
})
export class UserEvent extends Listener {
	public override async run(client: Client) {
		// Initialize message tracking
		this.container.lastStatusMessage = {
			id: null,
			messageCount: 0,
			lastStatus: null,
			isUpdating: false
		};

		this.container.serverStatus = await this.getServerStatus();

		// Minecraft server tracking
		setInterval(async () => {
			const newStatus = await this.getServerStatus();
			const oldStatus = this.container.serverStatus;
			this.container.serverStatus = newStatus;

			// Check if status has changed
			if (this.shouldUpdateStatus(newStatus, oldStatus)) {
				// Get the messageSticky listener and call updateStatusMessage
				const messageStickyListener = this.container.stores.get('listeners').get('messageSticky') as MessageStickyListener;
				if (messageStickyListener) {
					await messageStickyListener.updateStatusMessage(client);
				}
			}
		}, 30000);

		// Check if we joined the main server
		const mainServer = await client.guilds.fetch(process.env.MAIN_GUILD_ID);
		if (!mainServer) throw new Error("Main server not found");

		const subscribedChannel = await mainServer.channels.fetch(process.env.SUBSCRIBED_CHANNEL_ID);
		if (!subscribedChannel) throw new Error("Subscribed channel not found");
		if (!subscribedChannel.isTextBased()) throw new Error("Subscribed channel is not a text based channel");

		// Send initial status message
		const messageStickyListener = this.container.stores.get('listeners').get('messageSticky') as MessageStickyListener;
		if (messageStickyListener) {
			await messageStickyListener.updateStatusMessage(client);
		}
	}

	private shouldUpdateStatus(newStatus: ServerStatus, oldStatus: ServerStatus | null): boolean {
		// If no old status, we need to update
		if (!oldStatus) return true;

		// Check if any status values have changed
		return (
			newStatus.online !== oldStatus.online ||
			newStatus.maintenance.enabled !== oldStatus.maintenance.enabled ||
			newStatus.maintenance.startCron !== oldStatus.maintenance.startCron ||
			newStatus.maintenance.endCron !== oldStatus.maintenance.endCron ||
			(newStatus.online && oldStatus.online ? (
				newStatus.players.length !== oldStatus.players.length ||
				newStatus.maxPlayers !== oldStatus.maxPlayers
			) : newStatus.online !== oldStatus.online) ||
			newStatus.uniquePlayers !== oldStatus.uniquePlayers ||
			newStatus.offlinePlayers !== oldStatus.offlinePlayers
		);
	}

	private async getServerStatus(): Promise<ServerStatus> {
		try {
			// 1. fetch minecraft server status
			const serverStatus = await fetch(process.env.MCAPI_URL + "status")
			// 2. fetch minecraft maintenance status
			const maintenanceStatus = await fetch(process.env.MCAPI_URL + "maintenance")

			const serverStatusData = await serverStatus.json() as StatusResponse;
			const maintenanceStatusData = await maintenanceStatus.json() as MaintenanceResponse;

			if (serverStatus) {
				const status: ServerStatusOnline = {
					online: true,
					maintenance: {
						enabled: maintenanceStatusData.enabled,
						startCron: maintenanceStatusData.schedule.startTime,
						endCron: maintenanceStatusData.schedule.endTime
					},
					players: serverStatusData.players,
					maxPlayers: serverStatusData.maxPlayers,
					uniquePlayers: serverStatusData.uniquePlayers,
					offlinePlayers: serverStatusData.offlinePlayers
				};
				return status;
			}

			const offlineStatus: ServerStatusOffline = {
				online: false,
				maintenance: this.container.serverStatus?.maintenance ?? {
					enabled: false,
					startCron: "",
					endCron: "",
				},
				players: [],
				maxPlayers: 0,
				uniquePlayers: this.container.serverStatus?.uniquePlayers ?? 0,
				offlinePlayers: this.container.serverStatus?.offlinePlayers ?? 0
			};
			return offlineStatus;
		} catch (e) {
			const offlineStatus: ServerStatusOffline = {
				online: false,
				maintenance: this.container.serverStatus?.maintenance ?? {
					enabled: false,
					startCron: "",
					endCron: "",
				},
				players: [],
				maxPlayers: 0,
				uniquePlayers: this.container.serverStatus?.uniquePlayers ?? 0,
				offlinePlayers: this.container.serverStatus?.offlinePlayers ?? 0
			};
			return offlineStatus;
		}
	}
}

declare module '@sapphire/framework' {
	interface Container {
		serverStatus: ServerStatus;
		lastStatusMessage: LastStatusMessage;
	}
}