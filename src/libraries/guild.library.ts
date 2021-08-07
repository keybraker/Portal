/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
	CategoryChannel, Collection, CollectorFilter, Guild, GuildChannelCreateOptions,
	GuildMember, Message, MessageCollector, OverwriteResolvable, Role, TextChannel, VoiceChannel, VoiceState
} from "discord.js";
import moment from "moment";
import voca from 'voca';
import { PortalChannelTypes } from "../data/enums/PortalChannel.enum";
import { GuildPrtl } from '../types/classes/GuildPrtl.class';
import { PortalChannelPrtl } from '../types/classes/PortalChannelPrtl.class';
import { ReturnPormise } from "../types/classes/TypesPrtl.interface";
import { VoiceChannelPrtl } from '../types/classes/VoiceChannelPrtl.class';
import { attribute_prefix, get_attribute, is_attribute } from '../types/interfaces/Attribute.interface';
import { get_pipe, is_pipe, pipe_prefix } from '../types/interfaces/Pipe.interface';
import { get_variable, is_variable, variable_prefix } from '../types/interfaces/Variable.interface';
import { create_lyrics_message, create_music_message, get_json, logger, max_string } from './help.library';
import { insert_voice } from "./mongo.library";

function inline_operator(
	str: string
): any {
	switch (str) {
		case '==':
			return (a: string, b: string) => a == b;
		case '===':
			return (a: string, b: string) => a === b;
		case '!=':
			return (a: string, b: string) => a != b;
		case '!==':
			return (a: string, b: string) => a !== b;
		case '>':
			return (a: string, b: string) => a > b;
		case '<':
			return (a: string, b: string) => a < b;
		case '>=':
			return (a: string, b: string) => a >= b;
		case '<=':
			return (a: string, b: string) => a <= b;
	}
}

export function get_options(
	guild: Guild, topic: string, can_write: boolean
): GuildChannelCreateOptions {
	if (can_write) {
		return {
			topic: `by Portal, ${topic}`,
			type: 'text',
			nsfw: false
		};
	} else {
		return {
			permissionOverwrites: [{
				id: guild.id,
				deny: ['SEND_MESSAGES'],
			}],
			topic: `by Portal, ${topic}`,
			type: 'text',
			nsfw: false
		};
	}
}

//

export function included_in_portal_guilds(guild_id: string, guild_list: GuildPrtl[]): boolean {
	return guild_list ? guild_list.some(g => g.id === guild_id) : false;
}

export function included_in_portal_list(channel_id: string, portal_list: PortalChannelPrtl[]): boolean {
	return portal_list ? portal_list.some(p => p.id === channel_id) : false;
}

export function included_in_voice_list(channel_id: string, portal_list: PortalChannelPrtl[]): boolean {
	return portal_list ? portal_list.some(p => p.voice_list.some(v => v.id === channel_id)) : false;
}

export function included_in_ignore_list(channel_id: string, guild_object: GuildPrtl): boolean {
	return guild_object.ignore_list ? guild_object.ignore_list.some(i => i === channel_id) : false;
}

export function is_url_only_channel(channel_id: string, guild_object: GuildPrtl): boolean {
	return guild_object.url_list ? guild_object.url_list.some(u => u === channel_id) : false;
}

export function is_music_channel(channel_id: string, guild_object: GuildPrtl): boolean {
	return guild_object ? guild_object.music_data.channel_id === channel_id : false;
}

export function is_announcement_channel(channel_id: string, guild_object: GuildPrtl): boolean {
	return guild_object ? guild_object.announcement === channel_id : false;
}

//

export function get_role(guild: Guild | null, role_name_or_name: string): Role | undefined {
	return guild?.roles.cache.find(cached_role =>
		cached_role.id === role_name_or_name || cached_role.name === role_name_or_name
	);
}

//

