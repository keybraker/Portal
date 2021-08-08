/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
	Channel, Client, Guild, GuildMember, Intents, Message, MessageReaction,
	PartialDMChannel, PartialGuildMember, PartialMessage, VoiceState, User, PartialUser
} from "discord.js";
import mongoose from 'mongoose';
import { transports } from "winston";
import command_config_json from './config.command.json';
import event_config_json from './config.event.json';
import config from './config.json';
import { ProfanityLevelEnum } from "./data/enums/ProfanityLevel.enum";
import { included_in_ignore_list, is_url_only_channel } from './libraries/guild.library';
import { is_authorised, is_ignored, logger, message_reply, pad, time_elapsed, update_music_message } from './libraries/help.library';
import { isProfane, message_spam_check } from "./libraries/mod.library";
import { fetch_guild_predata, fetch_guild_rest, insert_member, remove_ignore, remove_url, set_music_data } from "./libraries/mongo.library";
import { start } from './libraries/music.library';
import { add_points_message } from './libraries/user.library';
import { GuildPrtl, MusicData } from './types/classes/GuildPrtl.class';
import { ActiveCooldowns, CommandOptions, ReturnPormise, SpamCache } from "./types/classes/TypesPrtl.interface";
import { getVoiceConnection } from "@discordjs/voice";

if (config.debug) {
	logger.add(new transports.Console());
}

if (config.log) {
	logger.add(new transports.File({ filename: '/logs/portal-error.log.json', level: 'error' }));
	logger.add(new transports.File({ filename: '/logs/portal-info.log.json', level: 'info' }));
	logger.add(new transports.File({ filename: '/logs/portal-all.log.json' }));
}

const active_cooldowns: ActiveCooldowns = {
	guild: [],
	member: []
};

const spam_cache: SpamCache[] = [];

// Connect to mongoose database
mongoose.connect(config.mongo_url, {
	useNewUrlParser: true,
	useUnifiedTopology: true,
	useCreateIndex: true
})
	.then(() => {
		logger.info(`connected to the database`);
	}).catch(e => {
		logger.error(new Error(`unable to connect to database | ${e}`));
		process.exit(1);
	});

const client = new Client(
	{
		partials: [
			'USER',
			'CHANNEL',
			'GUILD_MEMBER',
			'MESSAGE',
			'REACTION'
		],

		intents: // Intents.ALL
			[
				Intents.FLAGS.GUILDS,
				Intents.FLAGS.GUILD_MEMBERS,
				Intents.FLAGS.GUILD_VOICE_STATES,
				Intents.FLAGS.GUILD_PRESENCES,
				Intents.FLAGS.GUILD_MESSAGES,
				Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
				Intents.FLAGS.DIRECT_MESSAGES,
				Intents.FLAGS.DIRECT_MESSAGE_REACTIONS
			]
	}
);

// This event triggers when the bot joins a guild.
client.on('channelDelete', (channel: Channel | PartialDMChannel) => {
	event_loader('channelDelete', {
		'channel': channel
	});
});

// This event triggers when the bot joins a guild
client.on('guildCreate', (guild: Guild) =>
	event_loader('guildCreate', {
		'client': client,
		'guild': guild
	})
);

// this event triggers when the bot is removed from a guild
client.on('guildDelete', (guild: Guild) =>
	event_loader('guildDelete', {
		'guild': guild
	})
);

// This event triggers when a new member joins a guild.
client.on('guildMemberAdd', (member: GuildMember | PartialGuildMember) => {
	event_loader('guildMemberAdd', {
		'member': member
	})
});

// This event triggers when a new member leaves a guild.
client.on('guildMemberRemove', (member: GuildMember | PartialGuildMember) => {
	event_loader('guildMemberRemove', {
		'member': member
	})
});

// This event triggers when a message is deleted
client.on('messageDelete', (message: Message | PartialMessage) =>
	event_loader('messageDelete', {
		'client': client,
		'message': message
	})
);

