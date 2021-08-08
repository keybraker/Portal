import { Client, Message } from "discord.js";
import { client_talk, client_write } from "../../libraries/localisation.library";
import { GuildPrtl } from "../../types/classes/GuildPrtl.class";
import { ReturnPormise } from "../../types/classes/TypesPrtl.interface";
import { getVoiceConnection } from "@discordjs/voice";

module.exports = async (
	message: Message, args: string[], guild_object: GuildPrtl, client: Client
): Promise<ReturnPormise> => {
	return new Promise((resolve) => {
		const voiceConnection = getVoiceConnection(guild_object.id);

		if (voiceConnection) {
			client_talk(client, guild_object, 'leave');
			setTimeout(
				function () {
					voiceConnection.disconnect();
				},
				4000
			);
		} else {
			return resolve({
				result: false,
				value: 'Portal must be connected to a voice channel with you'
			});
		}

		return resolve({
			result: true,
			value: client_write(message, guild_object, 'leave')
		});
	});
};
