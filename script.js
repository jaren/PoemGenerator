function getSyllables(word) {
    return word.split(" ").map(x => window.wordData[x].syllables).reduce((x, y) => x + y);
}

function getStresses(word) {
    return word.split(" ").map(x => window.wordData[x].pronounce.replace(/[^0-9]/g, "")).reduce((x, y) => x + y).split("").map(x => parseInt(x));
}

function getRhymes(word) {
    word = word.split(" ").slice(-1)[0];
    // TODO
}

function generateLine(constraints) {
    // TODO
    /*
    {
        startWord: "",
        requireIambic: false,
        syllables: 10,
        rhyme: "cat",
    }
    */
    if (constraints.startWord == null) constraints.startWord = "\n";

    var output = "";
    var word = "\n";
    if (constraints.syllables != null) {
        if (!constraints.notRoot) {
            var result;
            while (result == null) {
                result = generateLine(Object.assign({}, constraints, { notRoot: true }));
            }
            output = result.line;
            word = result.lastWord;
        } else {
            var possibilities = Object.keys(window.chain[constraints.startWord]).filter(x => (x != "\n") && (getSyllables(x) <= constraints.syllables));
            if (possibilities.length == 0) return null;
            var currentWord = randomElement(possibilities);
            var syllablesLeft = constraints.syllables - getSyllables(currentWord);
            var next = {};
            if (syllablesLeft > 0) next = generateLine(Object.assign({}, constraints, { syllables: syllablesLeft, startWord: currentWord }));
            if (next == null) return null;
            output = currentWord + " " + (next.line || "");
            word = next.lastWord || currentWord;
        }
    } else {
        for (let count = 0; ; count++) {
            word = randomWeighted(window.chain[word]);
            if (count > 100 || word == "\n") break;
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
        return [generateLine({ syllables: 5 }).line, generateLine({ syllables: 7 }).line, generateLine({ syllables: 5 }).line];
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
