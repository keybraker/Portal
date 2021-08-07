import { GuildMember, TextChannel } from "discord.js";
import { create_rich_embed } from "../libraries/help.library";
import { fetch_guild_announcement, remove_member } from "../libraries/mongo.library";

module.exports = async (
	args: { member: GuildMember }
): Promise<string> => {
	return new Promise((resolve, reject) => {
		if (!args.member.user.bot) {
			remove_member(args.member.id, args.member.guild.id)
				.then(r => {
					if (!r) {
						return reject(`failed to remove member ${args.member.id} to ${args.member.guild.id}`);
					}

					fetch_guild_announcement(args.member.guild.id)
						.then(guild_object => {
							if (guild_object) {
								const leave_message = `member: ${args.member.presence.user}\n` +
									`id: ${args.member.guild.id}\n` +
									`\thas left ${args.member.guild}`;

								if (guild_object) {
									const announcement_channel = <TextChannel>args.member.guild.channels.cache
										.find(channel => channel.id === guild_object.announcement)

									if (announcement_channel) {
										announcement_channel
											.send({
												embeds: [
													create_rich_embed(
														'member left',
														leave_message,
														'#FC0303',
														[],
														args.member.user.avatarURL(),
														null,
														true,
														null,
														null
													)]
											}
											)
											.catch(e => {
												return reject(`failed to send message / ${e}`);
											});
									}
								} else {
									return resolve(`no announcement channel, it has been deleted`);
								}
							} else {
								return resolve(`no announcement channel in database`);
							}
						})
						.catch(e => {
							return reject(`failed to get announcement channel in database / ${e}`);
						});
				})
				.catch(e => {
					return reject(`failed to remove member ${args.member.id} to ${args.member.guild.id} / ${e}`);
				});
		} else {
			return resolve('left member is a bot, bots are not handled');
		}
	});
};