export async function create_channel(
	guild: Guild, channel_name: string, channel_options: GuildChannelCreateOptions,
	channel_category: string | CategoryChannel | null
): Promise<string> {
	return new Promise((resolve, reject) => {
		guild.channels
			.create(channel_name, channel_options)
			.then(new_channel => {
				if (channel_category === null) { // does not want category
					return resolve(new_channel.id);
				} else {
					if (typeof channel_category === "string") { // create category
						guild.channels
							.create(channel_category, { type: 'category' })
							.then(category => {
								new_channel.setParent(category)
									.catch(e => {
										return reject(`failed to set parent to channel / ${e}`);
									});
								return resolve(new_channel.id);
							})
							.catch(e => {
								return reject(`failed to create category channel / ${e}`);
							});
					} else {
						new_channel.setParent(channel_category)
							.catch(e => {
								return reject(`failed to set parent to channel / ${e}`);
							});
						return resolve(new_channel.id);
					}
				}
			})
			.catch(e => {
				return reject(`failed to create voice channel / ${e}`);
			});
	});
}

export function create_voice_channel(
	state: VoiceState, portal_object: PortalChannelPrtl
): Promise<string> {
	return new Promise((resolve, reject) => {
		if (state && state.channel) {
			let voice_options: GuildChannelCreateOptions;

			if (portal_object.allowed_roles) {
				const permission_overwrites = portal_object.allowed_roles
					.map(id => <OverwriteResolvable>{
						id: id,
						allow: ['CONNECT']
					});

				if (!portal_object.allowed_roles.some(id => id === state.guild.roles.everyone.id)) {
					permission_overwrites.push({
						id: state.guild.roles.everyone.id,
						deny: ['CONNECT']
					});
				}

				if (state.member) {
					permission_overwrites.push({
						id: state.member.id,
						allow: ['CONNECT']
					});
				}

				voice_options = {
					type: 2,
					bitrate: 96000,
					userLimit: portal_object.user_limit_portal,
					parent: state.channel.parent
						? state.channel.parent
						: undefined,
					permissionOverwrites: permission_overwrites
				};
			} else {
				voice_options = {
					type: 2,
					bitrate: 96000,
					userLimit: portal_object.user_limit_portal,
					parent: state.channel.parent
						? state.channel.parent
						: undefined
				};
			}

			state.channel.guild.channels
				.create('loading..', voice_options)
				.then(channel => {
					if (state.member) {
						const new_voice = new VoiceChannelPrtl(
							channel.id, state.member.id, portal_object.render, portal_object.regex_voice, portal_object.no_bots,
							portal_object.locale, portal_object.ann_announce, portal_object.ann_user);

						insert_voice(state.member.guild.id, portal_object.id, new_voice)
							.catch(e => {
								return reject(`failed to store voice channel / ${e}`);
							});

						state.member.voice.setChannel(channel)
							.catch(e => {
								return reject(`failed to set member to new voice channel / ${e}`);
							});

						return resolve(`created channel and moved member to new voice`);
					} else {
						return reject(`could not fetch member`);
					}
				})
				.catch(e => {
					return reject(`failed to create voice channel / ${e}`);
				});
		}
	});
}

