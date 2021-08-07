import { Message } from "discord.js";
import { ask_for_approval, is_mod, message_help } from "../../libraries/help.library";
import { kick } from "../../libraries/user.library";
import { ReturnPormise } from "../../types/classes/TypesPrtl.interface";


module.exports = async (
	message: Message, args: string[]
): Promise<ReturnPormise> => {
	return new Promise((resolve) => {
		if (!message.member) {
			return resolve({
				result: false,
				value: 'message author could not be fetched'
			});
		}

		if (!is_mod(message.member)) {
			return resolve({
				result: false,
				value: `you must be a Portal moderator to ban users`
			});
		}

		if (!message.guild) {
			return resolve({
				result: false,
				value: `user guild could not be fetched`
			});
		}

		let kick_reason = args
			.join(' ')
			.substr(args.join(' ').indexOf('|') + 1)
			.replace(/\s/g, ' ')
			.trim();

		if (kick_reason === '') {
			kick_reason = 'kicked by admin'
		}

		if (message.mentions && message.mentions.members) {
			if (message.mentions.members.size === 0) {
				return resolve({
					result: false,
					value: message_help('commands', 'kick', `you must tag a member`)
				});
			}

			const member_to_kick = message.mentions.members.first() || message.guild.members.cache.get(args[0]);

			if (member_to_kick) {
				if (message.member === member_to_kick) {
					return resolve({
						result: false,
						value: message_help('commands', 'kick', `you can't kick on yourself`)
					});
				}

				ask_for_approval(
					message,
					message.member,
					`*${message.member}, are you sure you want to kick ` +
					`user ${member_to_kick}*, do you **(yes / no)** ?`
				)
					.then(result => {
						if (result) {
							kick(member_to_kick, kick_reason)
								.then(r => {
									return resolve({
										result: r,
										value: r
											? `${member_to_kick} has been kicked by ${message.author} ` +
											`because: *${kick_reason}*`
											: `${member_to_kick} is not kickable`
									});
								})
								.catch(e => {
									return resolve({
										result: false,
										value: `failed to kick member ${member_to_kick}, ` +
											`Portal's role must be higher than member you want to kick / ${e}`
									});
								});
						} else {
							return resolve({
								result: false,
								value: `user ${member_to_kick} will not be kicked`
							});
						}
					})
					.catch(e => {
						return resolve({
							result: false,
							value: `failed to kick / ${e}`
						});
					});
			}
			else {
				return resolve({
					result: false,
					value: `could not find member`
				});
			}

		} else {
			return resolve({
				result: false,
				value: `no user mentioned to kick`
			});
		}
	});
};

