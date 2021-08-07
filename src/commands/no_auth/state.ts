import { Client, Message } from "discord.js";
import { create_rich_embed } from "../../libraries/help.library";
import { GuildPrtl } from "../../types/classes/GuildPrtl.class";
import { Field, ReturnPormise } from "../../types/classes/TypesPrtl.interface";

module.exports = async (
    message: Message, args: string[], guild_object: GuildPrtl, client: Client
): Promise<ReturnPormise> => {
    return new Promise((resolve) => {
        const guild = client.guilds.cache
            .find(g => g.id === message?.guild?.id);

        if (!guild) {
            return resolve({
                result: false,
                value: 'could not fetch guild'
            });
        }

        let portal_state = [<Field>{
            emote: 'Portal Channels',
            role: '',
            inline: false
        }];

        const portals = guild_object.portal_list
            .map(p => {
                const portal_channel = guild.channels.cache
                    .find(c => c.id === p.id);

                const voices = p.voice_list
                    .map((v, index_v) => {
                        const voice_channel = guild.channels.cache
                            .find(c => c.id === v.id);

                        return `${index_v + 1}. ${voice_channel ? voice_channel.name : 'unavailable'}`;
                    })
                    .join('\n');

                return <Field>{
                    emote: `${portal_channel ? portal_channel.name : 'unavailable'}`,
                    role: `\`\`\`\n${voices ? voices : 'no voice'}\n\`\`\``,
                    inline: true
                }
            });

        if (portals) {
            portal_state = portal_state.concat(portals);
        }

        portal_state
            .push(<Field>{
                emote: '',
                role: '',
                inline: false
            });

        const music = guild.channels.cache.find(c =>
            c.id === guild_object.music_data.channel_id);

        if (music) {
            portal_state
                .push(<Field>{
                    emote: `Music channel`,
                    role: `\`\`\`\n${music ? music.name : 'unavailable'}\n\`\`\``,
                    inline: true
                });
        } else {
            portal_state
                .push(<Field>{
                    emote: `Music channel`,
                    role: `\`\`\`\nnone\n\`\`\``,
                    inline: true
                });
        }

        const announcement = guild.channels.cache.find(c =>
            c.id === guild_object.announcement);

        if (announcement) {
            portal_state
                .push(<Field>{
                    emote: 'Announcement channel',
                    role: `\`\`\`\n${announcement ? announcement.name : 'unavailable'}\n\`\`\``,
                    inline: true
                });
        } else {
            portal_state
                .push(<Field>{
                    emote: `Announcement channel`,
                    role: `\`\`\`\nnone\n\`\`\``,
                    inline: true
                });
        }

        portal_state
            .push(<Field>{
                emote: '',
                role: '',
                inline: false
            });

        const urls = guild_object.url_list.map((u_id, index_u) => {
            const channel = guild.channels.cache.find(c => c.id === u_id);
            return `${index_u + 1}. ${channel ? channel.name : 'unavailable'}`;
        });

        if (urls.length > 0) {
            const url_sum = <Field>{
                emote: `URL channels`,
                role: `\`\`\`\n${urls ? urls.join('\n') : 'unavailable'}\n\`\`\``,
                inline: true
            };

            portal_state = portal_state.concat(url_sum);
        } else {
            portal_state
                .push(<Field>{
                    emote: `URL channels`,
                    role: `\`\`\`\nnone\n\`\`\``,
                    inline: true
                });
        }

        const ignore = guild_object.ignore_list.map((u_id, index_u) => {
            const channel = guild.channels.cache.find(c => c.id === u_id);
            return `${index_u + 1}. ${channel ? channel.name : 'unavailable'}`;
        });

        if (ignore.length > 0) {
            const ignore_sum = <Field>{
                emote: `Ignored channels`,
                role: `\`\`\`\n${ignore ? ignore.join('\n') : 'unavailable'}\n\`\`\``,
                inline: true
            };

            portal_state = portal_state.concat(ignore_sum);
        } else {
            portal_state
                .push(<Field>{
                    emote: `Ignored channels`,
                    role: `\`\`\`\nnone\n\`\`\``,
                    inline: true
                });
        }

        message.channel
            .send({
                embeds: [
                    create_rich_embed(
                        'State of Portal',
                        null,
                        '#eba000',
                        portal_state,
                        null,
                        null,
                        true,
                        null,
                        null
                    )]
            }
            )
            .catch(e => {
                return resolve({
                    result: true,
                    value: `failed to send message / ${e}`
                });
            });

        return resolve({
            result: true,
            value: ''
        });
    });
};