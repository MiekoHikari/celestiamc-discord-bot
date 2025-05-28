export interface ServerStatusBase {
	maintenance: {
		enabled: boolean;
		startCron: string;
		endCron: string;
	};
	uniquePlayers: number;
	offlinePlayers: number;
}

export interface ServerStatusOnline extends ServerStatusBase {
	online: true;
	players: string[];
	maxPlayers: number;
}

export interface ServerStatusOffline extends ServerStatusBase {
	online: false;
	players: [];
	maxPlayers: 0;
}

export type ServerStatus = ServerStatusOnline | ServerStatusOffline;

export interface LastStatusMessage {
	id: string | null;
	messageCount: number;
	lastStatus: ServerStatus | null;
	isUpdating: boolean;
} 