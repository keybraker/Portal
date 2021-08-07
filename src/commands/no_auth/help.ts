import { Message, MessageEmbed } from "discord.js";
import { create_rich_embed, message_help } from "../../libraries/help.library";
import { Field, ReturnPormise } from "../../types/classes/TypesPrtl.interface";
import { get_attribute_guide, get_attribute_help, get_attribute_help_super } from "../../types/interfaces/Attribute.interface";
import { get_command_guide, get_command_help, get_command_help_super } from "../../types/interfaces/Command.interface";
import { get_pipe_guide, get_pipe_help, get_pipe_help_super } from "../../types/interfaces/Pipe.interface";
import { get_structure_guide, get_structure_help, get_structure_help_super } from "../../types/interfaces/Structure.interface";
import { get_variable_guide, get_variable_help, get_variable_help_super } from "../../types/interfaces/Variable.interface";

module.exports = async (
	message: Message, args: string[]
): Promise<ReturnPormise> => {
	return new Promise((resolve) => {
		if (args.length === 0) {
			const help_array: Field[] = [
				{
					emote: null,
					role: '**[Commands](https://portal-bot.xyz/docs/commands/description)**',
					inline: false
				},
				{
					emote: '`./help commands` or `./help commands guide`',
					role: 'Commands are mini programs you can use to get a response or action\n',
					inline: false
				},
				{
					emote: null,
					role: '**[Text Interpreter](https://portal-bot.xyz/docs/interpreter/description)**',
					inline: false
				},
				{
					emote: '`./help variables` or `./help variables guide`',
					role: 'Variables are live data about the current state of things\n' +
						'_for more click [here](https://portal-bot.xyz/docs/interpreter/objects/variables/description)_',
					inline: false
				},
				{
					emote: '`./help pipes` or `./help pipes guide`',
					role: 'Pipes are mini-programs that manipulate text or even variables and attributes\n' +
						'_for more click [here](https://portal-bot.xyz/docs/interpreter/objects/pipes/description)_',
					inline: false
				},
				{
					emote: '`./help attributes` or `./help attributes guide`',
					role: 'Attributes are options that can be altered with **[set](https://portal-bot.xyz/docs/commands/detailed/set)** command\n' +
						'_for more click [here](https://portal-bot.xyz/docs/interpreter/objects/attributes/description)_',
					inline: false
				},
				{
					emote: '`./help structures` or `./help structures guide`',
					role: 'Structures are rules to further manipulate the text outcome\n' +
						'_for more click [here](https://portal-bot.xyz/docs/interpreter/objects/structures/description)_',
					inline: false
				},
				{
					emote: null,
					role: 'Specific help',
					inline: false
				},
				{
					emote: '`./help <specific_property_name>`',
					role: 'If you want to get a complete description of any property\n' +
						'_(lets say you want to learn more about variables year, just type **./help year**)_',
					inline: false
				},
				{
					emote: null,
					role: '**[FAQ](https://portal-bot.xyz/help#faq)** _frequently asked questioned_',
					inline: false
				}
			];

			message
				.reply({
					embeds: [
						create_rich_embed(
							'Help Card',
							'Detailed documentation at [portal-bot.xyz/docs](https://portal-bot.xyz/docs)\n\n' +
							'> make a member an **admin**, give role `p.admin`\n' +
							'> make a member an **moderator**, give role `p.mod`\n' +
							'> make a member a **dj**, give role `p.dj`\n' +
							'> to **whitelist** a member, give role `p.mod`\n' +
							'> to **ignore** a member, give role `p.ignore`\n' +
							'> for more click [here](https://portal-bot.xyz/help#q-how-can-i-give-members-authority)',
							'#05d1ff',
							help_array,
							null,
							null,
							true,
							null,
							null
						)]
				})
				.then(() => {
					return resolve({
						result: true,
						value: ''
					});
				})
				.catch(e => {
					return resolve({
						result: false,
						value: `failed to send message / ${e}`
					});
				});
		}
		else if (args.length === 2 && args[1] === 'guide') {
			let guide: MessageEmbed | null = null;

			switch (args[0]) {
				case 'commands':
					guide = get_command_guide();
					break;
				case 'variables':
					guide = get_variable_guide();
					break;
				case 'pipes':
					guide = get_pipe_guide();
					break;
				case 'attributes':
					guide = get_attribute_guide();
					break;
				case 'structures':
					guide = get_structure_guide();
					break;
			}

			if (guide) {
				message.author
					.send({ embeds: [guide] })
					.then(() => {
						return resolve({
							result: true,
							value: ''
						});
					})
					.catch(e => {
						return resolve({
							result: false,
							value: `failed to send message / ${e}`
						});
					});
			} else {
				return resolve({
					result: false,
					value: message_help('commands', 'help', `*${args[0]} ${args[1]}* does not exist in portal`)
				});
			}
		}
		else if (args.length === 1) {
			let embed_array: MessageEmbed[] | null = null;

			switch (args[0]) {
				case 'commands':
					embed_array = get_command_help();
					break;
				case 'variables':
					embed_array = get_variable_help();
					break;
				case 'pipes':
					embed_array = get_pipe_help();
					break;
				case 'attributes':
					embed_array = get_attribute_help();
					break;
				case 'structures':
					embed_array = get_structure_help();
					break;
			}

			if (embed_array) {
				embed_array
					.forEach(embed => {
						message.author
							.send({ embeds: [embed] })
							.then(() => {
								return resolve({
									result: true,
									value: ''
								});
							})
							.catch(e => {
								return resolve({
									result: false,
									value: `failed to send message / ${e}`
								});
							})
					});
			} else {
				let detailed: boolean | MessageEmbed = false;

				detailed = get_command_help_super(args[0]);

				if (!detailed) {
					detailed = get_variable_help_super(args[0]);
					if (!detailed) {
						detailed = get_pipe_help_super(args[0]);
						if (!detailed) {
							detailed = get_attribute_help_super(args[0]);
							if (!detailed) {
								detailed = get_structure_help_super(args[0]);
								if (!detailed) {
									return resolve({
										result: false,
										value: message_help('commands', 'help', `*${args[0]}* does not exist in portal`)
									});
								}
							}
						}
					}
				}

				if (detailed && typeof detailed !== 'boolean') {
					message.author
						.send({ embeds: [detailed] })
						.then(() => {
							return resolve({
								result: true,
								value: ''
							});
						})
						.catch(e => {
							return resolve({
								result: false,
								value: `failed to send message / ${e}`
							});
						});
				} else {
					return resolve({
						result: false,
						value: message_help('commands', 'help', `*${args[0]} ${args[1]}* does not exist in portal`)
					});
				}
			}
		} else {
			return resolve({
				result: false,
				value: message_help('commands', 'help')
			});
		}
	});
};