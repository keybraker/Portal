import { Client, Message } from "discord.js";
import { create_rich_embed } from "../../libraries/help.library";
import { GuildPrtl } from "../../types/classes/GuildPrtl.class";
import { ReturnPormise } from "../../types/classes/TypesPrtl.interface";
import spam_config from "../../config.spam.json";

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

        const rules = `**Duplicate spam warning after ${spam_config.dupl_after}.**\n` +
            `**Spam warning after ${spam_config.warn_after}.**\n` +
            `**Mute after ${spam_config.mute_after} ${spam_config.mute_after === 1 ? `warning` : `warnings`} ` +
            `for ${spam_config.mute_period} ${spam_config.mute_period === 1 ? `minute` : `minutes`}.**\n\n` +
            `${guild_object.kick_after && guild_object.kick_after > 0
                ? `***Member kicked after ${guild_object.kick_after} ${spam_config.mute_after === 1 ? `penalty` : `penalties`}.***\n`
                : `***Automatic kick has not been set yet.***\n`
            }` +
            `${guild_object.ban_after && guild_object.ban_after > 0
                ? `***Member banned after ${guild_object.ban_after} ${spam_config.mute_after === 1 ? `penalty` : `penalties`}.***`
                : `***Automatic ban has not been set yet.***`
            }`
            ;

        message.channel
            .send({
                embeds: [
                    create_rich_embed(
                        'Spam Rules',
                        rules,
                        '#006996',
                        null,
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