// must be fixed
export async function create_music_channel(
	guild: Guild, music_channel: string, music_category: string | CategoryChannel | null, guild_object: GuildPrtl
): Promise<boolean> {
	return new Promise((resolve, reject) => {
		if (music_category && typeof music_category === 'string') { // with category
			guild.channels
				.create(
					`${music_channel}`,
					{
						type: 'text',
						topic: 'play:▶️, pause:⏸, skip:⏭, pin last:📌, lyrics:📄, queue text:⬇️, clear queue:🧹, leave:🚪' // , vol dwn ➖, vol up ➕
					},
				)
				.then((channel: TextChannel) => {
					guild_object.music_data.channel_id = channel.id;
					guild.channels
						.create(music_category, { type: 'category' })
						.then(cat_channel => channel.setParent(cat_channel))
						.catch(e => {
							return reject(`faild to create music category / ${e}`);
						});

					create_music_message(channel, guild_object)
						.then(music_message_id => {
							logger.log({ level: 'info', type: 'none', message: `send music message ${music_message_id}` });
							if (guild_object.music_data.message_id) {
								create_lyrics_message(channel, guild_object, music_message_id)
									.then(() => {
										resolve(true);
									})
									.catch(e => {
										return reject(`failed to send music lyrics message / ${e}`);
									});
							}
						})
						.catch(e => {
							return reject(`failed to send music message / ${e}`);
						});
				})
				.catch(e => {
					return reject(`failed to create focus channel / ${e}`);
				});
		}
		else if (music_category) { // with category object given
			guild.channels
				.create(
					`${music_channel}`,
					{
						type: 'text',
						topic: 'play:▶️, pause:⏸, skip:⏭, pin last:📌, lyrics:📄, queue text:⬇️, clear queue:🧹, leave:🚪', // , vol dwn ➖, vol up ➕
						parent: music_category
					},
				)
				.then(channel => {
					channel.setParent(music_category)
						.catch(e => {
							return reject(`failed to set parent to / ${e}`);
						});
					guild_object.music_data.channel_id = channel.id;
					create_music_message(channel, guild_object)
						.then(music_message_id => {
							logger.log({ level: 'info', type: 'none', message: `send music message ${music_message_id}` });
							if (guild_object.music_data.message_id) {
								create_lyrics_message(channel, guild_object, music_message_id)
									.then(() => {
										return resolve(true);
									})
									.catch(e => {
										return reject(`failed to send music lyrics message / ${e}`);
									});
							}
						})
						.catch(e => {
							return reject(`failed to send music message / ${e}`);
						});
				})
				.catch(e => {
					return reject(`failed to create focus channel / ${e}`);
				});
		}
		else { // without category
			guild.channels
				.create(
					`${music_channel}`,
					{
						type: 'text',
						topic: 'play:▶️, pause:⏸, skip:⏭, pin last:📌, lyrics:📄, queue text:⬇️, clear queue:🧹, leave:🚪' // , vol dwn ➖, vol up ➕
					},
				)
				.then(channel => {
					guild_object.music_data.channel_id = channel.id;
					create_music_message(channel, guild_object)
						.then(music_message_id => {
							logger.log({ level: 'info', type: 'none', message: `send music message ${music_message_id}` });
							if (guild_object.music_data.message_id) {
								create_lyrics_message(channel, guild_object, music_message_id)
									.then(() => {
										return resolve(true);
									})
									.catch(e => {
										return reject(`failed to send music lyrics message / ${e}`);
									});
							}
						})
						.catch(e => {
							return reject(`failed to send music message / ${e}`);
						});
				})
				.catch(e => {
					return reject(`failed to create focus channel / ${e}`);
				});
		}
	});
}

