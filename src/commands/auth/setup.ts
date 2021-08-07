// import { GuildChannelCreateOptions, Message, TextChannel } from "discord.js";
// import { create_channel, create_music_channel, delete_channel, get_options } from "../../libraries/guild.library";
// import { insert_portal, update_guild, insert_url } from "../../libraries/mongo.library";
// import { GuildPrtl } from "../../types/classes/GuildPrtl.class";
// import { PortalChannelPrtl } from "../../types/classes/PortalChannelPrtl.class";
// import { PortalChannelTypes } from "../../data/enums/PortalChannel.enum";
// import { ReturnPormise } from "../../types/classes/TypesPrtl.interface";
// import { message_help } from "../../libraries/help.library";

// module.exports = async (
// 	message: Message, args: string[], guild_object: GuildPrtl
// ): Promise<ReturnPormise> => {
// 	return new Promise((resolve) => {
// 		if (!message.guild) {
// 			return resolve({
// 				result: true,
// 				value: message_help('commands', 'setup', 'guild could not be fetched')
// 			});
// 		}
// 		const current_guild = message.guild;

// 		current_guild.channels
// 			.create('portal-hub', { type: 'category' })
// 			.then(cat_channel => {
// 				current_guild.channels.cache.forEach(channel => {
// 					if (channel.id === guild_object.announcement) {
// 						delete_channel(PortalChannelTypes.announcement, <TextChannel>channel, message);
// 					}
// 					if (channel.id === guild_object.music_data.channel_id) {
// 						delete_channel(PortalChannelTypes.music, <TextChannel>channel, message);
// 					}
// 				});

// 				if (message.member) {
// 					const portal_options: GuildChannelCreateOptions = {
// 						topic: `by Portal, channels on demand`,
// 						type: 2,
// 						bitrate: 64000,
// 						userLimit: 1
// 					};
// 					const voice_regex = guild_object.premium
// 						// ? 'G$#-P$member_count | $status_list'
// 						? `$#:$member_count {{
// 							"if": "$status_count", "is": "===", "with": "1",
// 							"yes": "$status_list", "no": "$status_list|acronym"
// 						}}`
// 						: 'Channel $#'

// 					create_channel(current_guild, 'voice-portal', portal_options, cat_channel)
// 						.then(response => {
// 							if (response.result) {
// 								if (message.member) {
// 									insert_portal(guild_object.id, new PortalChannelPrtl(
// 										response.value, message.member.id, true, 'voice-portal', voice_regex,
// 										[], false, guild_object.locale, true, true, 0, false
// 									));
// 								} else {
// 									return resolve({
// 										result: false,
// 										value: message_help('commands', 'setup', 'could not fetch member from message')
// 									});
// 								}
// 							} else {
// 								return resolve(response);
// 							}
// 						})
// 						.catch(error => {
// 							return resolve(error);
// 						});
// 				}

// 				const announcement_options = get_options(current_guild, 'announcements channel (Portal/Users/Admins)', false);
// 				const url_options = get_options(current_guild, 'url only channel', true);

// 				create_channel(current_guild, 'announcement', announcement_options, cat_channel)
// 					.then(response => {
// 						if (response.result) {
// 							update_guild(guild_object.id, 'announcement', response.value)
// 								.then(r => {
// 									return resolve({
// 										result: r,
// 										value: r
// 											? 'successfully removed announcement channel'
// 											: message_help('commands', 'setup', 'failed to remove announcement channel')
// 									});
// 								})
// 								.catch(e => {
// 									return resolve({
// 										result: false,
// 										value: message_help('commands', 'setup', 'failed to remove announcement channel')
// 									});
// 								});
// 						} else {
// 							return resolve(response);
// 						}
// 					})
// 					.catch(error => { return resolve(error); });
// 				create_channel(current_guild, 'url-only', url_options, cat_channel)
// 					.then(response => {
// 						if (response.result) {
// 							insert_url(guild_object.id, response.value);
// 						} else {
// 							return resolve(response);
// 						}
// 					})
// 					.catch(error => { return resolve(error); });
// 				create_music_channel(current_guild, 'music-player', cat_channel, guild_object);
// 			})
// 			.catch(console.error);

// 		return resolve({
// 			result: true,
// 			value: message_help('commands', 'setup', 'setup has ran succesfully')
// 		});
// 	});
// };
