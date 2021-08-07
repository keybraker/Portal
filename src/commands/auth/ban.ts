import { BanOptions, Message } from "discord.js";
import { ask_for_approval, is_mod, message_help } from "../../libraries/help.library";
import { ban } from "../../libraries/user.library";
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

		let ban_reason = args
			.join(' ')
			.substring(args.join(' ').indexOf('|') + 1, args.join(' ').lastIndexOf('|') - 1)
			.replace(/\s/g, ' ')
			.trim();

		if (ban_reason === '') {
			ban_reason = 'banned by admin'
		}

		let ban_days = +args
			.join(' ')
			.substring(args.join(' ').lastIndexOf('|') + 1)
			.replace(/\s/g, ' ');

		if (isNaN(ban_days)) {
			ban_days = 1;
		}

		if (message.mentions && message.mentions.members) {
			if (message.mentions.members.size === 0) {
				return resolve({
					result: false,
					value: message_help('commands', 'ban', `you must tag a member`)
				});
			}

			const member_to_ban = message.mentions.members.first() || message.guild.members.cache.get(args[0]);

			if (member_to_ban) {
				if (message.member === member_to_ban) {
					return resolve({
						result: false,
						value: message_help('commands', 'ban', `you can't ban on yourself`)
					});
				}

				ask_for_approval(
					message,
					message.member,
					`*${message.member}, are you sure you want to ban ` +
					`member ${member_to_ban}*, do you **(yes / no)** ? reason : ${ban_reason}`
				)
					.then(result => {
						if (result) {
							const ban_options: BanOptions = {
								days: ban_days,
								reason: ban_reason
							};

							ban(member_to_ban, ban_options)
								.then(r => {
									return resolve({
										result: r,
										value: r
											? `${member_to_ban} has been banned by ${message.author} ` +
											`for ${ban_days} ${ban_days > 1 ? 'days' : 'day'}, because: *${ban_reason}*`
											: `${member_to_ban} is not bannable`
									});
								})
								.catch(e => {
									return resolve({
										result: false,
										value: `failed to ban member ${member_to_ban}\n` +
											`Portal's role must be higher than member you want to ban / ${e}`
									});
								});
						} else {
							return resolve({
								result: false,
								value: `user ${member_to_ban} will not be banned`
							});
						}
					})
					.catch(e => {
						return resolve({
							result: false,
							value: `failed to ban / ${e}`
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
				value: `no user mentioned to ban`
			});
		}
	});
};

