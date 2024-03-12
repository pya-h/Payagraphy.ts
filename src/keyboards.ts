import { TelegramKeyboardnPattern } from "./types";

export class InlineButton {
  protected _text: string;
  protected _callbackData?: string | { [key: string]: number | string };
  protected _url?: string;
  protected _singleValue?: string | number | boolean;

  protected _type: InlineButtonType;

  // Inline kyeboard items
  constructor(text: string, data: InlineButtonData) {
    this._text = text;
    // From the fields below only one must be passed, otherwise it will consider it first as callback_data, then url, then ...
    this.data = data;
  }

  set data(data: InlineButtonData) {
    if (
      typeof data === "string" ||
      typeof data === "number" ||
      typeof data === "boolean"
    ) {
      this._singleValue = data;
      this._type = InlineButtonType.SingleValue;
    } else {
      const dataKeys: string[] = Object.keys(data);
      if (+dataKeys?.length !== 1)
        throw new Error(
          "Inline keyboard button just can have one type: Callback, URL, getContact, getLocation or single value!"
        );
      switch (dataKeys[0]) {
        case "callbackData":
          this._type = InlineButtonType.Callback;
          this._callbackData = data.callbackData;
          break;
        case "url":
          this._type = InlineButtonType.URL;
          this._url = data.url;
          break;
        case "getContact":
          this._type = InlineButtonType.GetContact;
          break;
        case "getLocation":
          this._type = InlineButtonType.GetLocation;
          break;
        default:
          throw new Error(
            "Inline keyboard button just can have one type: Callback, URL, getContact, getLocation or single value!"
          );
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
    switch (this.type) {
      case InlineButtonType.Callback:
        return {
          text: this.text,
          callback_data: JSON.stringify(this._callbackData),
        };
      case InlineButtonType.URL:
        return { text: this.text, url: this._url };
      case InlineButtonType.GetContact:
        return { text: this.text, request_contact: true };
      case InlineButtonType.GetLocation:
        return { text: this.text, request_location: true };
      case InlineButtonType.SingleValue:
        return { text: this.text, callback_data: this._singleValue };
    }
  }
}

export class Keyboard {
  protected _keys: (string | InlineButton)[][];
  private _isOneTime: boolean;
  private _resized: boolean;

  constructor(...rows: (string | InlineButton | (string | InlineButton)[])[]) {
    this._keys = rows.map(
      (row: string | InlineButton | (string | InlineButton)[]) =>
        row instanceof Array ? row : [row]
    );
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

  get asTelegramObject(): { [key: string]: any } {
    return {
      keyboard: this._keys,
      one_time_keyboard: this._isOneTime,
      resize_keyboard: this._resized,
    };
  }

  get asJSON(): string {
    // Return the json that canbe used for passing to reponse payload
    return JSON.stringify(this.asTelegramObject);
  }

  attachToTelegramPayload(payload: { [property: string]: any }) {
    // Attach the keyboard to the response payload, to make it easy for adding keyboard to messages
    payload["reply_markup"] = this.asJSON; // objects are passed by reference, so there is no need to return this
  }
}

export type StandardInlineButtonData = {
  callbackData?: string | { [key: string]: number | string };
  url?: string;
  getLocation?: boolean;
  getContact?: boolean;
};

export type InlineButtonData =
  | StandardInlineButtonData
  | string
  | number
  | boolean;

export enum InlineButtonType {
  Callback = 1,
  URL = 2,
  GetContact = 3,
  GetLocation = 4,
  SingleValue = 5,
}

export class InlineKeyboard extends Keyboard {
  // Telegram Inline keyboard implementation, to make it easy for adding inline keyboards to your messages
  constructor(...rows: (InlineButton | InlineButton[])[]) {
    super(...rows);
  }

  static MakeButtonStandard(
    button: InlineButton | { [key: string]: any } | string | number
  ): InlineButton {
    // try everything you can to extract a acceptable keyboard out of this :)))
    try {
      if (button instanceof InlineButton) return button;
      if (typeof button === "object" && button && !Array.isArray(button)) {
        const { text } = button;
        delete button.text;
        return new InlineButton(text, {
          callbackData: button.callback_data ?? button.callbackData,
          url: button.url,
          getContact: button.request_contact ?? button.getContact,
          getLocation: button.request_location ?? button.getLocation,
        });
      }
      return new InlineButton(button.toString(), button.toString());
    } catch (ex) {
      throw new Error("Wrong button data " + ex);
    }
  }

  override get asTelegramObject() {
    // Convert the obbject to a dict so then it be converted to a propper json. It's written in a way that it considers any kind of key param type
    if (!this._keys?.length)
      throw new Error(
        "This object is not a standard payagraph or telegram keyboard!"
      );

    return {
      inline_keyboard: this._keys.map((row) =>
        (Array.isArray(row) ? row : [row]).map(
          (col) => col instanceof InlineButton ? col.asTelegramObject : InlineKeyboard.MakeButtonStandard(col).asTelegramObject
        )
      ),
    };
  }

  static Arrange(buttons: TelegramKeyboardnPattern[], callbackAction: string) {
    const keys = Array(Math.ceil(buttons.length / 5))
      .fill(0)
      .map((_, i: number) =>
        buttons.slice(i * 5, (i + 1) * 5).map(
          (btn) =>
            new InlineButton(btn.title, {
              callbackData: { a: callbackAction, v: btn.value },
            })
        )
      );
    return new InlineKeyboard(...keys);
  }
}