export async function create_focus_channel(
	guild: Guild, member: GuildMember, member_found: GuildMember,
	focus_time: number, portal_object: PortalChannelPrtl
): Promise<ReturnPormise> {
	return new Promise((resolve) => {
		const return_value = {
			result: false,
			value: 'you can run "./help focus" for help'
		};

		if (!member.voice.channel) {
			return resolve(return_value);
		}

		const oldChannel: VoiceChannel | null = member.voice.channel;

		const voice_options: GuildChannelCreateOptions = {
			type: 2,
			bitrate: 96000,
			userLimit: 2
		};

		const chatroom_name = `${focus_time === 0
			? 'Private Room'
			: `PR-${focus_time}' $hour:$minute/${moment()
				.add(focus_time, focus_time === 1 ? "minute" : "minutes")
				.format('hh:mm')}`
			}`;

		guild.channels
			.create(chatroom_name, voice_options)
			.then(channel => {
				member.voice.setChannel(channel)
					.catch(e => {
						return resolve({
							result: false,
							value: `failed to set member to new channel / ${e}`
						});
					});
				member_found.voice.setChannel(channel)
					.catch(e => {
						return resolve({
							result: false,
							value: `failed to set member to new channel / ${e}`
						});
					});

				insert_voice(guild.id, portal_object.id, new VoiceChannelPrtl(
					channel.id, member.id, portal_object.render, chatroom_name, portal_object.no_bots,
					portal_object.locale, portal_object.ann_announce, portal_object.ann_user
				))
					.catch(e => {
						return resolve({
							result: false,
							value: `failed to store voice channel / ${e}`
						});
					});

				if (focus_time !== 0) {
					setTimeout(() => {
						if (!oldChannel.deleted) {
							member.voice.setChannel(oldChannel)
								.then(() => {
									member_found.voice.setChannel(oldChannel)
										.then(() => {
											return resolve({
												result: true,
												value: 'focus ended properly'
											});
										})
										.catch(e => {
											return resolve({
												result: false,
												value: `focus did not end properly / ${e}`
											});
										});
								})
								.catch(e => {
									return resolve({
										result: false,
										value: `focus did not end properly / ${e}`
									});
								});
						}
						else {
							return resolve({
								result: false,
								value: 'could not move to original voice channel because it was deleted'
							});
						}
					}, focus_time * 60 * 1000);
				}
			})
			.catch(e => {
				return resolve({
					result: false,
					value: `failed to create focus channel / ${e}`
				});
			});
	});
}

//

export function delete_channel(
	type: PortalChannelTypes, channel_to_delete: VoiceChannel | TextChannel,
	message: Message | null, isPortal = false
): Promise<boolean> {
	return new Promise((resolve, reject) => {
		if (!isPortal) {
			if (message) {
				const author = message.author;
				const channel_to_delete_name = channel_to_delete.name;
				let replied_with_yes = false;

				message.channel
					.send(
						`${message.author}, do you wish to delete old ` +
						`${PortalChannelTypes[type].toString()} channel **${channel_to_delete}** (yes / no) ?`
					)
					.then((question_msg: Message) => {
						const filter: CollectorFilter = (m: Message) => (m.author.id === author.id);
						const collector: MessageCollector = message.channel
							.createMessageCollector(
								filter,
								{
									time: 10000
								}
							);

						collector.on('collect', (m: Message) => {
							if (m.content === 'yes') {
								replied_with_yes = true;
								collector.stop();
							}
							else if (m.content === 'no') {
								replied_with_yes = false;
								collector.stop();
							}
						});

						collector.on('end', (collected: Collection<string, Message>) => {
							collected.forEach((reply_message: Message) => {
								if (reply_message.deletable) {
									reply_message
										.delete()
										.catch(e => {
											return reject(`failed to delete message / ${e}`);
										});
								}
							});

							if (!replied_with_yes) {
								question_msg
									.edit(`channel **"${channel_to_delete}"** will not be deleted`)
									.then(msg => {
										msg
											.delete({ timeout: 5000 })
											.catch(e => {
												return reject(`failed to delete message / ${e}`);
											});
									})
									.catch(e => {
										return reject(`failed to send message / ${e}`);
									});
							} else {
								if (channel_to_delete.deletable) {
									channel_to_delete
										.delete()
										.then(() => {
											question_msg
												.edit(`channel **"${channel_to_delete_name}"** deleted`)
												.then(edit_message => {
													edit_message
														.delete({ timeout: 7000 })
														.then(() => {
															return resolve(true);
														})
														.catch(e => {
															return reject(`failed to delete message / ${e}`);
														});
												})
												.catch(e => {
													return reject(`failed to send message / ${e}`);
												});
										})
										.catch(e => {
											return reject(`failed to delete channel / ${e}`);
										});
								}
								else {
									question_msg
										.edit(`channel **"${channel_to_delete}"** is not deletable`)
										.then(edit_message => {
											edit_message
												.delete({ timeout: 5000 })
												.catch(e => {
													return reject(`failed to delete message / ${e}`);
												});
										})
										.catch(e => {
											return reject(`failed to send message / ${e}`);
										});
								}
							}
						});
					})
					.catch(e => {
						return reject(`failed to send message / ${e}`);
					});
			}
		}
		else if (channel_to_delete.deletable) {
			channel_to_delete
				.delete()
				.then(() => {
					return resolve(true);
				})
				.catch(e => {
					return reject(`failed to delete channel / ${e}`);
				});
		}
	});
}

