import { Client, MessageReaction, Role, User } from "discord.js";
import { get_role } from "../libraries/guild.library";
import { create_rich_embed, is_authorised, is_dj, logger, update_music_lyrics_message, update_music_message } from "../libraries/help.library";
import { clear_music_vote, fetch_guild_reaction_data, insert_music_vote, remove_poll, set_music_data, update_guild } from "../libraries/mongo.library";
import { export_txt, get_lyrics, pause, play, skip } from "../libraries/music.library";
import { GuildPrtl } from "../types/classes/GuildPrtl.class";
import { getVoiceConnection, VoiceConnectionStatus } from "@discordjs/voice";

function clear_user_reactions(
	messageReaction: MessageReaction, user: User
): Promise<string> {
	return new Promise((resolve, reject) => {
		messageReaction.message.reactions.cache
			.forEach(reaction => {
				reaction.users
					.remove(user.id)
					.catch(e => {
						return reject(`failed to create dm channel / ${e}`);
					});
			});
	});
}

async function reaction_role_manager(
	guild_object: GuildPrtl, messageReaction: MessageReaction, user: User
): Promise<string> {
	return new Promise((resolve, reject) => {
		if (!messageReaction.message.guild) {
			return resolve('message has no guild');
		}

		const role_list_object = guild_object.role_list
			.find(r => r.message_id === messageReaction.message.id);

		if (!role_list_object) {
			return resolve('message is not role adder');
		}

		const current_member = messageReaction.message.guild.members.cache
			.find(member => member.id === user.id);

		if (!current_member) {
			return reject('could not fetch member');
		}

		role_list_object.role_emote_map
			.some(role_map => {
				if (messageReaction.message.guild) {
					if (role_map.emote === messageReaction.emoji.name) { // give role
						const role_array: Role[] = [];
						role_map.role.map(role => {
							const r = get_role(messageReaction.message.guild, role);
							if (r) {
								role_array.push(r);
							}
						});

						if (role_array) {
							const has_at_least_one_role = current_member.roles.cache
								.some(member_role => role_array
									.some(role => role && member_role.id === role.id));

							if (has_at_least_one_role) {
								try {
									current_member.roles
										.remove(role_array)
										.then(member => {
											if (member) {
												return resolve(`you have been removed ` +
													`from ${role_map.role}`);
											} else {
												return reject(`Portal's role must be higher ` +
													`than role you want to get, contact server admin`);
											}
										})
										.catch(e => {
											return reject(`Portal's role must be higher than ` +
												`role you want to get, contact server admin / ${e}`);
										});
								}
								catch (e) {
									return reject(`failed to remove role ${role_map.role}`);
								}
							} else {
								try {
									current_member.roles
										.add(role_array)
										.then(member => {
											if (member) {
												return resolve(`you have been added ` +
													`to ${role_map.role}`);
											} else {
												return reject(`Portal's role must be higher ` +
													`than role you want to get, contact server admin`);
											}
										})
										.catch(e => {
											return reject(`Portal's role must be higher than ` +
												`role you want to get, contact server admin / ${e}`);
										});
								}
								catch (e) {
									return reject(`failed to add role ${role_map.role}`);
								}
							}
						}
					}
				}
			});
	});
}

