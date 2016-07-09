/// <reference path="../typings/index.d.ts" />
export default class MarkovChain {
    private path;
    private size;
    private map;
    constructor(path: string, size?: number);
    private getWords(sentence);
    private forEach<T>(array, callback);
    private forEachEx<T>(array, callback);
    learn(sentence: string, simple?: boolean): void;
    private forEachChild(chain, callback);
    private correctSentenceDepth(sentence, depth);
    private getSentenceHead(sentence, depth);
    private getFirstWord();
    getFirstWordChain(word: string): any;
    generate(depth?: number, length?: number): string;
}