//

export function generate_channel_name(
	voice_channel: VoiceChannel, portal_list: PortalChannelPrtl[],
	guild_object: GuildPrtl, guild: Guild
): Promise<boolean> {
	return new Promise((resolve, reject) => {
		for (let i = 0; i < portal_list.length; i++) {
			for (let j = 0; j < portal_list[i].voice_list.length; j++) {

				if (portal_list[i].voice_list[j].id === voice_channel.id) {
					// I choose not to fetch the voice regex from database
					// if it changed users can create a new one instead of
					// me creating an database spam 
					let regex = portal_list[i].voice_list[j].regex;
					if (portal_list[i].regex_overwrite) {
						const member = voice_channel.members
							.find(m => m.id === portal_list[i].voice_list[j].creator_id);

						if (member) {
							const member_object = guild_object.member_list
								.find(m => m.id === member.id);

							if (member_object?.regex && member_object.regex !== 'null') {
								regex = member_object.regex;
							}
						}
					}

					const new_name = portal_list[i].voice_list[j].render
						? regex_interpreter(
							regex,
							voice_channel,
							portal_list[i].voice_list[j],
							portal_list,
							guild_object,
							guild,
							portal_list[i].voice_list[j].creator_id
						)
						: regex;

					if (new_name.length >= 1) {
						const capped_new_name = max_string(new_name, 99);
						if (voice_channel.name !== capped_new_name) {
							voice_channel
								.edit({ name: capped_new_name })
								.catch(e => {
									return reject(`failed to eddit voice channel / ${e}`);
								});

							return resolve(true);
						}
						else {
							return resolve(false);
						}
					}
					else {
						return resolve(true);
					}
				}
			}
		}
	});
}

