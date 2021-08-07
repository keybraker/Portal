import { CreateInviteOptions, Message, TextChannel } from "discord.js";
import { get_json, is_mod, message_help } from "../../libraries/help.library";
import { ReturnPormise } from "../../types/classes/TypesPrtl.interface";

module.exports = async (
	message: Message, args: string[]
): Promise<ReturnPormise> => {
	return new Promise((resolve) => {
		if (!message.guild) {
			return resolve({
				result: false,
				value: 'guild could not be fetched'
			});
		}

		if (!message.member) {
			return resolve({
				result: false,
				value: 'member could not be fetched'
			});
		}

		if (!is_mod(message.member)) {
			return resolve({
				result: false,
				value: `you must be a Portal moderator to ban users`
			});
		}
		
		if (args.length <= 0) {
			return resolve({
				result: false,
				value: message_help('commands', 'invite')
			});
		}

		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const invite_options_json = get_json(args.join(' '));

		if (!invite_options_json) {
			return resolve({
				result: false,
				value: message_help('commands', 'invite', 'must be in JSON format')
			});
		}

		const invite_options = <CreateInviteOptions>invite_options_json;
		if (!(invite_options.temporary || invite_options.maxAge || invite_options.maxUses &&
			invite_options.unique || invite_options.reason)) {
			return resolve({
				result: false,
				value: message_help('commands', 'invite', 'JSON syntax has spelling errors')
			});
		}

		(<TextChannel>message.channel)
			.createInvite(invite_options)
			.then(invite => {
				message
					.member
					?.send(`https://discord.gg/${invite.code}`)
					.then(() => {
						return resolve({
							result: true,
							value: 'I sent you an invite as a private message'
						});
					})
					.catch(() => {
						return resolve({
							result: false,
							value: 'failed to remove ignore channel'
						});
					});
			})
			.catch(e => {
				return resolve({
					result: false,
					value: `failed to remove ignore channel / ${e}`
				});
			});
	});
};
