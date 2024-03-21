import axios from "axios";
import { GenericMessage, TelegramCallbackQuery, TextMessage } from "./entities";
import { InlineKeyboard, Keyboard, Keyboard } from "./keyboards";
import { ExistingItemError, InvalidArgumentError, InvalidLanguageError, NoSuchTextResourceError, TelegramApiError } from "./errors";
import { ParallelJob, Planner, minutesToTimestamp } from "./tools";
import { User, UserState } from "./models/user";

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
export class TelegramBotCore {
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
        this.username =
            newUsername[0] !== "@" ? newUsername : newUsername.slice(1);
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
                this._mainKeyboard[userLanguage] ??
                this._mainKeyboard[Object.keys[0]]
            );
        throw new InvalidLanguageError();
    }

    /**
     * Send a message to the bot user by calling the corresponding telegram api.
     *
     * @param message - Just provide a payagraph GenericMessage object and the message will be sent.
     *
     * @param keyboard [optional] - you can provide a Keyboard or InlineKeyboard alongside your message, so the message will have a keyboard menu with it.
     */
    async send(message: GenericMessage, keyboard?: Keyboard | InlineKeyboard) {
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
    async edit(modifiedMessage: GenericMessage, keyboard: InlineKeyboard) {
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



/**
 *
 * This is a simple enum, indicating the state of the user is currently inm while using the bot
 * This state is useful while implementing multi-step inputs.
 * Also this enum is used for state handler in the bot. By each specific State you have defined in your custom enum extending from this, you can define a method,
 * That will handle that state.
 */


type GenericHandler = (bot: TelegramBotCore, message: GenericMessage) => [response: GenericMessage, markup: Keyboard];
type CallbackQueryHandler = (bot: TelegramBotCore, message: TelegramCallbackQuery) => [response: GenericMessage, markup: Keyboard];
type GenericMiddleware = (bot: TelegramBotCore, message: GenericMessage) => boolean;
type GenericModdifier = (message: GenericMessage) => GenericMessage;

/**
 *
 * This is the Payagraph edition of the TelegramBot class. The more Customizable and smart part of the payahraph TelegramBot; 
 * This object will allow to add handlers that are used by TelegramBotCore.handle function and by calling .handle function make the bot to handle user messages automatically, of sorts.
 * It has multiple features such as: 
 * Organized command handler and Organized message handler in multiple languages (defined by devs).
 * Organized callback query handlers; categorized by callback action
 * Message middlewares: Methods that will run before every user message sent to bot, and it they all return true, the normal procedure of the bot continues,
 *  This is used for channel membership check, Vip membership check, and such cases.
 * Reponse Middlewares: Methods that will run before this bot attemts to send answer to user
 * Telegram Jobs: Methods and procedures that will run with specific intervals.
 * @param token - The bot token; The identifier and the connection handler of a bot. This is crucial for object maintenance.
 * @param username - The username of the bot; this is used as extra info.
 * @param hostUrl - The host url where the telegram webhook will be set to. this is used for extra info too.
 * @param mainKeyboard - This parameter is optional; If provided, On every message which the keyboard is not specified this keyboard will be used;
 * As the name explains, it serves as the main keyboard of the bot.
 * @param textResources - This is the text reource repository, where our bot tries to read messages and send to user; This is the preferred way of sending message,
 * That allows devs to define their messages in different languages, and the bot will choose the key-specified message from this repo, according to each user language.
 */
export class TelegramBot extends TelegramBotCore {
    protected textResources: {[key:string]: any}
    protected middlewares: GenericMiddleware[] = [];
    protected stateHandlers: {[state: UserState]: GenericHandler} = {};
    protected commandHandlers: {[command?: string]: GenericHandler} = {};
    protected messageHandlers: {[message?: string | number]: GenericHandler} = {};
    protected callbackQueryHandlers: {[action: string | number]: CallbackQueryHandler} = {};
    protected responseModdifiers: GenericModdifier[] = []; // moddifies a message before sending to user, a basic example is signing each message before sending
    protected parallels: ParallelJob[] = [];
    // protected app: //express app
    protected clock: Planner;

    constructor(token: string, username?: string, hostUrl?: string, textResources?: {[key:string]: any}, mainKeyboard?: {[key: string]: Keyboard} | Keyboard) {

      super(token, username, hostUrl, mainKeyboard)
      this.textResources = textResources;

      ### Flask App configs ###
      this.app: Flask = Flask(__name__)

    }

    configWebhook(webhookPath = '/') {
        // @this.app.route(webhookPath, methods=['POST'])
        // def main()
        //     this.handle(request.json)
        //     return jsonify({'status': 'ok'})
    }
        
    go(debug=true) {
        // this.app.run(debug=debug)
    }

    
    /**
        Start the clock and handle(/run if needed) parallel jobs.
        As parallel jobs are optional, the clock is not running from start of the bot. it starts by direct demand of developer or user.
    */
    startClock() {
        this.clock = new Planner(1.0, this.ticktock)
        this.clock.start()
    }

    /**
        Stop bot clock and all parallel jobs.
    */
    stopClock() {
        this.clock.stop()
    }
    /**
        Runs every 1 minutes, and checks if there's any parallel jobs and is it time to perform them by interval or not.
    */
    ticktock() {
        const now = Date.now();
        for(const job of this.parallels)
            if(job.shouldRun())
                job.do();
    }

    /**
     * Bot being awake time, if the clock has not been stopped ofcourse
     * @param this 
     * @returns string: the string indicating the uptime
     */
    getUptime(this): string {
        if(!this.clock || !(this.clock instanceof Planner))
            throw new Error('This method must be run after starting the bot clock!');
        return `The bot's uptime is: ${minutesToTimestamp(this.clock.minutesRunning())}`;
    }

    getTelegramLink(this): string {
        return `https://t.me/${this.username}`
    }

    /**
     * resource function: get an specific text from the texts_resources json loaded into bot object
     * @param textKey - the key of the desired text (specified in json.)
     * @param [language='fa'] 
     */

    text(textKey: string, language: string = 'fa'): string {
        try {
            return this.textResources[textKey][language]
        }
        catch(ex) {
            console.error(ex)
        }
        throw new NoSuchTextResourceError(textKey);
    }

    /**
     * resource function: get an specific keyword(words that when sent to the bot will run a special function) from the texts resources json loaded into bot object
     * @param keywordName - the name of the keyword specified in json file.
     * @param language - user language
     */
    keyword(keywordName: string, language?: string): {[key: string]: string}|string {
        try {
            const keywords = this.textResources['keywords'];
            return !language ? keywords[keywordName] : keywords[keywordName][language]
        }
        catch(ex) {
            console.error(ex);
        }
        return null;
    }

    /**
     * 
     * @param command - return a specific command defined in json text resource file.
     * @returns string - the command text that was expected
     */
    cmd(command: string):string {
        try {

            return this.textResources['commands'][command]    
        }
        catch(ex) {
            console.error(ex);
        }
        return null;
    }
    
    
    /**
     * Add a handler for special states of user. Depending on the appliance and structure of the bot,
     *  it must have its own UserStates enum, that you must add handler for each value of the enum.
     * States are useful when getting multiple inputs for a model, or when special actions must be taken other than normal handlers
     * @param state - The state which will call this handler
     * @param handler - The operation that must be done when the user have this state
     */
    addStateHandler(state: UserState|number, handler: GenericHandler) {
        this.stateHandlers[state] = handler;
    }

    /**
     * Add message handlers; Provide specific messages in your desired languages (as dict) to call their provided handlers when that message is sent by user.
     * @param message - The string which when a user sends will trigger the handler. If a list of strings is passed, then the handler will be matched to each item in that list
     * message can also be a js object, as 'language_key': 'text', which will link the handler to that text in different languages.
     * It also can be null or undefined, which in this case this will be the default handler when the user input doesnt match any of message or command handlers so far.
     * if your bot has multiple languages then notice that your language keys must match with these keys in message
     * @param handler - obvious!
     */
    addMessageHandler(message?: string | string[] | {[lang: string]: string}, handler: GenericHandler) {
        if(!message || typeof message === 'string' || typeof message === 'number')
            this.messageHandlers[message.toString()] = handler;
        else {
            for(const k of Object.keys(message))
                this.messageHandlers[message[k]] = handler;
        }
    }

    /**
     * Add a Handler for a message starting with forthslash(/), so if the user sends that command, this handler will run.
     * @param command - a string or array of string which will trigger a handler when its sent by user to the bot.
     * @param handler - Obvious!
     */
    addCommandHandler(command?: string | number | number[] | string[], handler: GenericHandler) {
        if(typeof command === 'string' || typeof command === 'number')
            this.commandHandlers[command[0] !== '/' ? `/${command}` : command] = handler
        else if(command instanceof Array)
            for(let i = 0; i < command.length; i++)
                this.commandHandlers[command[i][0] !== '/' ? `/${command[i]}` : command[i]] = handler;
        else if(!command)
            this.commandHandlers[0] = handler;
        throw new InvalidArgumentError();
    }

    /**
     * 
     * @param action - In this archutecture, each group of inline keyboard markups, are classified with an action value; for example for an inline menu for getting the user age,
     * developer can create an inline group with an action value of 'setAge'; Each action group will return a value too. for example in setAge action, each value will be the age 
     * specified in button text.
     * @param handler - CallbackQueryHandler; This handler a liitle different from other handlers, as it's a CallbackQueryHandler; It will receive a CallbackQuery object.
     */
    addCallbackQueryHandler(action?: string | number, handler: CallbackQueryHandler) {
        this.callbackQueryHandlers[action] = handler
    }

    /**
     * This setter will Add new parallel job to the bot; it will raise error if the job already exists.
     * @param job: Instance of type ParallelJob which is configured what to do independently.
     */
    set newJob(job: ParallelJob) {
        if(this.parallels.includes(job))
            throw new ExistingItemError('ParallelJob');
        this.parallels.push(job)
    }
    
    /**
     * Create a new ParallelJob object and then add it to bot parallel job list and start it.
     * @param interval - The interval of the parallel job.
     * @param duty - The function that must run on each interval
     * @param params - Paramters that the duty method needs.
     * @returns The ParallelJob that has been created and added to the this.parallels.
     */
    prepareNewParallelJob(interval: number, duty: (...params: any[]) => any, ...params: any[]): ParallelJob{        
        const job = new ParallelJob(interval, duty, ...params)
        this.newJob = job;
        return job.go()
    }

    /**
     * determines what course of action needs to be taken based on the message sent to the bot by user, and the handlers that are defined by the dev
     * First command/message/state handler and middlewares and then call the handle with telegram request data.
     * @param telegramData 
     */

    handle(telegramData: {[key: string]: any}) {
        let message: GenericMessage | TelegramCallbackQuery;
        let user: User;
        let response: GenericMessage | TelegramCallbackQuery;
        let keyboard: Keyboard | InlineKeyboard = null;

        let useAlternateKeyboard: boolean = false; // false means use the main keyboard

        // TODO: run middlewares first
        
        if(telegramData?.callback_query) {
            message = new TelegramCallbackQuery(telegramData);
            user = message.by;
            if(this.callbackQueryHandlers[(message as TelegramCallbackQuery).action]) {
                [response, keyboard] = this.callbackQueryHandlers[(message as TelegramCallbackQuery).action](this, (message as TelegramCallbackQuery))
            }

        }
        else {
            message = new GenericMessage(telegramData)
            user = message.by
            if(this.commandHandlers[message?.text])
                [response, keyboard] = this.commandHandlers[message.text](this, message)
            else {
                if(user.state !== UserState.None && this.stateHandlers[user?.state]) {
                    const handler: GenericHandler = this.stateHandlers[user.state];
                    [response, keyboard] = handler(this, message)
                }

                if(!response)
                    if(this.messageHandlers[message?.text])
                        [response, keyboard] = this.messageHandlers[message.text](this, message)
                    
            }
        }
        if(!response)
            response = new TextMessage(user.chatId, this.text("wrongCommand", user.language))

        // if message != response or ((keyboard) and not isinstance(keyboard, InlineKeyboard)):
        if(!response.isReplacement || ((keyboard) && !(keyboard instanceof InlineKeyboard))) {
            if(!keyboard && !useAlternateKeyboard)
                keyboard = this.mainKeyboard(user.language)
            this.send(message=response, keyboard=keyboard)
        }
        else
            this.edit(message, keyboard as InlineKeyboard)
    }
}
