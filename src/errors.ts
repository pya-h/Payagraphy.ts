export class InvalidLanguageError extends Error {
  constructor() {
    super("The value provided for user language is invalid!");
  }
}

export class NoSuchTextResourceError extends Error {
  constructor(key: string) {
    super(`No such text has been found with key:'${key}' in text resource repository!`);
  }
}

export class InvalidArgumentError extends Error {
  constructor() {
    super("The provided argument is not a standard input!");
  }
}

export class TelegramApiError extends Error {
  constructor(
    url: string,
    statusCode: number,
    response: string,
    chatId: number,
    messageId?: number
  ) {
    super(
      `Telegram API Call failure from url: ${url}\n\tstatus-code:${statusCode}\n\tTarget ChatId:${chatId}\nResponse text: ${response}` +
        (messageId ? `\n\tInvolved message id: ${messageId}` : "")
    );
  }
}

export class ExistingItemError extends Error {
  constructor(itemName: string) {
    super(`The provided ${itemName} already exists!`);
  }
}