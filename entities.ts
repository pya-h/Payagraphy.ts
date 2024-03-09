// from db.vip_models import VIPAccount
// import json
// from enum import Enum
// from tools.mathematix import force_cast

enum ChatType {
    User = "user",
    Channel = "channel",
    Group = "group",
    None = "none"
}

export class ForwardOrigin {
    protected _type: ChatType;
    protected _id: number;
    protected _message_id: number;
    protected _title: string;
    protected _username: string;

    constructor(forwardData: { [field: string]: any }) {
        this._type = forwardData?.type as ChatType;

        switch (this._type) {
            case ChatType.Channel:
                this._id = +forwardData.chat?.id
                this._message_id = +forwardData.message_id;
                this._title = forwardData.chat?.title;
                this._username = forwardData.chat?.username;

                break;

            case ChatType.User:
                this._id = +forwardData.sender_user?.id
                this._title = forwardData.sender_user?.first_name
                this._username = forwardData.sender_user?.username;
                break;

            case ChatType.Group:
                // TODO: fill in
                break;

            case ChatType.None:
            default:
                // TODO: fill in
                break;
        }

    }

    get id(): number {
        return this._id;
    }

    get messageId(): number {
        return this._message_id;
    }

    get title(): string {
        return this._title;
    }

    get username(): string {
        return this._username;
    }

    toString(): string {
        return `Type: ${this._type}\nTitle:${this._title}\nId:${this._id}\nUsername:${this._username}`;
    }

}

// temp
type User = {
    id: number;
} | null;

export class GeneralMessage {
    protected _msg: { [field: string]: any };
    protected _id: number;
    protected _text: string;
    protected _by: User;
    protected _target: User = null;
    protected _chat_id: number;
    protected _forward_origin: ForwardOrigin | null;
    protected _is_replacement: boolean;

    constructor(data: { [field: string]: any }) {
        this._msg = data.message;
        this._id = +this._msg?.message_id;
        this._text = this._msg?.text;

        this._by = null; // Edit This: VIPAccount.Get(this._msg?.chat?.id)
        this._chat_id = +this._msg?.chat?.id
        this._forward_origin = this._msg.forward_origin ? new ForwardOrigin(this._msg.forward_origin) : null;
        this._is_replacement = false;
    }

    get id(): number {
        return this._id;
    }

    get text(): string {
        return this._text;
    }

    set text(value: string) {
        this._text = value;
    }

    get by(): User {
        return this._by;
    }

    set by(value: User) {
        this._by = value;
    }

    get target(): User {
        return this._target;
    }

    set target(value: User) {
        this._target = value;
    }

    get chatId(): number {
        return this._chat_id;
    }

    set chatId(value: number) {
        this._chat_id = value;
    }

    get forwardOrigin(): ForwardOrigin | null{
        return this._forward_origin;
    }

    get isReplacement(): boolean {
        return this._is_replacement;
    }

    replacement() {
        this._is_replacement = true;
    }

    notAReplacement() {
        this._is_replacement = false;
    }

    send(targetId: number = this.target?.id ?? 0): any {
        if(targetId !== this.target?.id) {
            // find target
        }
    }

}

export class TelegramCallbackQuery extends GeneralMessage {
    private _data: string;
    private _action: string;
    private _value: string | number;

    get data(): { a: string, v: string | number } {
        const d = JSON.parse(this._data);
        return { a: d.a, v: d.v };
    }

    constructor(data: { [field: string]: any }) {
        if (!data.callback_query)
            throw new Error('This is not a callback query!');
        super(data.callback_query);
        this._data = data?.callback_query?.data
        this._value = this._data
        try {
            const d = this.data;
            this._action = d.a;
            this._value = d.v;

        }
        catch (ex) {
            throw new Error('Wrong callback data provided!');
        }
    }

    get action(): string {
        return this._action;
    }

    get value(): string | number {
        return this._value;
    }
}

export type MessageOptions = {
    senderId?: number,
    targetId?: number,
    messageId?: number,
    isReplacement?: boolean
    forwardOrigin?: ForwardOrigin | null
}

export class TextMessage extends GeneralMessage {

    constructor(targetChatId: number, text: string, options: MessageOptions) {
        super({
            message: {
                message_id: options?.messageId ?? 0,
                text,
                chat: {
                    id: targetChatId
                }
            }
        });
        this._by = null; // TODO: use options.senderId, find user from database model
        this._target = null; // TODO: use options.targetId, find //
        this._forward_origin = options?.forwardOrigin ?? null;
        this._is_replacement = options?.isReplacement ?? false;

    }

    override send(targetId: number = this.target?.id ?? 0) {
        super.send(targetId);
        // TODO:
    }

}

export class PhotoMessage extends GeneralMessage {
    // TODO:
    private _photo_id: string; // telegram photo id


    get photoId(): string {
        return this._photo_id;
    }

    override send(targetId: number = this.target?.id ?? 0) {
        super.send(targetId);
        // TODO:
    }

}

export class VoiceMessage extends GeneralMessage {
    // TODO:

    private _voice_id: string; // telegram voice id


    get voiceId(): string {
        return this._voice_id;
    }
}

export class VideoMessage extends GeneralMessage {
    // TODO:

    private _video_id: string; // telegram video id


    get videoId(): string {
        return this._video_id;
    }

    override send(targetId: number = this.target?.id ?? 0) {
        super.send(targetId);
        // TODO:
    }

}

export class MusicMessage extends GeneralMessage {
    // TODO:
    private _music_id: string; // telegram music id


    get musicId(): string {
        return this._music_id;
    }

    override send(targetId: number = this.target?.id ?? 0) {
        super.send(targetId);
        // TODO:
    }

}
