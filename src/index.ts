/// <reference path="../typings/index.d.ts" />

import {NonMemoryMap} from "non-memory-map";

export default class MarkovChain {
    private map:NonMemoryMap;

    constructor(private path:string,private size?:number) {
        this.map = new NonMemoryMap({
            path: this.path,
            mapSize: this.size || 512 * 1024 * 1024 // 512 MB
        });

        if(!this.map.get("firstWords")) {
            this.map.set("firstWords",{});
            this.map.set("firstWordsHits",0);
            this.map.set("firstWordsLength",0);
        }
        // this.map["debug"] = console.log;
    }

    private getWords(sentence:string) {
        // a word is defined as a group of non-space characters

        return sentence.split(/\s+/g);
    }

    private forEach<T>(array:T[],callback:(word:T,idx:number) => (boolean|void)) {
        for(let i=0;i < array.length;i++) {
            if(callback(array[i],i)) {return;};
        }
    }

    private forEachEx<T>(array:T[],callback:(word:T,idx:number,reset:boolean) => (boolean|void)) {
        while(array.length > 0) {
            this.forEach(array,(word,idx) => {
                return callback(word,idx,false);
            });
            
            callback(null,null,true);

            array.splice(0,1);
        }
    }

    learn(sentence:string,simple:boolean = false) {
        let words = this.getWords(sentence);

        let chain = this.map;
        let iterator:any = simple ? this.forEach.bind(this) : this.forEachEx.bind(this);

        let firstWord = words[0];

        this.map.beginTransaction(); // START TRANSACTION

        this.map.set("firstWordsHits",this.map.get("firstWordsHits") + 1);
        if(this.map.get("firstWords").get(firstWord)) {
            let firstWords = this.map.get("firstWords");
            firstWords.set(firstWord,firstWords.get(firstWord) + 1);
        }
        else {
            let i = this.map.get("firstWordsLength");
            this.map.set("firstWordsLength",i + 1);
            let firstWords = this.map.get("firstWords");
            firstWords.set(i,firstWord);
            firstWords.set(firstWord,1);
        }

        iterator(words,(word:string,i:number,reset:boolean) => {
            if(reset) {
                chain = this.map;
                return;
            }

            let children = chain.get("children");
            if(!children) {
                chain.set("hits",0);
                chain.set("childrenHits",0);
                chain.set("length",0);
                chain.set("children",{});
                children = chain.get("children");
            }

            let child = children.get(word);
            if(!child) {
                let id = chain.get("length");
                chain.set("length",id + 1);

                children.set(id,word);

                children.set(word,{
                    length: 0,
                    hits: 0,
                    childrenHits: 0,
                    children: {}
                });

                child = children.get(word);
            }

            chain.set("childrenHits",chain.get("childrenHits") + 1);
            child.set("hits",child.get("hits") + 1);

            chain = child;
        });

        this.map.commit(); // END TRANSACTION
    }

    private forEachChild(chain:NonMemoryMap,callback:(word:string,child:NonMemoryMap) => boolean) {
        let children = chain.get("children");

        let length:number = chain.get("length");
        
        for(let i=0;i < length;i++) {
            let name = children.get(i);
            let child = children.get(name);

            // console.log(i,name,child)

            if(callback(name,child)) {
                return;
            }
        }
    }

    private correctSentenceDepth(sentence:string[],depth:number) {
        if(sentence.length > depth) {
            let corrected = [];

            for(let i=0;i < depth;i++) {
                corrected[depth - 1 - i] = sentence[sentence.length - 1 - i]
            }

            return corrected;
        }

        return sentence;
    }

    private getSentenceHead(sentence:string[],depth:number) {
        let chain = this.map;
        sentence = this.correctSentenceDepth(sentence,depth);
        this.forEach(sentence,(word,idx) => {
            let children = chain.get("children");
            if(children) {
                let childWordChain = children.get(word);
                if(childWordChain) {
                    chain = childWordChain;
                    return;
                }
            }

            chain = null;
            return true;
        });

        return chain;
    }

    private getFirstWord() {
        let length:number = this.map.get("firstWordsLength");
        let totalHits:number = this.map.get("firstWordsHits");
        let target = Math.round(Math.random() * totalHits);

        let firstWords = this.map.get("firstWords");

        let seen = 0;

        for(let i=0;i < length;i++) {
            let word:string = firstWords.get(i);

            let hits:number = firstWords.get(word);

            seen += hits;

            if(seen >= target) {
                // return this.map.get("children").get(word);
                return word;
            }
        }
    }

    getFirstWordChain(word:string) {
        let children = this.map.get("children");

        if(children) {
            return children.get(word);
        }
    }

    generate(depth:number = 1,length?:number) {
        let currentDepth = 1;

        this.map.beginTransaction(); // START TRANSACTION

        let sentence:string[] = [this.getFirstWord()];
        if(!sentence[0]) {
            this.map.commit(); // END TRANSACTION
            return "";
        }
        let chain:NonMemoryMap = this.getFirstWordChain(sentence[0]);

        while(true) {
            let totalHits:number = chain.get("childrenHits");
            if(!totalHits) {break;}
            if(totalHits == 0) {break;}
            
            let target = Math.round(Math.random() * totalHits);
            let seen = 0;

            this.forEachChild(chain,(word,child) => {
                seen += child.get("hits");

                if(seen >= target) {
                    sentence[sentence.length] = word;
                    chain = child;
                    return true;
                }
            });

            if(length) {
                if(sentence.length >= length) {
                    break;
                }
            }

            currentDepth++;

            if(currentDepth >= depth) {
                chain = this.getSentenceHead(sentence,depth);
            }

            if(!chain) {
                break;
            }
        }

        this.map.commit(); // END TRANSACTION

        return sentence.join(" ");
    }
}
