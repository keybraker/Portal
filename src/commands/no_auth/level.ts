import { Message } from "discord.js";
import { create_rich_embed } from "../../libraries/help.library";
import { GuildPrtl } from "../../types/classes/GuildPrtl.class";
import { ReturnPormise } from "../../types/classes/TypesPrtl.interface";

module.exports = async (
	message: Message, args: string[], guild_object: GuildPrtl
): Promise<ReturnPormise> => {
	return new Promise((resolve) => {
		const member_object = guild_object.member_list.find(m => m.id === message.member?.id);
		if (!member_object) {
			return resolve({
				result: true,
				value: 'could not find member'
			});
		}

		message.channel
			.send({
				embeds: [
					create_rich_embed(
						null,
						null,
						'#00FFFF',
						[
							{ emote: 'Level', role: `${member_object.level}`, inline: true },
							{ emote: 'Points', role: `${Math.round(member_object.points)}`, inline: true },
							// { emote: '', role: '', inline: false },
							// { emote: 'Rank', role: `${member_object.rank}`, inline: true },
							{ emote: 'Tier', role: `${member_object.tier}`, inline: true },
						],
						null,
						message.member,
						true,
						null,
						null
					)]
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