import { Client, Message } from "discord.js";
import { create_rich_embed } from "../../libraries/help.library";
import { GuildPrtl } from "../../types/classes/GuildPrtl.class";
import { ReturnPormise } from "../../types/classes/TypesPrtl.interface";

module.exports = async (
	message: Message, args: string[], guild_object: GuildPrtl, client: Client
): Promise<ReturnPormise> => {
	return new Promise((resolve) => {
		message.channel
			.send({
				embeds: [
					create_rich_embed(
						null,
						null,
						'#0093ff',
						null,
						null,
						null,
						false,
						null,
						null,
						undefined,
						{
							name: `Request sent`,
							icon: 'https://raw.githubusercontent.com/keybraker/Portal/master/src/assets/img/ping.gif'
						}
					)]
			}
			)
			.then((message_sent: Message) => {
				message_sent
					.edit({
						embeds: [
							create_rich_embed(
								null,
								null,
								'#0093ff',
								null,
								null,
								null,
								false,
								null,
								null,
								undefined,
								{
									name: `RTT latency\t${message_sent.createdTimestamp - message.createdTimestamp} ms\n` +
										`Portal latency\t${client.ws.ping} ms`,
									icon: 'https://raw.githubusercontent.com/keybraker/Portal/master/src/assets/img/ping.gif'
								}
							)]
					}
					)
					.then(() => {
						return resolve({
							result: true,
							value: ''
						})
					})
					.catch(e => {
						return resolve({
							result: false,
							value: `error while editing pong message / ${e}`
						})
					});
			})
			.catch(e => {
				return resolve({
					result: false,
					value: `error while sending pong message / ${e}`
				})
			});
	});
};