// This event triggers when a member reacts to a message
client.on('messageReactionAdd', (messageReaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) =>
	event_loader('messageReactionAdd', {
		'client': client,
		'messageReaction': messageReaction,
		'user': user
	})
);

// This event will run if the bot starts, and logs in, successfully.
client.on('ready', () =>
	event_loader('ready', {
		'client': client
	})
);

// This event triggers when a member joins or leaves a voice channel
client.on('voiceStateUpdate', (oldState: VoiceState, newState: VoiceState) => {
	const new_channel = newState.channel; // join channel
	const old_channel = oldState.channel; // left channel

	// mute / unmute  defean user are ignored
	if ((old_channel && new_channel) && (new_channel.id === old_channel.id)) {
		return;
	}

	event_loader('voiceStateUpdate', {
		'client': client,
		'oldState': oldState,
		'newState': newState
	});
});

// runs on every single message received, from any channel or DM
client.on('messageCreate', async (message: Message) => {
	if (!message || !message.member || !message.guild) return;
	if (message.channel.type === 'DM' || message.author.bot) return;

	fetch_guild_predata(message.guild.id, message.author.id)
		.then(guild_object => {
			if (!guild_object) {
				logger.error(new Error(`guild does not exist in Portal`));
				return false;
			}

			if (guild_object.member_list.length === 0 && message.guild) {
				insert_member(message.guild.id, message.author.id)
					.then(() => {
						if (message.guild) {
							logger.info(`late-insert ${message.author.id} to ${message.guild.name} [${message.guild.id}]`);
						}
					})
					.catch(e => {
						logger.error(new Error(`failed to late-insert member / ${e}`));
					});

				return true;
			}

			if (portal_preprocessor(message, guild_object)) {
				// preprocessor has handled the message
				message_spam_check(message, guild_object, spam_cache);

				return true;
			} else {
				message_spam_check(message, guild_object, spam_cache);

				// Ignore any message that does not start with prefix
				if (message.content.indexOf(guild_object.prefix) !== 0) {
					if (message.content === 'prefix') {
						message_reply(true, message, `portal's prefix is \`${guild_object.prefix}\``)
							.catch((e: any) => {
								logger.error(new Error(`failed to send message / ${e}`));
							});

						if (message.deletable) {
							message
								.delete()
								.catch((e: any) => {
									logger.error(new Error(`failed to delete message / ${e}`));
								});
						}
					}

					return false;
				}

				const command = command_decypher(message, guild_object);

				if (!command.command_options) {
					return false;
				}

				if (command.command_options.auth && message.member) {
					if (!is_authorised(message.member)) {
						message_reply(false, message, 'you are not authorised to use this command', true, true)
							.catch((e: any) => {
								logger.error(new Error(`failed to send message / ${e}`));
							});


						return false;
					}
				}

				if (!message.guild) {
					logger.error(new Error('could not fetch guild of message'));

					return false;
				}

				fetch_guild_rest(message.guild.id)
					.then(guild_object_rest => {
						if (!guild_object_rest) {
							logger.error(new Error('server is not in database'));
							message_reply(false, message, 'server is not in database')
								.catch((e: any) => {
									logger.error(new Error(`failed to send message / ${e}`));
								});

							return false;
						}

						guild_object.member_list = guild_object_rest.member_list;
						guild_object.poll_list = guild_object_rest.poll_list;
						guild_object.ranks = guild_object_rest.ranks;
						guild_object.music_queue = guild_object_rest.music_queue;
						guild_object.announcement = guild_object_rest.announcement;
						guild_object.locale = guild_object_rest.locale;
						guild_object.announce = guild_object_rest.announce;
						guild_object.premium = guild_object_rest.premium;

						if (!command.command_options) {
							return false;
						}

						command_loader(
							message,
							command.cmd,
							command.args,
							command.type,
							command.command_options,
							command.path_to_command,
							guild_object
						);
					})
					.catch(e => {
						logger.error(new Error(`error while fetch guild restdata / ${e}`));
						return false;
					});
			}
		})
		.catch(e => {
			logger.error(new Error(`error while fetch guild predata / ${e}`));
			return false;
		});
});

