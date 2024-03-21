import axios from "axios";
import { GeneralMessage, TelegramCallbackQuery } from "./entities";
import { InlineKeyboard, Keyboard } from "./keyboards";
import { InvalidLanguageError, NoSuchTextResource, NoSuchTextResourceError, TelegramApiError } from "./errors";
import { ParallelJob, Planner, minutesToTimestamp } from "./tools";

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



/**
 *
 * This is a simple enum, indicating the state of the user is currently inm while using the bot
 * This state is useful while implementing multi-step inputs.
 * Also this enum is used for state handler in the bot. By each specific State you have defined in your custom enum extending from this, you can define a method,
 * That will handle that state.
 */
export enum UserState {
  None = 0
}

type GenericHandler = (bot: TelegramBotCore, message: GeneralMessage) => [response: GeneralMessage, markup: Keyboard];
type CallbackQueryHandler = (bot: TelegramBotCore, message: TelegramCallbackQuery) => [response: GeneralMessage, markup: Keyboard];
type GenericMiddleware = (bot: TelegramBotCore, message: GeneralMessage) => boolean;
type GenericModdifier = (message: GeneralMessage) => GeneralMessage;

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
    protected commandHandlers: {[command: string]: GenericHandler} = {};
    protected messageHandlers: {[message: string]: GenericHandler} = {};
    protected callbackQueryHandlers: {[action: string]: CallbackQueryHandler} = {};
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
        throw new NoSuchTextResourceError();
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
    
    # Main Sections:
    def add_state_handler(this, handler: Callable[[TelegramBotCore, TelegramMessage], Union[TelegramMessage, Keyboard|InlineKeyboard]], state: UserStates|int):
        '''Add a handler for special states of user. Depending on the appliance and structure of the bot, it must have its own UserStates enum, that you must add handler for each value of the enum. States are useful when getting multiple inputs for a model, or when special actions must be taken other than normal handlers'''
        this.state_handlers[state] = handler

    # Main Sections:
    def add_message_handler(this, handler: Callable[[TelegramBotCore, TelegramMessage], Union[TelegramMessage, Keyboard|InlineKeyboard]], message: dict|list|str = None):
        '''Add message handlers; Provide specific messages in your desired languages (as dict) to call their provided handlers when that message is sent by user;'''
        # if your bot has multiple languages then notice that your language keys must match with these keys in message
        if message:
            if not isinstance(message, dict) and not isinstance(message, list):
                this.message_handlers[message] = handler
                return
            for lang in message:
                this.message_handlers[message[lang]] = handler
            return
        # TODO: ?if msg_texts if none, then the handler is global

    def add_command_handler(this, handler: Callable[[TelegramBotCore, TelegramMessage], Union[TelegramMessage, Keyboard|InlineKeyboard]], command: str):
        '''Add a Handler for a message starting with forthslash(/), so if the user sends that command, this handler will run.'''
        this.command_handlers[f"/{command}" if command[0] != '/' else command] = handler


    def add_callback_query_handler(this, handler: Callable[[TelegramBotCore, TelegramCallbackQuery], Union[TelegramMessage, Keyboard|InlineKeyboard]], action: str = None):
        '''Add handler for each action value of the inline callback keyboards. Each group of inline keyboards have a spacial CallbackQuery.action, that each action value has its special handler '''
        this.callback_query_hanndlers[action] = handler

    def add_parallel_job(this, job: ParallelJob) -> bool:
        '''Add new parallel job to the bot; return False if the job Already exists.'''
        if job not in this.parallels:
            this.parallels.append(job)
            return True
        return False
    

    def prepare_new_parallel_job(this, interval: int, functionality: Callable[..., any], *params) -> ParallelJob:
        '''Create a new ParallelJob object and then add it to bot parallel job list and start it.'''
        job = ParallelJob(interval, functionality, *params)
        this.add_parallel_job(job)
        return job.go()

    def handle(this, telegram_data: dict):
        '''determine what course of action to take based on the message sent to the bot by user. First command/message/state handler and middlewares and then call the handle with telegram request data.'''
        message: TelegramMessage | TelegramCallbackQuery = None
        user: User = None
        response: TelegramMessage| TelegramCallbackQuery = None
        keyboard: Keyboard | InlineKeyboard = None
        dont_use_main_keyboard: bool = False
        # TODO: run middlewares first
        if 'callback_query' in telegram_data:
            message = TelegramCallbackQuery(telegram_data)
            user = message.by
            if message.action in this.callback_query_hanndlers:
                handler: Callable[[TelegramBotCore, TelegramCallbackQuery], Union[TelegramMessage, Keyboard|InlineKeyboard]]  = this.callback_query_hanndlers[message.action]
                response, keyboard = handler(this, message)
        else:
            message = TelegramMessage(telegram_data)
            user = message.by
            handler: Callable[[TelegramBotCore, TelegramMessage], Union[TelegramMessage, Keyboard|InlineKeyboard]] = None
            if message.text in this.command_handlers:
                handler = this.command_handlers[message.text]
                response, keyboard = handler(this, message)
            else:
                if user.state != UserStates.NONE and user.state in this.state_handlers:
                    handler = this.state_handlers[user.state]
                    response, keyboard = handler(this, message)

                if not response:
                    if message.text in this.message_handlers:
                        handler = this.message_handlers[message.text]
                        response, keyboard = handler(this, message)
        if not response:
            response = TelegramMessage.Text(target_chat_id=user.chat_id, text=this.text("wrong_command", user.language))

        # if message != response or ((keyboard) and not isinstance(keyboard, InlineKeyboard)):
        if not response.replace_on_previous or ((keyboard) and not isinstance(keyboard, InlineKeyboard)):
            if not keyboard and not dont_use_main_keyboard:
                keyboard = this.main_keyboard(user.language)
            this.send(message=response, keyboard=keyboard)
        else:
            this.edit(message, keyboard)
}
