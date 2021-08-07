import { Message } from "discord.js";
import { regex_interpreter } from "../../libraries/guild.library";
import { create_rich_embed, max_string } from "../../libraries/help.library";
import { GuildPrtl } from "../../types/classes/GuildPrtl.class";
import { VoiceChannelPrtl } from "../../types/classes/VoiceChannelPrtl.class";
import { Field, ReturnPormise } from "../../types/classes/TypesPrtl.interface";

module.exports = async (
	message: Message, args: string[], guild_object: GuildPrtl
): Promise<ReturnPormise> => {
	return new Promise((resolve) => {
		if (!message.guild) {
			return resolve({
				result: true,
				value: 'guild could not be fetched'
			});
		}

		if (!message.member) {
			return resolve({
				result: true,
				value: 'member could not be fetched'
			});
		}

		const current_voice = message.member.voice;
		const current_voice_channel = current_voice.channel;

		let voice_object: VoiceChannelPrtl | null = null;

		if (current_voice_channel) {
			for (let i = 0; i < guild_object.portal_list.length; i++) {
				for (let j = 0; j < guild_object.portal_list[i].voice_list.length; j++) {
					if (guild_object.portal_list[i].voice_list[j].id === current_voice_channel.id) {
						voice_object = guild_object.portal_list[i].voice_list[j];
						break;
					}
				}
			}
		}

		message.channel.send({
			embeds: [
				create_rich_embed(
					'executing: ' + args.join(' '),
					args.join(' '),
					'#00ffb3',
					null,
					null,
					null,
					false,
					null,
					null,
					undefined,
					undefined
				)]
		}
		)
			.then(sent_message => {
				if (message.guild) {
					sent_message
						.edit({
							embeds: [
								create_rich_embed(
									'Text Interpreter',
									null,
									'#00ffb3',
									<Field[]>[{
										emote: 'input',
										role: max_string(
											`\`\`\`\n${args.join(' ')}\n\`\`\``,
											256
										),
										inline: false
									},
									{
										emote: 'output',
										role: max_string(
											`\`\`\`\n${regex_interpreter(
												args.join(' '),
												current_voice_channel,
												voice_object,
												guild_object.portal_list,
												guild_object,
												message.guild,
												message.author.id
											)}\n\`\`\``,
											256
										),
										inline: false
									}],
									null,
									null,
									false,
									null,
									null,
									undefined,
									undefined
								)]
						}
						)
						.catch(e => {
							return resolve({
								result: true,
								value: `failed to edit message / ${e}`
							});
						});
				} else {
					sent_message
						.edit('could not fetch guild of message')
						.catch(e => {
							return resolve({
								result: true,
								value: `failed to edit message / ${e}`
							});
						});
				}
			}
			)
			.catch(e => {
				return resolve({
					result: true,
					value: `failed to send message / ${e}`
				});
			});

		return resolve({
			result: true,
			value: ''
		});
	});
};