function command_loader(
	message: Message, command: string, args: string[], type: string, command_options: CommandOptions,
	path_to_command: string, guild_object: GuildPrtl
): boolean {
	if (config.debug === true) {
		logger.info(`[command-debug] ${command}`);
	}

	if (type === 'none' && command_options.time === 0) {
		require(`./commands/${path_to_command}/${command}.js`)(message, args, guild_object, client)
			.then((response: ReturnPormise) => {
				if (response) {
					message_reply(response.result, message, response.value,
						command_options.delete.source, command_options.delete.reply)
						.catch((e: any) => {
							logger.error(new Error(`failed to send message / ${e}`));
						});
				} else {
					logger.error(new Error(`did not get response from command: ${command}`));
				}
			})
			.catch((e: any) => {
				logger.error(new Error(`error in ${command} / ${e}`));
			});

		return true;
	}

	const type_string = type === 'guild'
		? 'guild'
		: 'member';

	const active = active_cooldowns[type_string]
		.find(active_current => {
			if (active_current.command === command) {
				if (type === 'member' && active_current.member === message.author.id) {
					if (message.guild && active_current.guild === message.guild.id) {
						return true;
					}
				}

				if (type === 'guild') {
					if (message.guild && active_current.guild === message.guild.id) {
						return true;
					}
				}
			}

			return false;
		});

	if (active) {
		const time = time_elapsed(active.timestamp, command_options.time);

		const type_for_msg = (type !== 'member')
			? `, as it was used again in* **${message.guild?.name}**`
			: `.*`;

		const must_wait_msg = `you need to wait **${pad(time.remaining_min)}:` +
			`${pad(time.remaining_sec)}/${pad(time.timeout_min)}:` +
			`${pad(time.timeout_sec)}** *to use* **${command}** *again${type_for_msg}`;

		message_reply(false, message, must_wait_msg, true, true)
			.catch((e: any) => {
				logger.error(new Error(`failed to reply to message / ${e}`));
			});

		return false;
	}

	require(`./commands/${path_to_command}/${command}.js`)(message, args, guild_object, client)
		.then((response: ReturnPormise) => {
			if (response) {
				if (response.result) {
					if (message.guild) {
						active_cooldowns[type_string]
							.push({
								member: message.author.id,
								guild: message.guild.id,
								command: command,
								timestamp: Date.now()
							});

						if (command_options) {
							setTimeout(() => {
								active_cooldowns[type_string] = active_cooldowns[type_string]
									.filter(active => active.command !== command);
							}, command_options.time * 60 * 1000);
						}
					}
				}

				message_reply(response.result, message, response.value,
					command_options.delete.source, command_options.delete.reply)
					.catch(e => {
						logger.error(new Error(`in ${command} got error ${e}`));
					});
			} else {
				logger.error(new Error(`did not get response from command: ${command}`));
			}
		})
		.catch((e: any) => {
			logger.error(new Error(`in ${command} got error ${e}`));
		});

	return false;
}

function event_loader(event: string, args: any): void {
	require(`./events/${event}.event.js`)(args)
		.then((response: string) => {
			if (response) {
				if ((event_config_json.find(e => e.name === event))) {
					logger.info(`[event-accepted] ${event} | ${response}`);
				} else if (config.debug) {
					logger.info(`[event-accepted-debug] ${event} | ${response}`);
				}
			}
		})
		.catch((e: string) => {
			logger.error(`[event-rejected] ${event} | ${e}`);
		});
}