export function regex_interpreter(
	regex: string, voice_channel: VoiceChannel | undefined | null, voice_object: VoiceChannelPrtl | undefined | null,
	portal_list: PortalChannelPrtl[] | undefined | null, guild_object: GuildPrtl, guild: Guild, member_id: string
): string {
	let last_space_index = 0;
	let last_vatiable_end_index = 0;
	let last_attribute_end_index = 0;

	let last_variable = '';
	let last_attribute = '';
	let new_channel_name = '';

	for (let i = 0; i < regex.length; i++) {
		if (regex[i] === variable_prefix) {
			const vrbl = is_variable(regex.substring(i));

			if (vrbl.length !== 0) {
				const return_value: string | number = <string>get_variable( // maybe make any ?
					voice_channel, voice_object, portal_list, guild_object, guild, vrbl
				);

				if (return_value !== null) {
					last_variable = return_value;
					new_channel_name += return_value;
					i += voca.chars(vrbl).length;
					last_vatiable_end_index = i;
				}
				else {
					new_channel_name += regex[i];
				}
			}
			else {
				new_channel_name += regex[i];
			}
		}
		else if (regex[i] === attribute_prefix) {
			const attr = is_attribute(regex.substring(i));

			if (attr.length !== 0) {
				// const member_object = guild_object.member_list.find(m => m.id === member_id);

				const return_value = get_attribute(
					voice_channel, voice_object, portal_list, guild_object, guild, attr //, member_object
					// voice_channel, voice_object, p, guild_object, attr, member_object
				);


				if (return_value !== null) {
					last_attribute = `${return_value}`;
					new_channel_name += return_value;
					i += voca.chars(attr).length;
					last_attribute_end_index = i;
				}
				else {
					new_channel_name += regex[i];
				}
			}
			else {
				new_channel_name += regex[i];
			}
		}
		else if (regex[i] === pipe_prefix) {
			const pipe = is_pipe(regex.substring(i));

			if (pipe.length !== 0) {
				if (last_vatiable_end_index + 1 === i) {
					const return_value = get_pipe(last_variable, pipe);

					if (return_value !== null) {
						new_channel_name = new_channel_name.substring(0,
							voca.chars(new_channel_name).length - voca.chars(last_variable).length);
						new_channel_name += return_value;
						i += voca.chars(pipe).length;
					}
					else {
						new_channel_name += regex[i];
					}
				}
				else if (last_attribute_end_index + 1 === i) {
					const return_value = get_pipe(last_attribute, pipe);

					if (return_value !== null) {
						new_channel_name = new_channel_name.substring(0,
							voca.chars(new_channel_name).length - voca.chars(last_attribute).length);
						new_channel_name += return_value;
						i += voca.chars(pipe).length;
					}
					else {
						new_channel_name += regex[i];
					}
				}
				else {
					const return_value = get_pipe(new_channel_name.substring(last_space_index, new_channel_name.length), pipe);

					if (return_value !== null) {
						const str_for_pipe = return_value;
						new_channel_name = new_channel_name.substring(0, last_space_index);
						new_channel_name += str_for_pipe;
						i += voca.chars(pipe).length;
					}
					else {
						new_channel_name += regex[i];
					}
				}
			}
			else {
				new_channel_name += regex[i];
			}
		}
		else if (regex[i] === '{' && (regex[i + 1] !== undefined && regex[i + 1] === '{')) {

			try {
				// did not put into structure_list due to many unnecessary function calls
				let is_valid = false;
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				const statement = get_json(regex.substring(i + 1, i + 1 + regex.substring(i + 1).indexOf('}}') + 1));

				if (!statement) return 'error';

				if (Object.prototype.hasOwnProperty.call(statement, 'if')) {
					if (Object.prototype.hasOwnProperty.call(statement, 'is')) {
						if (Object.prototype.hasOwnProperty.call(statement, 'with')) {
							if (Object.prototype.hasOwnProperty.call(statement, 'yes')) {
								if (Object.prototype.hasOwnProperty.call(statement, 'no')) {
									is_valid = true;
								}
							}
						}
					}
				}

				if (!is_valid) {
					new_channel_name += regex[i];
					if (regex[i] === ' ') { last_space_index = i + 1; }
				}
				else {
					if (statement.is === "==" || statement.is === "===" || statement.is === "!=" || statement.is === "!==" ||
						statement.is === ">" || statement.is === "<" || statement.is === ">=" || statement.is === "<=") {
						// eslint-disable-next-line @typescript-eslint/no-unsafe-call
						if (inline_operator(statement.is)(
							regex_interpreter(statement.if, voice_channel, voice_object, portal_list, guild_object, guild, member_id),
							regex_interpreter(statement.with, voice_channel, voice_object, portal_list, guild_object, guild, member_id)
						)) {
							const value = regex_interpreter(statement.yes, voice_channel, voice_object, portal_list, guild_object, guild, member_id);
							if (value !== '--') {
								new_channel_name += value;
							}
						}
						else {
							const value = regex_interpreter(statement.no, voice_channel, voice_object, portal_list, guild_object, guild, member_id);
							if (value !== '--') {
								new_channel_name += value;
							}
						}
						i += regex.substring(i + 1).indexOf('}}') + 2;
					} else {
						return 'error';
					}
				}
			}
			catch (e) {
				logger.log({ level: 'info', type: 'none', message: `failed to parse json / ${e}` });
				new_channel_name += regex[i];
			}

		}
		else {
			new_channel_name += regex[i];
			if (regex[i] === ' ') { last_space_index = i + 1; }
		}
	}

	if (new_channel_name === '') {
		return '';
	}

	return new_channel_name;
}