async function reaction_music_manager(
	client: Client, guild_object: GuildPrtl, messageReaction: MessageReaction, user: User
): Promise<string> {
	return new Promise((resolve, reject) => {
		if (!messageReaction.message.guild) {
			return reject(`could not fetch message's guild`);
		}

		if (!guild_object.music_data) {
			return resolve('guild has no music channel');
		}

		if (guild_object.music_data.message_id !== messageReaction.message.id) {
			return resolve('message is not music player');
		}

		const portal_voice_connection = getVoiceConnection(messageReaction.message?.guild?.id);
		const guild = client.guilds.cache.find(g => g.id === guild_object.id);

		if (!guild?.me?.voice.channel?.members.has(user.id)) {
			return resolve('you must be in the same channel as Portal');
		}

		switch (messageReaction.emoji.name) {
			case '▶️': {
				play(
					portal_voice_connection, user, client,
					messageReaction.message.guild, guild_object
				)
					.then(r => {
						clear_music_vote(guild_object.id)
							.catch(e => logger.error(new Error(e)));

						return resolve(r);
					})
					.catch(e => {
						clear_music_vote(guild_object.id)
							.catch(e => logger.error(new Error(e)));

						return reject(`failed to play video / ${e}`);
					});

				break;
			}
			case '⏸': {
				pause(portal_voice_connection)
					.then(r => {
						clear_music_vote(guild_object.id)
							.catch(e => logger.error(new Error(e)));

						return resolve(r);
					})
					.catch(e => {
						clear_music_vote(guild_object.id)
							.catch(e => logger.error(new Error(e)));

						return reject(`failed to pause video / ${e}`);
					});

				break;
			}
			case '⏭': {
				if (!portal_voice_connection) {
					update_music_lyrics_message(messageReaction.message.guild, guild_object, '')
						.catch(e => logger.error(new Error(e)));

					return resolve('nothing to skip, player is idle');
				}

				if (!guild_object.music_data.votes) {
					return resolve('could not fetch music votes');
				}

				const guild = messageReaction.message.guild;
				// const guild = client.guilds.cache
				// 	.find(g => g.id === guild_object.id);

				if (!guild) {
					return reject(`could not fetch guild`);
				}

				const member = guild.members.cache
					.find(m => m.id === user.id);

				if (!member) {
					return reject(`could not fetch memeber`);
				}

				let reason = 'none';

				if (!is_dj(member)) {
					if (!is_authorised(member)) {
						if (!guild_object.music_data.votes.includes(user.id)) {
							guild_object.music_data.votes.push(user.id);
							insert_music_vote(guild_object.id, user.id).catch(e => logger.error(new Error(e)));
						}

						const votes = guild_object.music_data.votes.length;
						const users = guild?.me?.voice.channel?.members
							.filter(member => !member.user.bot).size;

						if (users && !(votes < users / 2)) {
							return resolve(`${votes}/${Math.round(users / 2)} votes required`);
						} else {
							reason = 'vote'
						}
					} else {
						reason = 'admin'
					}
				} else {
					reason = 'DJ'
				}

				if (!guild_object.music_data.pinned) {
					skip(
						portal_voice_connection, user, client,
						messageReaction.message.guild, guild_object
					)
						.then(r => {
							clear_music_vote(guild_object.id)
								.catch(e => logger.error(new Error(e)));
							guild_object.music_queue.shift();

							return resolve(`${r} (by ${reason})`);
						})
						.catch(e => {
							return reject(`error while skipping / ${e}`);
						});
				} else {
					guild_object.music_data.pinned = false;
					set_music_data(guild_object.id, guild_object.music_data)
						.then(r => {
							if (!r) {
								return reject(guild_object.music_data.pinned
									? 'failed to pin song'
									: 'failed to unpin song');
							} else {
								skip(
									portal_voice_connection, user, client,
									guild, guild_object
								)
									.then(r => {
										clear_music_vote(guild_object.id)
											.catch(e => logger.error(new Error(e)));
										guild_object.music_queue.shift();

										return resolve(`${r} (by ${reason})`);
									})
									.catch(e => {
										return reject(`error while skipping / ${e}`);
									});
							}
						})
						.catch(e => {
							guild_object.music_data.pinned = !guild_object.music_data.pinned;

							return reject(!guild_object.music_data.pinned
								? `error occurred while pinning song / ${e}`
								: `error occurred while unpinning song / ${e}`);
						});
				}

				break;
			}
			// case '➖': {
			// 	volume_down(portal_voice_connection)
			// 		.then(r => {
			// 			clear_music_vote(guild_object.id)
			//.catch(e => logger.error(new Error(e)));

			// 			return resolve(r);
			// 		})
			// 		.catch(e => {
			// 			clear_music_vote(guild_object.id)
			// .catch(e => logger.error(new Error(e)));

			// 			return resolve({
			// 				result: false,
			// 				value: `error while decreasing volume / ${e}`
			// 			});
			// 		});

			// 	break;
			// }
			// case '➕': {
			// 	volume_up(portal_voice_connection)
			// 		.then(r => {
			// 			clear_music_vote(guild_object.id)
			// .catch(e => logger.error(new Error(e)));

			// 			return resolve(r);
			// 		})
			// 		// .catch(e => {
			// 			clear_music_vote(guild_object.id)
			// .catch(e => logger.error(new Error(e)));

			// 			return resolve({
			// 				result: false,
			// 				value: `error while increasing volume / ${e}`
			// 			});
			// 		});

			// 	break;
			// }
			case '📌': {
				guild_object.music_data.pinned = !guild_object.music_data.pinned;

				set_music_data(guild_object.id, guild_object.music_data)
					.then(r => {
						if (!r) {
							guild_object.music_data.pinned = !guild_object.music_data.pinned;
						}

						if (r) {
							return resolve(guild_object.music_data.pinned
								? 'pinned song'
								: 'unpinned song');
						} else {
							return reject(!guild_object.music_data.pinned
								? 'failed to pin song'
								: 'failed to unpin song');
						}
					})
					.catch(e => {
						guild_object.music_data.pinned = !guild_object.music_data.pinned;

						const reply_message = !guild_object.music_data.pinned
							? `error occurred while pinning song`
							: `error occurred while unpinning song`;

						return reject(`${reply_message} / ${e}`);
					});

				break;
			}
			case '📄': {
				get_lyrics(messageReaction.message.guild, guild_object)
					.then(r => {
						return resolve(r);
					})
					.catch(e => {
						return reject(`error occurred while fetching lyrics / ${e}`);
					});

				break;
			}
			case '⬇️': {
				export_txt(guild_object)
					.then(r => {
						if (r) {
							user.createDM()
								.then(dm => {
									dm
										.send({ embeds: [r] })
										.catch(e => {
											return reject(`failed to send a message / ${e}`);
										});
									return resolve(`sent '${user.username}' a list of the queue`);
								})
								.catch(e => {
									return reject(`failed to create dm channel / ${e}`);
								});
						} else {
							return resolve(`queue is empty`);
						}
					})
					.catch(e => {
						return reject(`failed to create music queue txt / ${e}`);
					});

				break;
			}
			case '🧹': {
				if (guild_object.music_queue.length > 1) {
					guild_object.music_queue.splice(1, guild_object.music_queue.length);
					update_guild(guild_object.id, 'music_queue', guild_object.music_queue)
						.catch(e => {
							return reject(`failed to update guild / ${e}`);
						});

					const guild = client.guilds.cache
						.find(g => g.id === guild_object.id);

					if (!guild) {
						clear_music_vote(guild_object.id)
							.catch(e => logger.error(new Error(e)));

						return reject('could fetch guild from client');
					}
				}

				clear_music_vote(guild_object.id)
					.catch(e => logger.error(new Error(e)));
				return resolve('queue has been cleared');

				break;
			}
			case '🚪': {
				pause(portal_voice_connection)
					.then(() => {
						if (portal_voice_connection) {
							guild_object.music_queue = [];
							update_guild(guild_object.id, 'music_queue', guild_object.music_queue)
								.catch(e => {
									return reject(`failed to update guild / ${e}`);
								});

							if (messageReaction.message.guild) {
								update_music_lyrics_message(messageReaction.message.guild, guild_object, '')
									.catch(e => {
										return reject(`failed to update music lyric message / ${e}`);
									});
							}

							clear_music_vote(guild_object.id)
								.catch(e => logger.error(new Error(e)));
							portal_voice_connection.disconnect();

							return resolve('Portal has been disconnected');
						} else {
							return resolve('Portal is not connected to a voice channel');
						}
					})
					.catch(e => {
						clear_music_vote(guild_object.id)
							.catch(e => logger.error(new Error(e)));

						return reject(`Portal failed to get disconnected / ${e}`);
					});

				break;
			}
		}
	});
}