/*
* Returns: true/false if processing must continue
*/
function portal_preprocessor(
	message: Message, guild_object: GuildPrtl
): boolean {
	if (!message.member) {
		logger.error(new Error('could not get member'));
		return true;
	}

	if (is_ignored(message.member)) {
		if (!handle_url_channels(message, guild_object)) {
			if (guild_object.music_data.channel_id === message.channel.id) {
				message.member
					.send('you can\'t play music when ignored')
					.catch((e: any) => {
						logger.error(new Error(`failed to send message / ${e}`));
					});
				if (message.deletable) {
					message
						.delete()
						.catch((e: any) => {
							logger.error(new Error(`failed to delete message / ${e}`));
						});
				}
			}
		}

		return true;
	} else {
		if (handle_url_channels(message, guild_object)) {
			return true;
		}
		else if (handle_ignored_channels(message, guild_object)) {
			handle_ranking_system(message, guild_object);

			return true;
		}
		else if (handle_music_channels(message, guild_object)) {
			handle_ranking_system(message, guild_object);

			return true;
		} else {
			handle_ranking_system(message, guild_object);

			// if (guild_object.profanity_level !== ProfanityLevelEnum.none) {
			// 	// profanity check
			// 	const profanities = isProfane(message.content, guild_object.profanity_level);
			// 	if (profanities.length > 0) {
			// 		message
			// 			.react('🚩')
			// 			.catch((e: any) => {
			// 				logger.error(new Error(`failed to react message / ${e}`));
			// 			});

			// 		message.author
			// 			.send(`try not to use profanities (${profanities.join(',')})`)
			// 			.catch(e => {
			// 				logger.error(new Error(e));
			// 			});
			// 	}
			// }

			return false;
		}
	}
}

function handle_ranking_system(
	message: Message, guild_object: GuildPrtl
): void {
	add_points_message(message, guild_object.member_list[0], guild_object.rank_speed)
		.then(level => {
			if (level) {
				message_reply(true, message, `you reached level ${level}!`)
					.catch((e: any) => {
						logger.error(new Error(`failed to send message / ${e}`));
					});
			}
		})
		.catch(e => {
			logger.error(new Error(e));
		});
}

function handle_url_channels(
	message: Message, guild_object: GuildPrtl
): boolean {
	if (is_url_only_channel(message.channel.id, guild_object)) {
		if (message.content === './url') {
			remove_url(guild_object.id, message.channel.id)
				.then(r => {
					message_reply(true, message, `removed url channel ${r ? 'successfully' : 'unsuccessfully'}`)
						.catch((e: any) => {
							logger.error(new Error(`failed to send message / ${e}`));
						});
				})
				.catch(e => {
					logger.error(new Error(`failed to remove url channel / ${e}`));
				});
		}
		else {
			message.author
				.send(`${message.channel} is a url-only channel`)
				.catch(e => {
					logger.error(new Error(`failed to remove url channel / ${e}`));
				});

			if (message.deletable) {
				message
					.delete()
					.catch((e: any) => {
						logger.error(new Error(`failed to delete message / ${e}`));
					});
			}
		}

		return true;
	}

	return false;
}

function handle_ignored_channels(
	message: Message, guild_object: GuildPrtl
): boolean {
	if (included_in_ignore_list(message.channel.id, guild_object)) {
		if (message.content === './ignore') {
			remove_ignore(guild_object.id, message.channel.id)
				.then(r => {
					message_reply(true, message, `removed from ignored channels ${r ? 'successfully' : 'unsuccessfully'}`)
						.catch((e: any) => {
							logger.error(new Error(`failed to send message / ${e}`));
						});
				})
				.catch(e => {
					logger.error(new Error(`failed to remove ignored channel / ${e}`));
				});
		}

		return true;
	}

	return false;
}

