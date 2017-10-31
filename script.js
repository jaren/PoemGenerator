window.maxLineLength = 100;
window.maxTries = 10000;

function getSyllables(word) {
    return word.trim().split(" ").map(x => window.wordData[x].syllables).reduce((x, y) => x + y);
}

function getStresses(word) {
    return word.trim().split(" ").map(x => window.wordData[x].pronounce.replace(/[^0-9]/g, "")).reduce((x, y) => x + y).split("").map(x => parseInt(x));
}

function checkIambic(word) {
    var stresses = getStresses(word).map(x => x == 0 ? 0 : 1);
    for (let i = 0; i < stresses.length; i++) {
        if (stresses[i] != i % 2) return false; 
    }
    return true;
}

function getRhymes(word) {
    word = word.trim().split(" ").slice(-1)[0];
    // TODO
}

function generateLine(constraints) {
    /* Format:
    {
        startWord: "",
        syllables: 10,
        requireIambic: false, // Requires syllables
        rhyme: "cat", // TODO

        notRoot: false,
        previous: null
    }
    */
    if (constraints.startWord == null) constraints.startWord = "\n";
    if (constraints.previous == null) constraints.previous = "";

    /* This is a mess... */
    var output = "";
    var word = "\n";
    if (constraints.syllables != null) {
        if (!constraints.notRoot) {
            var result;
            var tries = 0;
            while (result == null) {
                result = generateLine(Object.assign({}, constraints, { notRoot: true }));
                if (tries++ > window.maxTries) return null;
            }
            output = result.line;
            word = result.lastWord;
        } else {
            var possibilities = Object.keys(window.chain[constraints.startWord]).filter(x => (x != "\n") && (constraints.requireIambic == null || constraints.requireIambic == false || checkIambic(constraints.previous + " " + x)) && (getSyllables(x) <= constraints.syllables));
            if (possibilities.length == 0) return null;
            var currentWord = randomElement(possibilities);
            var syllablesLeft = constraints.syllables && (constraints.syllables - getSyllables(currentWord));
            var next = {};
            if (syllablesLeft !== 0) next = generateLine(Object.assign({}, constraints, { syllables: syllablesLeft, startWord: currentWord, previous: constraints.previous + " " + currentWord }));
            if (next == null) return null;
            output = currentWord + " " + (next.line || "");
            word = next.lastWord || currentWord;
        }
    } else {
        for (let count = 0; ; count++) {
            word = randomWeighted(window.chain[word]);
            if (count > window.maxLineLength || word == "\n") break;
            output += word + " ";
        }
    }

    return {
        line: output.trim(),
        lastWord: word
    };
}

var poemFunctions = {
    freeform: function () {
        return Array.apply(null, Array(10)).map(_ => generateLine({ }).line);
    },

    haiku: function () {
        return [ generateLine({ syllables: 5 }), generateLine({ syllables: 7 }), generateLine({ syllables: 5 }) ];
    },

    iambicPentameter: function () {
        return Array.apply(null, Array(10)).map(_ => generateLine({ syllables: 10, requireIambic: true }).line);
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
    fetch("https://gist.githubusercontent.com/arbaliste/b0779f332822e019fd323a6a39338f0a/raw/c2b1ad59e3790f75da87c6249a563345e4b9bdc7/portrait.json")
    .then(data => data.json())
    .then(json => {
        window.possibleChains = json.chains;
        window.wordData = json.wordData;
        window.ready = true;
    });
}

function generatePoem() {
    if (!window.ready) {
        alert("Not ready!")
        return;
    }
    window.chain = window.possibleChains[document.getElementById("markovLength").selectedIndex];
    var sel = document.getElementById("poemType");
    var func = poemFunctions[sel.options[sel.selectedIndex].text];
    document.getElementById("poem").innerHTML = func().join("<br />");
}
