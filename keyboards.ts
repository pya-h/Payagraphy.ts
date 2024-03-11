// import json
// from math import ceil
// from payagraph.raw_materials import CanBeKeyboardItemInterface


export class Keyboard {
    protected _keys: string[][];
    private _isOneTime: boolean;
    private _resized: boolean;

    constructor(...rows: string[]) {
        this._keys = rows.map((row: Array<string>|string) => row instanceof Array ? row : [row]);
        this._isOneTime = false;
        this._resized = true;
    }

    oneTimeKeyboard(): Keyboard {
        this._isOneTime = true;
        return this;
    }

    noResizing(): Keyboard {
        this._resized = false;
        return this;
    }

    get asTelegramObject(): {[key: string]: any} {
        return {
            keyboard: this._keys,
            one_time_keyboard: this._isOneTime,
            resize_keyboard: this._resized
        }
    }

    get asJSON(): string {
        // Return the json that canbe used for passing to reponse payload
        return JSON.stringify(this.asTelegramObject);
    }

    attachToTelegramPayload(payload: {[property: string]: any}) {
        // Attach the keyboard to the response payload, to make it easy for adding keyboard to messages
        payload['reply_markup'] = this.asJSON;  // objects are passed by reference, so there is no need to return this
    }

}

export type StandardInlineButtonData = {
    callbackData?: string | {[key: string]: number | string},
    url?: string, 
    getLocation?: boolean,
    getContact?: boolean
};

export type InlineButtonData =  StandardInlineButtonData | string | number | boolean;

export enum InlineButtonType {
    Callback = 1,
    URL = 2,
    GetContact = 3,
    GetLocation = 4,
    SingleValue = 5
}

export class InlineButton {
    private _text: string;
    private _callbackData?: string | {[key: string]: number | string};
    private _url?: string;
    private _singleValue?: string | number | boolean;

    private _type: InlineButtonType;

    // Inline kyeboard items
    constructor(text: string, data: InlineButtonData) {
        this._text = text
        // From the fields below only one must be passed, otherwise it will consider it first as callback_data, then url, then ...
        this.data = data;
    }

    set data(data: InlineButtonData) {
        if(typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
            this._singleValue = data;
            this._type = InlineButtonType.SingleValue;
        } else {
            const dataKeys: string[] = Object.keys(data);
            if(+dataKeys?.length !== 1)
                throw new Error('Inline keyboard button just can have one type: Callback, URL, getContact, getLocation or single value!');
            switch(dataKeys[0]) {
                case 'callbackData':
                    this._type = InlineButtonType.Callback;
                    this._callbackData = data.callbackData;
                    break;
                case 'url':
                    this._type = InlineButtonType.URL;
                    this._url = data.url;
                    break;
                    case 'getContact':
                        this._type = InlineButtonType.GetContact;
                    break;
                case 'getLocation':
                    this._type = InlineButtonType.GetLocation;
                    break;
                default:
                    throw new Error('Inline keyboard button just can have one type: Callback, URL, getContact, getLocation or single value!');

                        
            }
        }
    }

    setData(data: InlineButtonData): InlineButton {
        // this is just like the .data setter, but it returns the object itself, it can be used for serial calls on InlineButton objects.
        this.data = data;
        return this;
    }

    get text() {
        return this._text;
    }

    get type(): InlineButtonType {
        return this._type;
    }

    get asTelegramObject() {
        switch(this.type) {
            case InlineButtonType.Callback:
                return {text: this.text, callback_data: JSON.stringify(this._callbackData)};
            case InlineButtonType.URL:
                return {text: this.text, url: this._url};
            case InlineButtonType.GetContact:
                return {text: this.text, request_contact: true};
            case InlineButtonType.GetLocation:
                return {text: this.text, request_location: true};
            case InlineButtonType.SingleValue:
                return {text: this.text, callback_data: this._singleValue};
        }
    }
}


export class InlineKeyboard extends Keyboard {

    // Telegram Inline keyboard implementation, to make it easy for adding inline keyboards to your messages
    constructor(...rows: string[]) {
        super(...rows);
    }

    static MakeButtonStandard(button: InlineButton | {[key: string]: any} | string | number): InlineButton {
        // try everything you can to extract a acceptable keyboard out of this :)))
        try {
            if(button instanceof InlineButton)
                return  button;
            if(typeof button === 'object' && button && !Array.isArray(button)) {
                const {text} = button;
                delete button.text;
                return new InlineButton(text, {callbackData: button.callback_data ?? button.callbackData,
                    url: button.url,
                    getContact: button.request_contact ?? button.getContact, 
                    getLocation: button.request_location ?? button.getLocation});
            }
            return new InlineButton(button.toString(), button.toString());

        }
        catch(ex) {
            throw new Error("Wrong button data " + ex);
        }
    }

    override get asTelegramObject() {
        // Convert the obbject to a dict so then it be converted to a propper json. It's written in a way that it considers any kind of key param type
        if(!this._keys?.length)
            throw new Error('This object is not a standard payagraph or telegram keyboard!')
        
        return {
            inline_keyboard: this._keys.map(row => {
                return (Array.isArray(row) ? row : [row]).map(col => {
                    return InlineKeyboard.MakeButtonStandard(col).asTelegramObject;
                })
            })
        }
    }

    // @staticmethod
    // def Arrange(list_of_keys: list[CanBeKeyboardItemInterface], callback_action: str):
    //     keys_count = len(list_of_keys)
    //     keys = [[ InlineButton(list_of_keys[j].title(), {"a": callback_action, "v": list_of_keys[j].value()}) \
    //              for j in range(i * 5, (i + 1) * 5 if (i + 1) * 5 < keys_count else keys_count)] \
    //                 for i in range(ceil(keys_count // 5))]

    //     return InlineKeyboard(*keys)

}