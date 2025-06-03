// Unless explicitly defined, set NODE_ENV as development:
process.env.NODE_ENV ??= 'development';

import { ApplicationCommandRegistries, RegisterBehavior } from '@sapphire/framework';
import '@sapphire/plugin-api/register';
import '@sapphire/plugin-editable-commands/register';
import '@sapphire/plugin-logger/register';
import '@sapphire/plugin-subcommands/register';
import { setup, type ArrayString } from '@skyra/env-utilities';
import * as colorette from 'colorette';
import { inspect } from 'util';
import {  srcDir } from './constants';
import path from 'path';

// Set default behavior to bulk overwrite
ApplicationCommandRegistries.setDefaultBehaviorWhenNotIdentical(RegisterBehavior.BulkOverwrite);

// Set default inspection depth
inspect.defaultOptions.depth = 1;

// Enable colorette
colorette.createColors({ useColor: true });

// Load environment variables from root .env
setup({ path: path.join(srcDir, '.env') });

declare module '@skyra/env-utilities' {
	interface Env {
		OWNERS: ArrayString;
		MCAPI_URL: string;
		SUBSCRIBED_CHANNEL_ID: string;
		MAIN_GUILD_ID: string;
		DISCORD_WEBHOOK_URL: string;
		MONGO_URI: string;
	}
} 