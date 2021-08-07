import { Message, MessageEmbed, TextChannel } from "discord.js";
import { get_role } from "../../libraries/guild.library";
import { create_rich_embed, get_json, message_help } from "../../libraries/help.library";
import { insert_vendor } from "../../libraries/mongo.library";
import { GiveRole, GiveRolePrtl } from "../../types/classes/GiveRolePrtl.class";
import { GuildPrtl } from "../../types/classes/GuildPrtl.class";
import { Field, ReturnPormise } from "../../types/classes/TypesPrtl.interface";

function create_role_message(
	channel: TextChannel, guild_object: GuildPrtl, title: string, desc: string,
	colour: string, role_emb: Field[], role_map: GiveRole[]
): Promise<ReturnPormise> {
	return new Promise((resolve) => {
		const role_message_emb: MessageEmbed = create_rich_embed(
			title, desc, colour, role_emb, null, null, null, null, null
		);

		channel
			.send({ embeds: [role_message_emb] })
			.then(sent_message => {
				for (let i = 0; i < role_map.length; i++) {
					sent_message
						.react(role_map[i].emote)
						.catch((e: any) => {
							return resolve({
								result: false,
								value: `failed to react to message / ${e}`
							});
						});
				}

				insert_vendor(guild_object.id, new GiveRolePrtl(sent_message.id, role_map))
					.then(r => {
						return resolve({
							result: r,
							value: r
								? 'Keep in mind that Portal role must be over any role you wish it to be able to distribute.\n' +
								'In order to change it, please head to your servers settings and put Portal role above them'
								: 'failed to set new ranks'
						});
					})
					.catch(() => {
						return resolve({
							result: false,
							value: 'failed to set new ranks'
						});
					});
			})
			.catch(() => {
				return resolve({
					result: false,
					value: 'failed to create role assigner message'
				})
			});
	});
}

function multiple_same_emote(
	emote_map: GiveRole[]
) {
	for (let i = 0; i < emote_map.length; i++) {
		for (let j = i + 1; j < emote_map.length; j++) {
			if (emote_map[i].emote === emote_map[j].emote) {
				return true;
			}
		}
	}

	return false;
}

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
		if (args.length <= 0) {
			return resolve({
				result: false,
				value: message_help('commands', 'vendor')
			});
		}

		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const role_map_json = get_json(args.join(' '));

		if (!role_map_json) {
			return resolve({
				result: false,
				value: message_help('commands', 'vendor', 'must be an array in JSON format (even for one role)')
			});
		}

		const role_map = <GiveRole[]>role_map_json;
		if (!Array.isArray(role_map)) {
			return resolve({
				result: false,
				value: message_help('commands', 'vendor', 'must be an array in JSON format (even for one role)')
			});
		}
		if (multiple_same_emote(role_map)) {
			return resolve({
				result: false,
				value: message_help('commands', 'vendor', 'can not have the same emote for multiple actions')
			});
		}
		if (!role_map.every(rm => rm.emote && rm.role)) {
			return resolve({
				result: false,
				value: message_help('commands', 'vendor', 'JSON syntax has spelling errors')
			});
		}

		role_map
			.forEach(r => {
				r.emote = r.emote.trim();
				r.role.forEach(role => role.trim());
			});

		const role_emb_display: Field[] = [];

		let return_value = '';
		// give roles
		const failed = role_map
			.some(r => {
				if (message.guild) {
					const role_fetched = r.role.map(role => get_role(message.guild, role));

					if (role_fetched.some(role => !role)) {
						return_value = `some of the given roles do not exist`;
						return true;
					}

					role_emb_display.push(
						new Field(
							r.emote,
							`\`\`\`${role_fetched.map(role =>
								`@${role ? role.name : 'undefined'}`).join(', ')}\`\`\``,
							true
						)
					);
				} else {
					return_value = `could not fetch guild of message`;
					return true;
				}
			});

		if (failed) {
			return resolve({
				result: false,
				value: return_value
			});
		}

		create_role_message(
			<TextChannel>message.channel,
			guild_object,
			'Role Assigner',
			'React with emote to get or remove mentioned role',
			'#FF7F00',
			role_emb_display,
			role_map
		)
			.then(r => {
				return resolve(r);
			})
			.catch(e => {
				return resolve({
					result: false,
					value: `an error occurred while creating role message / ${e}`
				})
			});
	});
}
