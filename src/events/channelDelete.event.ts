import { Channel, PartialDMChannel, TextChannel, VoiceChannel } from "discord.js";
import { PortalChannelTypes } from "../data/enums/PortalChannel.enum";
import { deleted_channel_sync } from "../libraries/mongo.library";

module.exports = async (
	args: { channel: Channel | PartialDMChannel }
): Promise<string> => {
	return new Promise((resolve, reject) => {
		if (args.channel.type !== 'GUILD_TEXT' && args.channel.type !== 'GUILD_VOICE') {
			return reject(`only voice and text channels are handled`);
		}

		const current_channel = (typeof args.channel === typeof VoiceChannel)
			? <VoiceChannel>args.channel
			: <TextChannel>args.channel;

		deleted_channel_sync(current_channel)
			.then(r => {
				if (r > 0) {
					return resolve(`${PortalChannelTypes[r].toString()} channel removed from ` +
						`${current_channel.guild.name}|${current_channel.guild.id}`);
				} else {
					return resolve(`${current_channel.name} channel is not controlled by Portal`);
				}
			})
			.catch(e => {
				return reject(`error syncing deleted channel from ` +
					`${current_channel.guild.name}|${current_channel.guild.id} / ${e}`);
			});
	});
};