# node-markov-ultra
my modified markov chain algorithm to generate pseudorandom sentences from a learned database

## Installing
```
npm install markov-ultra --save
```

## Example usage
```typescript
import MarkovChain from "markov-ultra";

let markov = new MarkovChain(__dirname + "/test");
markov.learn("This is a meme");
markov.learn("memes are great");
markov.learn("banana loves meme");
markov.learn("we love you banana");
markov.learn("Oh, It's more like a skype call style system");
markov.learn("no i mean you can have the name actually be different per message without changing it");
markov.learn("wang is banana is wang");

for(let i=0;i < 100;i++) {
    let sentence = markov.generate();
    console.log(sentence);
}
```

it gets better the larger your dataset is.
