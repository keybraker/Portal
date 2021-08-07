import { Message, VoiceChannel } from "discord.js";
import { PortalChannelTypes } from "../../data/enums/PortalChannel.enum";
import { delete_channel, included_in_voice_list, regex_interpreter } from "../../libraries/guild.library";
import { message_help } from "../../libraries/help.library";
import { update_voice } from "../../libraries/mongo.library";
import { GuildPrtl } from "../../types/classes/GuildPrtl.class";
import { ReturnPormise } from "../../types/classes/TypesPrtl.interface";

// NEEDS FIXING
module.exports = async (
	message: Message, args: string[], guild_object: GuildPrtl
): Promise<ReturnPormise> => {
	return new Promise((resolve) => {
		if (!message.member) {
			return resolve({
				result: false,
				value: 'member could not be fetched'
			});
		}

		if (!message.member.voice.channel) {
			return resolve({
				result: false,
				value: message_help('commands', 'force', 'you must be in a channel handled by Portal')
			});
		}

		if (!included_in_voice_list(message.member.voice.channel.id, guild_object.portal_list)) {
			return resolve({
				result: false,
				value: message_help('commands', 'force', 'the channel you are in is not handled by Portal')
			});
		}

		if (message.member.voice.channel.members.size > 10) {
			return resolve({
				result: false,
				value: message_help('commands', 'force', 'you can only force a channel with up-to 10 members')
			});
		}

		const current_member = message.member;
		const current_voice = <VoiceChannel>message.member.voice.channel;

		guild_object.portal_list.some(p => {
			return p.voice_list.some(v => {
				if (v.id === current_voice.id) {
					if (v.creator_id === current_member.id) {
						if (message.guild) {
							const updated_name = regex_interpreter(
								v.regex,
								current_voice,
								v,
								guild_object.portal_list,
								guild_object,
								message.guild,
								message.author.id
							);

							current_voice.clone({ name: updated_name })
								.then(clone => {
									if (current_voice) {
										current_voice.members.forEach(member => {
											if (member.voice) {
												member.voice.setChannel(clone, 'portal force update')
													.catch((e: any) => {
														return resolve({
															result: false,
															value: `failed to se messages channel / ${e}`
														});
													});
											}
										});

										update_voice(guild_object.id, p.id, current_voice.id, 'id', clone.id)
											.then(r => {
												delete_channel(PortalChannelTypes.voice, current_voice, message, true)
													.catch((e: any) => {
														return resolve({
															result: false,
															value: `failed to delete channel / ${e}`
														});
													});

												return resolve({
													result: r,
													value: r
														? 'force updated voice'
														: 'failed to force update'
												});
											})
											.catch(e => {
												return resolve({
													result: false,
													value: `failed to force update channel / ${e}`
												});
											});
									}
								})
								.catch(e => {
									return resolve({
										result: false,
										value: `error while cloning channel / ${e}`
									});
								});
						} else {
							return resolve({
								result: false,
								value: 'could not fetch message\'s guild'
							});
						}
					} else {
						return resolve({
							result: false,
							value: 'you are not the creator of the channel'
						});
					}
				}
			});
		});
	});
};
