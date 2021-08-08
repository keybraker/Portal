/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// const ytdl = require('ytdl-core');
import ytdl from 'discord-ytdl-core';
import { Client, Guild, Message, MessageAttachment, User } from "discord.js";
import { RequestOptions } from 'https';
import yts, { Duration, PlaylistMetadataResult, SearchResult, VideoMetadataResult, VideoSearchResult } from 'yt-search';
import config from '../config.json';
import { GuildPrtl } from "../types/classes/GuildPrtl.class";
import { get_json, is_url, join_by_reaction, join_user_voice, update_music_lyrics_message, update_music_message } from './help.library';
import { https_fetch, scrape_lyrics } from './http.library';
import { clear_music_vote, fetch_guild_music_queue, insert_music_video, update_guild } from './mongo.library';
import { getVoiceConnection, VoiceConnection, VoiceConnectionStatus, createAudioPlayer, createAudioResource, PlayerSubscription, StreamType, AudioPlayer, AudioPlayerStatus } from '@discordjs/voice';

async function pop_music_queue(
	guild_object: GuildPrtl
): Promise<yts.VideoSearchResult | undefined> {
	return new Promise((resolve, reject) => {
		fetch_guild_music_queue(guild_object.id)
			.then(music => {
				if (!music) {
					return resolve(undefined);
				}

				if (!music.data.pinned && music.queue.length > 0) {
					music.queue.shift();
					update_guild(guild_object.id, 'music_queue', music.queue)
						.catch(e => {
							return reject(`failed to update guild / ${e}`);
						});
				}

				guild_object.music_queue = music.queue;
				guild_object.music_data = music.data;

				if (music.queue.length > 0) {
					return resolve(music.queue[0]);
				} else {
					return resolve(undefined);
				}
			})
			.catch(e => {
				return reject(`could not fetch music queue / ${e}`);
			});
	})
}

// function delete_player(
// 	dispatcher: StreamDispatcher
// ): boolean {
// 	if (!dispatcher.destroyed) {
// 		dispatcher.destroy();
// 	}

// 	return !dispatcher.destroyed;
// }

function spawn_player(
	video_options: yts.VideoSearchResult, voice_connection: VoiceConnection
): AudioPlayer {
	const stream = ytdl(video_options.url, {
		filter: 'audioonly',
		opusEncoded: true,
		encoderArgs: ['-af', 'bass=g=10,dynaudnorm=f=200'],
		// liveBuffer: 20000, // default: 20000
		// highWaterMark: 5120, // default: 5120
		// dlChunkSize: 10240 // default: 10240
	});

	const player = createAudioPlayer();
	const resource = createAudioResource(stream, {
		inputType: StreamType.Opus,
	});

	player.play(resource);

	const subscription = voice_connection.subscribe(player);

	return player;
}

async function push_video_to_queue(
	guild_object: GuildPrtl, video: VideoSearchResult
): Promise<string> {
	return new Promise((resolve, reject) => {
		if (!guild_object.music_queue) {
			guild_object.music_queue = [];
		}

		guild_object.music_queue.push(video);
		insert_music_video(guild_object.id, video)
			.then(() => {
				return resolve(`${video.title} has been added to queue`);
			})
			.catch(e => {
				return reject(`${video.title} failed to get added to queue / ${e}`);
			});
	});
}

