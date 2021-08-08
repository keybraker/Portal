/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
// import { VoiceConnection } from "discord.js";

export interface MongoPromise {
	ok?: number | undefined;
	n?: number | undefined;
	nModified?: number | undefined;
	deletedCount?: number | undefined;
}

export interface ReturnPormise {
	result: boolean;
	value: string;
}

// export interface ReturnPormiseVoice {
// 	result: boolean;
// 	value: string;
// 	voice_connection: VoiceConnection | undefined;
// }

export class Field {
	emote: string | null | undefined | boolean;
	role: string | number | null | undefined | boolean;
	inline: boolean;

	constructor(
		emote: string | null | undefined | boolean,
		role: string | number | null | undefined | boolean,
		inline: boolean
	) {
		this.emote = emote;
		this.role = role;
		this.inline = inline;
	}
}

export interface Rank {
	level: number,
	role: string
}

export interface Language {
	gr: any;
	en: any;
	de: any;
}

export interface LocalisationOption {
	name: string;
	lang: Language;
}

export interface CommandOptions {
	name: string;
	range: string;
	time: number;
	auth: boolean;
	premium: boolean;
	reply: boolean;
	delete: {
		source: boolean,
		reply: boolean
	}
}

export interface ActiveCooldown {
	member: string;
	guild: string;
	command: string;
	timestamp: number;
}

export interface ActiveCooldowns {
	guild: ActiveCooldown[];
	member: ActiveCooldown[];
}

export interface SpamCache {
	member_id: string;
	last_message: string;
	timestamp: Date | null;
	spam_fouls: number;
	dupl_fouls: number;
}

export interface TimeElapsed {
	timeout_min: number;
	timeout_sec: number;
	remaining_hrs: number;
	remaining_min: number;
	remaining_sec: number;
}

export interface TimeRemaining {
	timeout_min: number;
	timeout_sec: number;
	remaining_min: number;
	remaining_sec: number;
}

export interface InterfaceBlueprint {
	name: string;
	hover: string;
	get: any;
	set: any;
	auth: number;
}
