/// <reference path="../typings/index.d.ts" />
import { NonMemoryMap } from "non-memory-map";
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
    followChain(sentence: string[], start?: NonMemoryMap): NonMemoryMap;
    generate(depth?: number, length?: number, start?: string): string;
}
