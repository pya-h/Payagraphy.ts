import { TelegramBot } from "./engine/bot";
import { GenericMessage, TextMessage } from "./engine/entities";

const bot = new TelegramBot('token', '@botusername', 'host url');
let i = 0;
bot.prepareNewParallelJob(90, async(bot: TelegramBot) => {
    const msg = new TextMessage(-1002073799554, `job test #${i++}`);
    await bot.send(msg);
}, bot);

bot.startClock();
bot.addCommandHandler('start', (bot: TelegramBot, message: GenericMessage) => {
    return [message, null];
})
bot.configWebhook();

bot.go();