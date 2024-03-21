import { TelegramBot } from "./engine/bot";
import { GenericMessage } from "./engine/entities";

const bot = new TelegramBot('6599650500:AAHcrNRNv3fhcke6JzsFsdaTLNMCyXCg2TA', '@wh4t3verbot', 'https://77cf-2a12-5940-70a8-00-8.ngrok-free.app');

bot.addCommandHandler('start', (bot: TelegramBot, message: GenericMessage) => {
    return [message, null];
})
bot.configWebhook();
bot.go();