async function start_playback(
	voice_connection: VoiceConnection | undefined,
	client: Client,
	user: User,
	message: Message,
	guild: Guild,
	guild_object: GuildPrtl,
	video: VideoSearchResult
): Promise<string> {
	return new Promise((resolve, reject) => {
		push_video_to_queue(guild_object, video)
			.then(() => {
				if (voice_connection) {
					if (voice_connection.state.status === VoiceConnectionStatus.Ready) {
						const audio_player = spawn_player(
							guild_object.music_queue
								? guild_object.music_queue[0]
								: video,
							voice_connection
						);

						audio_player.once(AudioPlayerStatus.Idle, () => {
							// delete_player(dispatcher);

							skip(voice_connection, user, client, guild, guild_object)
								.then(r => {
									clear_music_vote(guild_object.id)
										.catch(e => {
											return reject(`failed to clear queue / ${e}`);
										});

									const animate = voice_connection?.state.status === VoiceConnectionStatus.Signalling;

									update_music_message(
										guild,
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
								})
								.catch(e => {
									return reject(`failed to skip video / ${e}`);
								});
						});

						return resolve('playback started');
					} else {
						return resolve('already playing, song added to queue');
					}
				} else {
					join_user_voice(client, message, guild_object, false)
						.then(r => {
							if (!r) {
								return reject(`could not join your voice channel`);
							}

							const audio_player = spawn_player(
								guild_object.music_queue
									? guild_object.music_queue[0]
									: video,
								r
							);

							audio_player.once(AudioPlayerStatus.Idle, () => {
								// delete_player(dispatcher);

								skip(r, user, client, guild, guild_object)
									.then(r => {
										clear_music_vote(guild_object.id)
											.catch(e => {
												return reject(`failed to clear queue / ${e}`);
											});

										const voice_connection = getVoiceConnection(guild_object.id);

										const animate = voice_connection?.state.status === VoiceConnectionStatus.Signalling;

										update_music_message(
											guild,
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
									})
									.catch(e => {
										return reject(`failed to skip video / ${e}`);
									});
							});

							return resolve('playback started');
						})
						.catch(e => {
							return reject(`error while joining channel / ${e}`);
						});
				}
			})
			.catch(e => {
				return reject(`error while adding video to queue 2: ${e}`);
			});
	});
}

export async function start(
	voice_connection: VoiceConnection | undefined, client: Client, user: User, message: Message,
	guild: Guild, guild_object: GuildPrtl, search_term: string
): Promise<string> {
	return new Promise((resolve, reject) => {
		if (message.attachments.size > 0) {
			const attachment = message.attachments.find(a => !!a);

			if (attachment) {
				const url_path = attachment.url.substr(26);

				const options: RequestOptions = {
					'method': 'GET',
					"hostname": 'cdn.discordapp.com',
					'port': null,
					"path": url_path
				}

				https_fetch(options)
					.then((response: Buffer) => {
						const json = <VideoSearchResult[]>get_json(response.toString());

						if (!json) {
							return resolve('data from source was corrupted');
						}

						if (json.length === 0) {
							return resolve('must give at least one');
						}

						start_playback(
							voice_connection, client, user, message,
							guild, guild_object, json[0]
						)
							.then(r => {
								json.forEach((v, i) => {
									if (i > 0) {
										push_video_to_queue(guild_object, v)
											.catch(e => {
												return reject(`failed to push video to queue / ${e}`);
											});
									}
								});

								return resolve(r);
							})
							.catch(e => {
								return reject(`error while starting music player / ${e}`);
							});
					})
					.catch((e: any) => {
						return reject(`could not access the server / ${e}`);
					});
			} else {
				return resolve('file is not a portal queue');
			}
		} else if (is_url(search_term)) {
			const plist_index = search_term.indexOf('list=');
			const pindx_index = search_term.indexOf('index=');
			const video_index = search_term.indexOf('?v=');

			if (plist_index > 0) {
				const listId = search_term.substr(plist_index + 5, 34);
				const index_str = pindx_index > 0
					? search_term.substr(pindx_index + 6)
					: '0';
				const index = isNaN(+index_str)
					? 0
					: +index_str;

				yts({ listId: listId })
					.then((yts_attempt: PlaylistMetadataResult) => {
						if (yts_attempt.videos.length <= 0) {
							return resolve(`could not find the playlist on youtube`);
						}

						const yt_url = 'https://www.youtube.com/watch';
						const initial_video = yts_attempt.videos[index];

						update_music_lyrics_message(guild, guild_object, '')
							.catch(e => {
								return reject(`failed to update music lyrics message / ${e}`);
							});

						start_playback(
							voice_connection, client, user, message,
							guild, guild_object, <VideoSearchResult>{
								type: 'video',
								videoId: initial_video.videoId,
								url: `${yt_url}` +
									`?v=${initial_video.videoId}` +
									`&list=${yts_attempt.listId}` +
									`&index=${index ? index : 1}`,
								title: initial_video.title,
								description: '',
								image: '',
								thumbnail: initial_video.thumbnail,
								seconds: 0,
								timestamp: '',
								duration: <Duration>{
									seconds: 0,
									timestamp: '-'
								},
								ago: '',
								views: 0,
								author: initial_video.author
							}
						)
							.then(r => {
								yts_attempt.videos.forEach((v, i) => {
									if (i > 0 && i > +index) {
										push_video_to_queue(
											guild_object,
											<VideoSearchResult>{
												type: 'video',
												videoId: v.videoId,
												url: `${yt_url}` +
													`?v=${v.videoId}` +
													`&list=${yts_attempt.listId}` +
													`&index=${i + 1}`,
												title: v.title,
												description: '',
												image: '',
												thumbnail: v.thumbnail,
												seconds: 0,
												timestamp: '',
												// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
												duration: (<any>v).duration,
												ago: '',
												views: 0,
												author: v.author,
											}
										)
											.catch(e => {
												return reject(`failed to push video to queue / ${e}`);
											});
									}
								});

								return resolve(r);
							})
							.catch(e => {
								return reject(`error while starting music player / ${e}`);
							});
					})
					.catch(e => {
						return reject(`error while searching youtube playlist / ${e}`);
					});
			} else if (video_index > 0) {
				const videoId = search_term.substr(video_index + 3, 11);

				yts({ videoId: videoId })
					.then((yts_attempt: VideoMetadataResult) => {
						start_playback(
							voice_connection, client, user, message,
							guild, guild_object, <VideoSearchResult>{
								type: 'video',
								videoId: yts_attempt.videoId,
								url: yts_attempt.url,
								title: yts_attempt.title,
								description: yts_attempt.description,
								image: yts_attempt.image,
								thumbnail: yts_attempt.thumbnail,
								seconds: yts_attempt.seconds,
								timestamp: yts_attempt.timestamp,
								duration: yts_attempt.duration,
								ago: yts_attempt.ago,
								views: yts_attempt.views,
								author: yts_attempt.author
							}
						)
							.then(r => {
								return resolve(r);
							})
							.catch(e => {
								return reject(`error while starting music player / ${e}`);
							});

					})
					.catch(e => {
						return reject(`error while searching youtube video / ${e}`);
					});
			} else {
				return resolve(`the url is not of a youtube video or playlist`);
			}
		} else {
			yts(search_term)
				.then((yts_attempt: SearchResult) => {
					if (yts_attempt.videos.length <= 0) {
						return resolve(`could not find something matching ${search_term}, on youtube`);
					}

					start_playback(
						voice_connection, client, user, message,
						guild, guild_object, yts_attempt.videos[0]
					)
						.then(r => {
							return resolve(r);
						})
						.catch(e => {
							return reject(`error while starting music player / ${e}`);
						});
				})
				.catch(e => {
					return reject(`error while searching youtube / ${e}`);
				});
		}
	});
}

export async function play(
	voice_connection: VoiceConnection | undefined, user: User,
	client: Client, guild: Guild, guild_object: GuildPrtl
): Promise<string> {
	return new Promise((resolve, reject) => {
		if (voice_connection) {
			if (voice_connection.dispatcher) {
				if (voice_connection.dispatcher.paused) {
					voice_connection.dispatcher.resume();

					return resolve('playback resumed');
				}
			} else {
				pop_music_queue(guild_object)
					.then(next_video => {
						if (!next_video) {
							return resolve('queue is empty');
						}

						const audio_player = spawn_player(
							next_video,
							voice_connection
						);

						audio_player.once(AudioPlayerStatus.Idle, () => {
							// delete_player(dispatcher);

							skip(voice_connection, user, client, guild, guild_object)
								.then(r => {
									clear_music_vote(guild_object.id)
										.catch(e => {
											return reject(`failed to clear music votes / ${e}`);
										});

									const animate = voice_connection?.state.status === VoiceConnectionStatus.Signalling;

									update_music_message(
										guild,
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
								})
								.catch(e => {
									return reject(`failed to skip video / ${e}`);
								});
						});

						return resolve('playing queued song');
					})
					.catch(e => {
						return reject(`failed to pop queue / ${e}`);
					});
			}
		} else {
			if (guild_object.music_queue.length === 0) {
				return resolve('queue is empty');
			}

			join_by_reaction(client, guild_object, user, false)
				.then(r => {
					if (!r) {
						return resolve('could not join voice channel');
					}

					const audio_player = spawn_player(
						guild_object.music_queue[0],
						r
					);

					audio_player.once(AudioPlayerStatus.Idle, () => {
						// delete_player(dispatcher);

						skip(voice_connection, user, client, guild, guild_object)
							.then(r => {
								clear_music_vote(guild_object.id)
									.catch(e => {
										return reject(`failed to clear music vote / ${e}`);
									});

								const voice_connection = getVoiceConnection(guild_object.id);

								const animate = voice_connection?.dispatcher
									? !voice_connection?.dispatcher.paused
									: false;

								update_music_message(
									guild,
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

							})
							.catch(e => {
								return reject(`failed to skip video / ${e}`);
							});
					});

					return resolve('playing video from queue');
				})
				.catch(e => {
					return reject(`could not to join voice channel / ${e}`);
				});
		}
	});
}

export async function pause(
	voice_connection: VoiceConnection | undefined
): Promise<string> {
	return new Promise((resolve) => {
		if (voice_connection) {
			if (voice_connection.dispatcher) {
				if (!voice_connection.dispatcher.paused) {
					voice_connection.dispatcher.pause();
					return resolve('playback paused');
				} else {
					return resolve('already paused');
				}
			} else {
				return resolve('player is idle');
			}
		} else {
			return resolve('Portal is not connected');
		}
	});
}

export async function skip(
	voice_connection: VoiceConnection | undefined, user: User, client: Client,
	guild: Guild, guild_object: GuildPrtl
): Promise<string> {
	return new Promise((resolve, reject) => {
		if (voice_connection) {
			if (voice_connection.dispatcher) {
				if (voice_connection.dispatcher.paused) {
					setTimeout(() => {
						voice_connection.dispatcher.resume();
						setTimeout(() => {
							voice_connection.dispatcher.end();
						}, 0.2 * 1000);
					}, 0.2 * 1000);
					voice_connection.dispatcher.resume();
				} else {
					voice_connection.dispatcher.end();
				}

				return resolve('skipped to queued song');
			} else {
				pop_music_queue(guild_object)
					.then(next_video => {
						if (!guild_object.music_data.pinned) {
							update_music_lyrics_message(guild, guild_object, '')
								.catch(e => {
									return reject(`failed to update music lyrics message / ${e}`);
								});
						}

						if (!next_video) {
							return resolve('queue is empty');
						}

						const audio_player = spawn_player(
							next_video,
							voice_connection
						);

						audio_player.once(AudioPlayerStatus.Idle, () => {
							// delete_player(dispatcher);

							skip(voice_connection, user, client, guild, guild_object)
								.then(r => {
									clear_music_vote(guild_object.id)
										.catch(e => {
											return reject(`failed to clear music video / ${e}`);
										});

									const animate = voice_connection?.state.status === VoiceConnectionStatus.Signalling;

									update_music_message(
										guild,
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
								})
								.catch(e => {
									return reject(`failed to skip video / ${e}`);
								});
						})

						return resolve('skipped to queued song');
					})
					.catch(e => {
						return reject(`failed to pop queue / ${e}`);
					});
			}
		} else {
			pop_music_queue(guild_object)
				.then(next_video => {
					if (!next_video) {
						return resolve('queue is empty');
					}

					join_by_reaction(client, guild_object, user, false)
						.then(r => {
							if (!r) {
								return resolve('could not join voice channel');
							}

							const audio_player = spawn_player(
								next_video,
								r
							);

							audio_player.once(AudioPlayerStatus.Idle, () => {
								// delete_player(dispatcher);

								skip(voice_connection, user, client, guild, guild_object)
									.then(r => {
										clear_music_vote(guild_object.id)
											.catch(e => {
												return reject(`failed to clear music queue / ${e}`);
											});

										const voice_connection = getVoiceConnection(guild_object.id);

										const animate = voice_connection?.dispatcher
											? !voice_connection?.dispatcher.paused
											: false;

										update_music_message(
											guild,
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
									})
									.catch(e => {
										return reject(`failed to skip video / ${e}`);
									});
							});

							return resolve('playing video from queue');
						})
						.catch(e => {
							return reject(`failed to join voice channel / ${e}`);
						});
				})
				.catch(e => {
					return reject(`failed to pop queue / ${e}`);
				});
		}
	});
}

export async function volume_up(
	voice_connection: VoiceConnection | undefined
): Promise<string> {
	return new Promise((resolve) => {
		if (voice_connection) {
			if (voice_connection.dispatcher) {
				voice_connection.dispatcher.setVolume(voice_connection.dispatcher.volume + 0.25);
				return resolve(`volume increased by 25% to ${voice_connection.dispatcher.volume * 100}%`);
			} else {
				return resolve('player is idle');
			}
		} else {
			return resolve('Portal is not connected');
		}
	});
}

export async function volume_down(
	voice_connection: VoiceConnection | undefined
): Promise<string> {
	return new Promise((resolve) => {
		if (voice_connection) {
			if (voice_connection.dispatcher) {
				if (voice_connection.dispatcher.volume !== 0) {
					voice_connection.dispatcher.setVolume(voice_connection.dispatcher.volume - 0.25);
					return resolve(`volume decreased by 25% to ${voice_connection.dispatcher.volume * 100}%`);
				} else {
					return resolve('volume is at 0%');
				}
			} else {
				return resolve('player is idle');
			}
		} else {
			return resolve('Portal is not connected');
		}
	});
}

export async function get_lyrics(
	guild: Guild, guild_object: GuildPrtl
): Promise<string> {
	return new Promise((resolve, reject) => {
		if (guild_object.music_queue.length > 0) {
			const uselessWordsArray = ["official", "music", "video", "ft."];
			const expStr = uselessWordsArray.join("|");

			const search_term_init = guild_object.music_queue[0].title
				.replace(new RegExp('\\b(' + expStr + ')\\b', 'gi'), ' ')
				.replace(/\s{2,}/g, ' ');
			const search_term_without = search_term_init
				.replace(/[&/\\#,+()$~%.'"-:*?<>{}]/g, '');
			// .replace(/[&\/\\#,+()$~%.'"-:*?<>{}]/g, '');
			const search_term = search_term_without
				.split(' ')
				.filter((s, i) => i < 6)
				.filter(s => !null && s !== '')
				.join('%20');

			const options: RequestOptions = {
				'method': 'GET',
				"hostname": "genius.p.rapidapi.com",
				'port': null,
				"path": `/search?q=${search_term}`,
				'headers': {
					"x-rapidapi-host": "genius.p.rapidapi.com",
					'x-rapidapi-key': config.api_keys.lyrics,
					'useQueryString': 1
				},
			}

			https_fetch(options)
				.then((response: Buffer) => {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					const json = get_json(response.toString().substring(response.toString().indexOf('{')));

					if (!json) {
						return reject('data from source was corrupted');
					}

					if (json.meta.status !== 200) {
						return resolve('could not fetch lyrics');
					}

					if (json.response.hits.length === 0 || json.response.hits[0].type !== 'song') {
						return resolve('could not find song');
					}

					scrape_lyrics(`https://genius.com${json.response.hits[0].result.path}`)
						.then((text: string) => {
							update_music_lyrics_message(
								guild, guild_object,
								text,
								`https://genius.com${json.response.hits[0].result.path}`
							)
								.then(() => {
									return resolve(`displayed lyrics`);
								})
								.catch((e: any) => {
									return reject(`failed to update lyrics message / ${e}`);
								});
						})
						.catch((e: any) => {
							return reject(`failed to scrap genius page / ${e}`);
						});
				})
				.catch((e: any) => {
					return reject(`could not access the server / ${e}`);
				});
		} else {
			update_music_lyrics_message(guild, guild_object, '')
				.then(() => {
					return resolve('no song in queue');
				})
				.catch(e => {
					return reject(`failed to update music lyrics message / ${e}`);
				});

		}
	});
}

export async function export_txt(
	guild_object: GuildPrtl
): Promise<MessageAttachment | null> {
	return new Promise((resolve) => {
		if (guild_object.music_queue.length > 0) {
			const stringData = JSON.stringify(guild_object.music_queue);
			const buffer = Buffer.from(stringData, "utf-8");
			const attachment = new MessageAttachment(buffer, "portal_video_queue.json");

			return resolve(attachment);
		} else {
			return resolve(null);
		}
	});
}
