function buildChain(text) {
   var sentences = text.split(/[.?!]+/).map(x => x.replace(/[^a-zA-Z_ ]/g, " ")).filter(x => x.length > 0);

   var chain = {};
   for (let sentence of sentences) {
       let words = sentence.split(" ").filter(x => x.length > 0);
       words.push("\n");
       for (let i = 0; i < words.length - 1; i++) {
           if (chain[words[i]] == null) chain[words[i]] = {};
           if (chain[words[i]][words[i + 1]] == null) chain[words[i]][words[i + 1]] = 0;
           chain[words[i]][words[i + 1]]++;
       }
   }
   return chain;
}

function findSyllables(word, callback) {
    var json = JSON.parse(getPage("http://api.wordnik.com:80/v4/word.json/" + word.toLowerCase() + "/hyphenation?useCanonical=false&limit=50&api_key=a2a73e7b926c924fad7001ca3111acd55af2ffabf50eb4ae5"));
    return json.length;
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
    haiku: function(chain) {
        /*function generateLine(syllables, startWord) {
            while (true) {
                let word = (startWord == null) ? randomElement(Object.keys(chain)) : startWord;
                if (word.length == syllables) return word; // CHANGE
                if (Math.min(Object.keys(chain[word]).map(key => chain[word][key])) < syllables) return word + " " + generateLine(syllables - findSyllables(word), word);
                return null;
            }
        }

        return [ generateLine(5), generateLine(7), generateLine(5) ];
        */
    },

    freeform: function(chain) {
        function followChain(word, depth) {
            if (chain[word] == null || depth > 10) return word;
            return word + " " + followChain(randomWeighted(chain[word]), depth + 1);
        }
        var lines = [];
        for (let i = 0; i < 10; i++) {
            lines.push(followChain(randomElement(Object.keys(chain)), 0));
        }
        return lines;
    },
};

function generatePoem() {
    var text = getPage("text.txt");
    var chain = buildChain(text);
    var lines = [];
    document.getElementById("poem").innerHTML = poemFunctions.freeform(chain).join("<br />");
}