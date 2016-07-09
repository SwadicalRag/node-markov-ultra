/// <reference path="../typings/index.d.ts" />
"use strict";
var non_memory_map_1 = require("non-memory-map");
var MarkovChain = (function () {
    function MarkovChain(path, size) {
        this.path = path;
        this.size = size;
        this.map = new non_memory_map_1.NonMemoryMap({
            path: this.path,
            mapSize: this.size || 512 * 1024 * 1024 // 512 MB
        });
        if (!this.map.get("firstWords")) {
            this.map.set("firstWords", {});
            this.map.set("firstWordsHits", 0);
            this.map.set("firstWordsLength", 0);
        }
        // this.map["debug"] = console.log;
    }
    MarkovChain.prototype.getWords = function (sentence) {
        // a word is defined as a group of non-space characters
        return sentence.split(/\s+/g);
    };
    MarkovChain.prototype.forEach = function (array, callback) {
        for (var i = 0; i < array.length; i++) {
            if (callback(array[i], i)) {
                return;
            }
            ;
        }
    };
    MarkovChain.prototype.forEachEx = function (array, callback) {
        while (array.length > 0) {
            this.forEach(array, function (word, idx) {
                return callback(word, idx, false);
            });
            callback(null, null, true);
            array.splice(0, 1);
        }
    };
    MarkovChain.prototype.learn = function (sentence, simple) {
        var _this = this;
        if (simple === void 0) { simple = false; }
        var words = this.getWords(sentence);
        var chain = this.map;
        var iterator = simple ? this.forEach.bind(this) : this.forEachEx.bind(this);
        var firstWord = words[0];
        this.map.beginTransaction(); // START TRANSACTION
        this.map.set("firstWordsHits", this.map.get("firstWordsHits") + 1);
        if (this.map.get("firstWords").get(firstWord)) {
            var firstWords = this.map.get("firstWords");
            firstWords.set(firstWord, firstWords.get(firstWord) + 1);
        }
        else {
            var i = this.map.get("firstWordsLength");
            this.map.set("firstWordsLength", i + 1);
            var firstWords = this.map.get("firstWords");
            firstWords.set(i, firstWord);
            firstWords.set(firstWord, 1);
        }
        iterator(words, function (word, i, reset) {
            if (reset) {
                chain = _this.map;
                return;
            }
            var children = chain.get("children");
            if (!children) {
                chain.set("hits", 0);
                chain.set("childrenHits", 0);
                chain.set("length", 0);
                chain.set("children", {});
                children = chain.get("children");
            }
            var child = children.get(word);
            if (!child) {
                var id = chain.get("length");
                chain.set("length", id + 1);
                children.set(id, word);
                children.set(word, {
                    length: 0,
                    hits: 0,
                    childrenHits: 0,
                    children: {}
                });
                child = children.get(word);
            }
            chain.set("childrenHits", chain.get("childrenHits") + 1);
            child.set("hits", child.get("hits") + 1);
            chain = child;
        });
        this.map.commit(); // END TRANSACTION
    };
    MarkovChain.prototype.forEachChild = function (chain, callback) {
        var children = chain.get("children");
        var length = chain.get("length");
        for (var i = 0; i < length; i++) {
            var name_1 = children.get(i);
            var child = children.get(name_1);
            // console.log(i,name,child)
            if (callback(name_1, child)) {
                return;
            }
        }
    };
    MarkovChain.prototype.correctSentenceDepth = function (sentence, depth) {
        if (sentence.length > depth) {
            var corrected = [];
            for (var i = 0; i < depth; i++) {
                corrected[depth - 1 - i] = sentence[sentence.length - 1 - i];
            }
            return corrected;
        }
        return sentence;
    };
    MarkovChain.prototype.getSentenceHead = function (sentence, depth) {
        var chain = this.map;
        sentence = this.correctSentenceDepth(sentence, depth);
        this.forEach(sentence, function (word, idx) {
            var children = chain.get("children");
            if (children) {
                var childWordChain = children.get(word);
                if (childWordChain) {
                    chain = childWordChain;
                    return;
                }
            }
            chain = null;
            return true;
        });
        return chain;
    };
    MarkovChain.prototype.getFirstWord = function () {
        var length = this.map.get("firstWordsLength");
        var totalHits = this.map.get("firstWordsHits");
        var target = Math.round(Math.random() * totalHits);
        var firstWords = this.map.get("firstWords");
        var seen = 0;
        for (var i = 0; i < length; i++) {
            var word = firstWords.get(i);
            var hits = firstWords.get(word);
            seen += hits;
            if (seen >= target) {
                // return this.map.get("children").get(word);
                return word;
            }
        }
    };
    MarkovChain.prototype.getFirstWordChain = function (word) {
        var children = this.map.get("children");
        if (children) {
            return children.get(word);
        }
    };
    MarkovChain.prototype.generate = function (depth, length) {
        if (depth === void 0) { depth = 1; }
        var currentDepth = 1;
        this.map.beginTransaction(); // START TRANSACTION
        var sentence = [this.getFirstWord()];
        if (!sentence[0]) {
            this.map.commit(); // END TRANSACTION
            return "";
        }
        var chain = this.getFirstWordChain(sentence[0]);
        var _loop_1 = function() {
            var totalHits = chain.get("childrenHits");
            if (!totalHits) {
                return "break";
            }
            if (totalHits == 0) {
                return "break";
            }
            var target = Math.round(Math.random() * totalHits);
            var seen = 0;
            this_1.forEachChild(chain, function (word, child) {
                seen += child.get("hits");
                if (seen >= target) {
                    sentence[sentence.length] = word;
                    chain = child;
                    return true;
                }
            });
            if (length) {
                if (sentence.length >= length) {
                    return "break";
                }
            }
            currentDepth++;
            if (currentDepth >= depth) {
                chain = this_1.getSentenceHead(sentence, depth);
            }
            if (!chain) {
                return "break";
            }
        };
        var this_1 = this;
        while (true) {
            var state_1 = _loop_1();
            if (state_1 === "break") break;
        }
        this.map.commit(); // END TRANSACTION
        return sentence.join(" ");
    };
    return MarkovChain;
}());
exports.__esModule = true;
exports["default"] = MarkovChain;

//# sourceMappingURL=../maps/index.js.map
