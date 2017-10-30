function buildChain(text, length) {
    var sentences = text.split(/[.?!]+/)
        .map(x => x.replace(/[^a-zA-Z'_ ]/g, " "))
        .filter(x => x.length > 0);

    var chain = { "\n": {} };
    for (let sentence of sentences) {
        let wordsSingle = sentence.split(" ").filter(x => x.length > 0);
        let words = [];
        while (wordsSingle.length > 0)
            words.push(wordsSingle.splice(0, length).join(" "));
        words.push("\n");
        for (let i = 0; i < words.length - 1; i++) {
            if (i == 0) {
                if (chain["\n"][words[i]] == null) chain["\n"][words[i]] = 0;
                chain["\n"][words[i]]++;
            }
            if (chain[words[i]] == null) chain[words[i]] = {};
            if (chain[words[i]][words[i + 1]] == null) chain[words[i]][words[i + 1]] = 0;
            chain[words[i]][words[i + 1]]++;
        }
    }
    return chain;
}

function findSyllables(word, callback) {
    var json = JSON.parse(getPage("http://api.datamuse.com/words?sp=" + word.toLowerCase() + "&qe=sp&md=s"));
    return json[0].numSyllables;
}

function randomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function randomWeighted(dict) {
    var total = Object.values(dict).reduce((total, x) => total + x);

    var random = Math.floor(Math.random() * total);
    var value = 0;
    for (let property in dict) {
        value += dict[property];
        if (value >= random) return property;
    }
}

function getPage(url) {
    var request = new XMLHttpRequest();
    request.open("GET", url, false);
    request.send(null);
    if (request.status !== 200) return null;
    return request.responseText;
}

var poemFunctions = {
    freeform: {
        length: 2,
        generate: function (chain) {
            function followChain(word, depth) {
                if (word == "\n" || depth > 100) return word;
                return word + " " + followChain(randomWeighted(chain[word]), depth + 1);
            }
            var lines = [];
            for (let i = 0; i < 10; i++) {
                lines.push(followChain(randomWeighted(chain["\n"]), 0));
            }
            return lines;
        }
    },

    haiku: {
        length: 1,
        generate: function (chain) {
            function generateLine(syllables, startWord) {
                if (startWord == null) startWord = "\n";
                let subchain = {};
                for (let item in chain[startWord]) {
                    if (/*findSyllables(item) <= syllables &&*/ item != "\n") {
                        subchain[item] = chain[startWord][item];
                    }
                }
                if (Object.keys(subchain).length == 0) return null;
                let word = randomWeighted(subchain);
                let wordSyllables = findSyllables(word);
                if (wordSyllables > syllables || wordSyllables == 0) return null;
                if (wordSyllables == syllables) return word;
                let next = generateLine(syllables - wordSyllables, word);
                if (next == null) return null;
                console.log(word + " syllables: " + wordSyllables);
                return word + " " + next;
            }

            function reallyGenerateLine(syllables) {
                while (true) {
                    var item = generateLine(syllables);
                    if (item != null) return item;
                }
            }

            return [reallyGenerateLine(5), reallyGenerateLine(7), reallyGenerateLine(5)];
        }
    }
};

function init() {
    var sel = document.getElementById("poemType");
    for (let key in poemFunctions) {
        let opt = document.createElement("option");
        opt.value = key;
        opt.innerHTML = key;
        sel.appendChild(opt);
    }
    sel.getElementsByTagName("option")[0].selected = "selected";
}

function generatePoem() {
    var text = getPage("text.txt");
    var sel = document.getElementById("poemType");
    var func = poemFunctions[sel.options[sel.selectedIndex].text];
    var chain = buildChain(text, func.length);
    document.getElementById("poem").innerHTML = func.generate(chain).join("<br />");
}