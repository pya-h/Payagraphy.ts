import axios from "axios";
import { GeneralMessage } from "./entities";
import { InlineKeyboard, Keyboard } from "./keyboards";
import { InvalidLanguageError, TelegramApiError } from "./errors";

/**
 * 
 * Main and the very base of a telegram bot; with no helper method
 *  or handler; Can be used to create bots without using handler funcionalities;
 * user state management, message and command check and all other stuffs are on developer. handle function has no use in this mode of bot development.
 * 
 * @param token - The bot token; The identifier and the connection handler of a bot. This is crucial for object maintenance.
 * @param username - The username of the bot; this is used as extra info.
 * @param hostUrl - The host url where the telegram webhook will be set to. this is used for extra info too.
 * @param mainKeyboard - This parameter is optional; If provided, On every message which the keyboard is not specified this keyboard will be used;
 * As the name explains, it serves as the main keyboard of the bot.
 * 
*/
class TelegramBotCore {

  protected _token: string;
  protected _username: string; // 
  protected _hostUrl: string;
  protected _mainKeyboard: Keyboard | { [key: string]: Keyboard };
  protected apiBaseUrl: string;

  constructor(
    token: string,
    username: string,
    hostUrl: string,
    mainKeyboard?: Keyboard | { [key: string]: Keyboard }
  ) {
    this._token = token;
    this.apiBaseUrl = `https://api.telegram.org/bot${this._token}`;
    this._hostUrl = hostUrl;
    this.username = username;
    this._mainKeyboard = mainKeyboard;
  }

  get token() {
    return this._token;
  }

  get username() {
    return this._username;
  }

  set username(newUsername: string) {
    this.username = newUsername[0] !== '@' ? newUsername : newUsername.slice(1);
  }

  get hostUrl() {
    return this.hostUrl;
  }

  // FIXME: Transfer these to the TelegramBot Class; they are not related to the core
  // TODO: _hostUrl, _username, _mainKeyboard variable and mainKeyboard method
  

  /**
        Get the keyboard that must be shown in most cases and on Start screen.
        @param userLanguage - if provided keyboard is language based, this param can be used to get the keybaord in specified language
            values must be the key specified for language names: such as 'en', 'fa', etc
    */
  mainKeyboard(userLanguage?: string): Keyboard {
    if (this._mainKeyboard instanceof Keyboard) return this._mainKeyboard;

    if (this._mainKeyboard instanceof Object)
      return (
        this._mainKeyboard[userLanguage] ?? this._mainKeyboard[Object.keys[0]]
      );
    throw new InvalidLanguageError();
  }

  /**
   * Send a message to the bot user by calling the corresponding telegram api.
   *
   * @param message - Just provide a payagraph GeneralMessage object and the message will be sent.
   *
   * @param keyboard [optional] - you can provide a Keyboard or InlineKeyboard alongside your message, so the message will have a keyboard menu with it.
   */
  async send(message: GeneralMessage, keyboard?: Keyboard | InlineKeyboard) {
    const url = `${this.apiBaseUrl}/sendMessage`;
    const payload = { chat_id: message.chatId, text: message.text };
    if (keyboard) keyboard.attachToTelegramPayload(payload); // of there is keyboard provided, attach it to payload object

    const { status, data } = await axios.post(url, JSON.stringify(payload));
    if (status !== 200)
      throw new TelegramApiError(url, status, data.text, message.chatId);
    return data;
  }

  /**
   * Edits a message, which was sent before.
   * @param modifiedMessage - message object that is editted and contains the messageId of the message which is being editted.
   *
   * @param keyboard [optional] - you can provide a InlineKeyboard alongside your message; this is mostly used when you have multiple inline keyboard menu,
   * and you want to change keyboard step by step.
   */
  async edit(modifiedMessage: GeneralMessage, keyboard: InlineKeyboard) {
    const url = `${this.apiBaseUrl}/editMessageText`;

    const payload = {
      chat_id: modifiedMessage.chatId,
      text: modifiedMessage.text,
      message_id: modifiedMessage.messageId,
    };
    if (keyboard) keyboard.attachToTelegramPayload(payload);

    const { status, data } = await axios.post(url, JSON.stringify(payload));
    if (status !== 200)
      throw new TelegramApiError(
        url,
        status,
        data.text,
        modifiedMessage.chatId,
        modifiedMessage.messageId
      );
    return data;
  }
}
