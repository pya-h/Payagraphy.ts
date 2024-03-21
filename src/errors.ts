export class InvalidLanguageError extends Error {
  constructor() {
    super("The value provided for user language is invalid!");
  }
}

export class NoSuchTextResourceError extends Error {
  constructor() {
    super("No such text has been found with this key!");
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
