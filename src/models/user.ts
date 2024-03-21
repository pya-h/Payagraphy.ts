
export enum UserState {
    None = 0
}

export enum UserLanguage { // must match your text resource json file
    En = "en",
    Fa = "fa"
}

export interface User {
    id: number,
    chatId: number,
    state: UserState,
    language: UserLanguage
}
