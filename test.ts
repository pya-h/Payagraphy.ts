import { InlineKeyboard, InlineButton } from "./src/engine/keyboards";

((...x: (number[] | number)[]) => {
    console.log(x);
})([1],2,[3], 4);

const k = InlineKeyboard.Arrange(Array(13).fill(0).map((a, i) => ({title: `title#${i}`, value: i})), "testAction");
console.log(k.asTelegramObject.inline_keyboard[1]);
console.log(k.asJSON);