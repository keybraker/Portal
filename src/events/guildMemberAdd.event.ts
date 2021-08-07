import { GuildMember, TextChannel } from "discord.js";
import { create_rich_embed } from "../libraries/help.library";
import { fetch_guild_announcement, insert_member } from "../libraries/mongo.library";

module.exports = async (
	args: { member: GuildMember }
): Promise<string> => {
	return new Promise((resolve, reject) => {
		if (!args.member.user.bot) {
			insert_member(args.member.guild.id, args.member.id)
				.then(r => {
					if (!r) {
						return reject(`failed to add member ${args.member.id} to ${args.member.guild.id}`);
					}

					fetch_guild_announcement(args.member.guild.id)
						.then(guild_object => {
							if (guild_object) {
								if (guild_object.initial_role && guild_object.initial_role !== 'null') {
									const initial_role = args.member.guild.roles.cache
										.find(r => r.id === guild_object.initial_role);

									if (initial_role) {
										try {
											args.member.roles
												.add(initial_role)
												.catch(e => {
													return reject(`failed to give role to member / ${e}`);
												});
										}
										catch (e) {
											return reject(`failed to give role to member / ${e}`);
										}
									}
								}

								const join_message = `member: ${args.member.presence.user}\n` +
									`id: ${args.member.guild.id}\n` +
									`\thas joined ${args.member.guild}`;

								const announcement_channel = <TextChannel>args.member.guild.channels.cache
									.find(channel => channel.id === guild_object.announcement);

								if (announcement_channel) {
									announcement_channel
										.send({
											embeds: [
												create_rich_embed(
													'member joined',
													join_message,
													'#00C70D',
													[],
													args.member.user.avatarURL(),
													null,
													true,
													null,
													null
												)]
										}
										)
										.then(() => {
											return resolve(`added member ${args.member.id} to ${args.member.guild.id}`);
										})
										.catch(e => {
											return reject(`failed to send join message / ${e}`);
										});

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
					return reject(`failed to add member ${args.member.id} to ${args.member.guild.id} / ${e}`);
				});
		} else {
			return resolve('new member is a bot, bots are not handled');
		}
	});
};