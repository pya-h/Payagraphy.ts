import { TelegramBot } from "./engine/bot";
import { GenericMessage } from "./engine/entities";

const bot = new TelegramBot('6821919435:AAFB8h1oFiAXn8hxHRimv3mNhmJMlKk_6JU', '@temp_the_next_bot', 'https://0154-65-109-211-162.ngrok-free.app');

bot.addCommandHandler('start', (bot: TelegramBot, message: GenericMessage) => {
    return [message, null];
})
bot.configWebhook();
bot.go();