function handle_music_channels(
	message: Message, guild_object: GuildPrtl
): boolean {
	if (guild_object.music_data.channel_id === message.channel.id) {
		if (message.content === './music') {
			if (!message.guild) {
				logger.error(new Error(`failed to get guild from message`));
				return true;
			}

			const music_data = new MusicData('null', 'null', 'null', [], false);
			set_music_data(guild_object.id, music_data)
				.then(r => {
					message_reply(true, message, `removed from ignored channels ${r ? 'successfully' : 'unsuccessfully'}`)
						.catch((e: any) => {
							logger.error(new Error(`failed to send message / ${e}`));
						});
				})
				.catch(e => {
					logger.error(new Error(`failed to remove music channel / ${e}`));
				});
		} else {
			if (!message.guild || !message.member) {
				if (message.deletable) {
					message
						.delete()
						.catch((e: any) => {
							logger.error(new Error(`failed to delete message / ${e}`));
						});
				}

				return false;
			}

			const portal_voice_connection = getVoiceConnection(message.guild.id);

			if (portal_voice_connection) {
				if (!message.guild.me?.voice.channel?.members.has(message.member.id)) {
					if (message.guild) {
						const portal_voice_connection = getVoiceConnection(message.guild.id);

						const animate = true;
						// portal_voice_connection?.dispatcher
						// 	? !portal_voice_connection?.dispatcher.paused
						// 	: false;

						update_music_message(
							message.guild,
							guild_object,
							guild_object.music_queue.length > 0
								? guild_object.music_queue[0]
								: undefined,
							'you must be in the same channel as Portal',
							animate
						).catch(e => {
							logger.error(new Error(e));
						});
					}

					if (message.deletable) {
						message
							.delete()
							.catch((e: any) => {
								logger.error(new Error(`failed to send message / ${e}`));
							});
					}

					return false;
				}
			}

			start(
				portal_voice_connection, client, message.member.user, message,
				message.guild, guild_object, message.content
			)
				.then(r => {
					if (message.guild) {
						const portal_voice_connection = getVoiceConnection(message.guild.id);

						const animate = true;
						// portal_voice_connection?.dispatcher
						// 	? !portal_voice_connection?.dispatcher.paused
						// 	: false;

						update_music_message(
							message.guild,
							guild_object,
							guild_object.music_queue.length > 0
								? guild_object.music_queue[0]
								: undefined,
							r,
							animate
						).catch(e => {
							logger.error(new Error(e));
						});
					}

					if (message.deletable) {
						message
							.delete()
							.catch((e: any) => {
								logger.error(new Error(`failed to send message / ${e}`));
							});
					}
				})
				.catch(e => {
					if (message.guild) {
						update_music_message(
							message.guild,
							guild_object,
							guild_object.music_queue.length > 0
								? guild_object.music_queue[0]
								: undefined,
							`error while starting playback / ${e}`
						).catch(e => {
							logger.error(new Error(e));
						});
					}

					if (message.deletable) {
						message
							.delete()
							.catch((e: any) => {
								logger.error(new Error(`failed to send message / ${e}`));
							});
					}
				});
		}
		return true;
	}

	return false;
}

function command_decypher(
	message: Message, guild_object: GuildPrtl
): {
	args: string[],
	cmd: string,
	path_to_command: string,
	command_options: CommandOptions | undefined,
	type: string
} {
	// separate command name and arguments
	const args = message.content.slice(guild_object.prefix.length).trim().split(/ +/g);

	const cmd_only = args.shift();
	if (!cmd_only) {
		return {
			args: [],
			cmd: '',
			path_to_command: '',
			command_options: undefined,
			type: ''
		};
	}
	const cmd = cmd_only.toLowerCase();

	let path_to_command = '';
	let command_options: CommandOptions | undefined = undefined;
	let type = 'none';

	command_config_json.some(category => {
		command_options = category.commands.
			find(command => command.name === cmd);

		if (command_options) {
			type = command_options.range;
			path_to_command = category.path;

			return true;
		}

		return false;
	});

	return {
		args: args,
		cmd: cmd,
		path_to_command: path_to_command,
		command_options: command_options,
		type: type
	};
}

function connect_to_discord() {
	client.login(config.token)
		.then(r => {
			logger.info(`login to discord successful / ${r}`);
		})
		.catch(e => {
			logger.error(new Error(`could not login to discord / ${e}`));
			process.exit(1);
		});
}

connect_to_discord();