module.exports = async (
	args: { client: Client, messageReaction: MessageReaction, user: User }
): Promise<string> => {
	return new Promise((resolve, reject) => {
		if (args.user.bot) {
			return resolve(''); // 'not handling bot reactions'
		} else if (args.messageReaction.message?.guild) {
			const current_guild = args.messageReaction.message.guild;
			fetch_guild_reaction_data(current_guild.id, args.user.id)
				.then(guild_object => {
					if (guild_object) {
						if (args.messageReaction.partial) {
							try {
								args.messageReaction
									.fetch()
									.catch(e => {
										return reject(`something went wrong when fetching the message / ${e}`);
									});
							} catch (e) {
								return reject(`something went wrong when fetching the message / ${e}`);
							}
						}

						if (guild_object.role_list.some(r => r.message_id === args.messageReaction.message.id)) {
							reaction_role_manager(guild_object, args.messageReaction, args.user)
								.then(r => {
									clear_user_reactions(args.messageReaction, args.user)
										.catch((e: any) => {
											return reject(`failed to clear messages / ${e}`);
										});
									args.messageReaction.message.channel
										.send(`${args.user}, ${r}`)
										.then(sent_message => {
											setTimeout(() =>
												sent_message
													.delete()
													.catch(e => {
														return reject(`failed to delete message / ${e}`);
													}),
												7500
											);

											return resolve('');
										})
										.catch(e => {
											return reject(`failed to send message / ${e}`);
										});
								})
								.catch(e => {
									clear_user_reactions(args.messageReaction, args.user)
										.catch((e: any) => {
											return reject(`failed to clear messages / ${e}`);
										});
									args.messageReaction.message.channel
										.send(`${args.user}, ${e}`)
										.then(sent_message => {
											setTimeout(() =>
												sent_message
													.delete()
													.catch(e => {
														return reject(`failed to delete message / ${e}`);
													}),
												7500
											);

											return resolve('');
										})
										.catch(e => {
											return reject(`failed to send message / ${e}`);
										});
								});
						} else if (guild_object.music_data.message_id === args.messageReaction.message.id) {
							reaction_music_manager(args.client, guild_object, args.messageReaction, args.user)
								.then(r => {
									if (args.messageReaction.message.guild) {
										const portal_voice_connection = getVoiceConnection(args.messageReaction.message.guild?.id);

										const animate = true; // portal_voice_connection?.dispatcher
											// ? !portal_voice_connection?.dispatcher.paused
											// : false;

										update_music_message(
											args.messageReaction.message.guild,
											guild_object,
											guild_object.music_queue.length > 0
												? guild_object.music_queue[0]
												: undefined,
											r,
											animate
										)
											.catch(e => {
												return reject(`failed to update music message / ${e}`);
											});
									}

									clear_user_reactions(args.messageReaction, args.user)
										.catch((e: any) => {
											return reject(`failed to clear messages / ${e}`);
										});

									return resolve(r);
								})
								.catch(e => {
									if (args.messageReaction.message.guild) {
										update_music_message(
											args.messageReaction.message.guild,
											guild_object,
											guild_object.music_queue.length > 0
												? guild_object.music_queue[0]
												: undefined,
											`error while handling music reaction / ${e}`
										)
											.catch(e => {
												return reject(`failed to update music message / ${e}`);
											});
									}

									clear_user_reactions(args.messageReaction, args.user)
										.catch((e: any) => {
											return reject(`failed to clear messages / ${e}`);
										});

									return reject(e);
								});
						} else if (args.messageReaction.emoji.name === '🏁' &&
							guild_object.poll_list.some(p => p.message_id === args.messageReaction.message.id)) {
							const poll = guild_object.poll_list.find(p =>
								p.message_id === args.messageReaction.message.id);

							if (poll && args.user.id === poll.member_id) {
								const winner: MessageReaction[] = [];
								let count = 0;

								args.messageReaction.message.reactions.cache
									.filter(r => r.emoji.name !== '🏁' && r.count !== 1)
									.sort((a, b) => (b.count ? b.count : 0) - (a.count ? a.count : 0))
									.forEach((value: MessageReaction) => { // , key: string, map: Map<string, MessageReaction>) => {
										if (winner.length === 0) {
											count = value.count ? value.count : 0;
											winner.push(value);
										} else {
											if ((winner[0] ? winner[0].count : 0) === (value ? value.count : 0)) {
												winner.push(value);
											}
										}
									});

								const message = winner.length > 0
									? `Poll outcome ${winner.length > 1 ? 'are options' : 'is option'} ` +
									`${winner.map(r => r.emoji).join(', ')} ` +
									`with ${(count) - 1} ${(count - 1 > 1 ? 'votes' : 'vote')}`
									: `Noboody voted`;

								args.messageReaction.message.channel
									.send({
										embeds: [
											create_rich_embed(
												null,
												null,
												'#9900ff',
												null,
												null,
												null,
												false,
												null,
												null,
												undefined,
												{
													name: message,
													icon: 'https://raw.githubusercontent.com/keybraker/Portal/master/src/assets/img/firework.gif'
												}
											)]
									}
									)
									.catch(e => {
										return reject(`failed to send message / ${e}`);
									});

								remove_poll(current_guild.id, args.messageReaction.message.id)
									.then(r => {
										if (r) {
											return resolve('successfully removed poll');
										} else {
											return reject('failed to remove poll');
										}
									})
									.catch(e => {
										return reject(`error while removing poll / ${e}`);
									});
							}
						} else {
							return resolve('message is not controlled by Portal');
						}
					}
					else {
						return reject('something went wrong with guild object');
					}
				})
				.catch(e => {
					return reject(`failed to fetch message reaction / ${e}`);
				});
		} else {
			return reject(`could not fetch guild`);
		}
	});
}