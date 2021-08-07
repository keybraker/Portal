import { Message } from "discord.js";
import { create_rich_embed, message_help } from "../../libraries/help.library";
import { GuildPrtl } from "../../types/classes/GuildPrtl.class";
import { MemberPrtl } from "../../types/classes/MemberPrtl.class";
import { Field, ReturnPormise } from "../../types/classes/TypesPrtl.interface";

function compare(
	member_a: MemberPrtl, member_b: MemberPrtl
) {
	return member_b.level === member_a.level
		? member_b.points > member_a.points
			? 1
			: -1
		: member_b.level > member_a.level
			? 1
			: -1;
}

module.exports = async (
	message: Message, args: string[], guild_object: GuildPrtl
): Promise<ReturnPormise> => {
	return new Promise((resolve) => {
		const member_list = guild_object.member_list;
		if (!member_list) {
			return resolve({
				result: false,
				value: 'server has no members'
			});
		}

		const requested_number = +args[0];
		if (args.length > 0 && isNaN(requested_number)) {
			return resolve({
				result: false,
				value: `${args[0]} is not a number`
			});
		}

		if (requested_number <= 0) {
			return resolve({
				result: false,
				value: `${args[0]} must be at least 1`
			});
		}

		let entries = member_list.length >= requested_number
			? requested_number > 25
				? 24
				: requested_number
			: member_list.length > 25
				? 24
				: member_list.length;

		if (entries <= 0) {
			return resolve({
				result: false,
				value: message_help('commands',
					'leaderboard',
					'leaderboard entries must be at least one'
				)
			});
		}

		if (guild_object.member_list) {
			const member_levels: Field[] = [];
			member_list
				.sort(compare)
				.forEach((member_object, i) => {
					if (message.guild && entries > i) {
						const this_member = message.guild.members.cache
							.find(member => member.id === member_object.id);

						if (this_member) {
							member_levels.push(
								{
									emote: `${i + 1}. ${this_member.displayName}`,
									role: `level ${member_object.level}\t|\tpoints: ${Math.round(member_object.points)}`,
									inline: false
								}
							);

							entries--;
						} else {
							resolve({
								result: false,
								value: 'a member has been stored incorrectly'
							});
						}
					}
				});

			message.channel
				.send({
					embeds: [
						create_rich_embed(
							'LEADERBOARD',
							'[Ranking System](https://portal-bot.xyz/docs/ranking)',
							'#00FFFF',
							member_levels,
							null,
							null,
							true,
							null,
							null
						)]
				}
				)
				.catch(e => {
					return resolve({
						result: false,
						value: `failed to send message / ${e}`
					});
				});

			return resolve({
				result: true,
				value: ''
			});
		}
		else {
			resolve({
				result: false,
				value: 'there are no members for this server'
			});
		}
	});
}