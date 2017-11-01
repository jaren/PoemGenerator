window.maxLineLength = 100;
window.maxTries = 10000;

function splitWord(word) {
    return word.trim().split(" ").filter(x => x.length > 0);
}

function getSyllables(word) {
    return splitWord(word).map(x => window.wordData[x].syllables).reduce((x, y) => x + y);
}

function getStresses(word) {
    return splitWord(word).map(x => window.wordData[x].pronounce.replace(/[^0-9]/g, "")).reduce((x, y) => x + y).split("").map(x => parseInt(x));
}

function checkIambic(word, reversed) {
    // Only valid for even syllables
    var stresses = getStresses(word).map(x => x == 0 ? 0 : 1);
    if (reversed) stresses.reverse();
    for (let i = 0; i < stresses.length; i++) {
        if (stresses[i] != (reversed ? i + 1 : i) % 2) return false;
    }
    return true;
}

function getRhymeStem(word) {
    var pronounce = splitWord(window.wordData[splitWord(word).slice(-1)[0]].pronounce.replace(/[0-9]/g, ""));
    pronounce.splice(0, pronounce.lastIndexOf(pronounce.filter(x => /[AEIOU]/.test(x)).slice(-1)[0]));
    return pronounce.join(" ");
}

function getRhymes(word) {
    var list = window.rhymes[getRhymeStem(word)];
    list.splice(list.indexOf(word), 1);
    return list;
}

function forceFunction(func, hideAlert) {
    var result = null;
    var tries = 0;
    while (result == null) {
        result = func();
        if (tries++ > window.maxTries) {
            if (!hideAlert) alert("Poem generation failed. You can try again, but the current dataset may not have any matches :(");
            return null;
        }
    }
    return result;
}

function forceGenerateLine(constraints, hideAlert) {
    return forceFunction(() => generateLine(constraints), hideAlert);
}

function generateLine(constraints) {
    /* Format:
    {
        startWord: "",
        syllables: 10,
        requireIambic: false, // Requires syllables
        reversed: true

        notRoot: false,
        previous: null
    }
    */
    if (constraints.startWord == null) constraints.startWord = "\n";
    if (constraints.previous == null) constraints.previous = "";

    var chain = constraints.reversed ? window.flippedChain : window.chain;

    /* This is a mess... */
    var output = "";
    var word = "\n";
    if (constraints.syllables != null) {
        var possibilities = Object.keys(chain[constraints.startWord]).filter(x => {
            return (x != "\n")
                && (constraints.requireIambic == null
                    || constraints.requireIambic == false
                    || (constraints.reversed ? checkIambic(x + " " + constraints.previous, true) : checkIambic(constraints.previous + " " + x)))
                && (getSyllables(x) <= constraints.syllables);
        });
        if (possibilities.length == 0) return null;
        var currentWord = randomElement(possibilities);
        var syllablesLeft = constraints.syllables && (constraints.syllables - getSyllables(currentWord));
        var next = {};
        if (syllablesLeft !== 0) {
            next = generateLine(Object.assign({}, constraints, {
                syllables: syllablesLeft,
                startWord: currentWord,
                previous: constraints.reversed ? (currentWord + " " + constraints.previous) : (constraints.previous + " " + currentWord)
            }));
        }
        if (next == null) return null;
        if (constraints.reversed)
            output = (next.line || "") + " " + currentWord;
        else
            output = currentWord + " " + (next.line || "");
        word = next.lastWord || currentWord;
    } else {
        for (let count = 0; ; count++) {
            word = randomWeighted(chain[word]);
            if (count > window.maxLineLength || word == "\n") break;
            if (constraints.reversed)
                output = word + " " + output;
            else
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
        return Array.apply(null, Array(10)).map(_ => forceGenerateLine({}).line);
    },

    haiku: function () {
        return [forceGenerateLine({ syllables: 5 }).line, forceGenerateLine({ syllables: 7 }).line, forceGenerateLine({ syllables: 5 }).line];
    },

    iambicPentameter: function () {
        return Array.apply(null, Array(10)).map(_ => forceGenerateLine({ syllables: 10, requireIambic: true }).line);
    },

    sonnet: function () {
        function generateRhyme() {
            return forceFunction(() => {
                var rhymePossibilities = Object.keys(window.rhymes).filter(x => window.rhymes[x].filter(y => checkIambic(y, true)).length >= 2);
                var chosenRhyme = window.rhymes[randomElement(rhymePossibilities)].filter(x => checkIambic(x, true));
                var word1 = randomElement(chosenRhyme);
                chosenRhyme.splice(chosenRhyme.indexOf(word1), 1);
                var word2 = randomElement(chosenRhyme);
                var line1 = forceGenerateLine({ startWord: word1, previous: word1, syllables: 10 - getSyllables(word1), requireIambic: true, reversed: true }, true);
                var line2 = forceGenerateLine({ startWord: word2, previous: word2, syllables: 10 - getSyllables(word2), requireIambic: true, reversed: true }, true);
                if (line1 != null && line2 != null) return [line1.line + " " + word1, line2.line + " " + word2];
            });
        }

        var lines = Array.apply(null, Array(7)).map(_ => generateRhyme());
        return [
            lines[0][0], lines[1][0], lines[0][1], lines[1][1], "", 
            lines[2][0], lines[3][0], lines[2][1], lines[3][1], "",
            lines[4][0], lines[5][0], lines[4][1], lines[5][1], "",
            lines[6][0], lines[6][1]];
    }
};

function init(url) {
    document.getElementById("generate").innerHTML = "Loading...";
    var sel = document.getElementById("poemType");
    for (let key in poemFunctions) {
        let opt = document.createElement("option");
        opt.value = key;
        opt.innerHTML = key;
        sel.appendChild(opt);
    }
    sel.getElementsByTagName("option")[0].selected = "selected";
    fetch(url)
        .then(data => data.json())
        .then(json => {
            window.possibleChains = json.chains;
            window.wordData = json.wordData;
            window.ready = true;
            document.getElementById("generate").innerHTML = "Generate";
        })
        .catch(_ => {
            alert("Invalid data!");
            document.getElementById("generate").innerHTML = "Generate";
            window.ready = true;
        });
}

function generatePoem() {
    if (!window.ready) {
        alert("Not ready!")
        return;
    }
    window.chain = window.possibleChains[document.getElementById("markovLength").selectedIndex];

    // Build reverse chain
    window.flippedChain = reverseChain(window.chain);

    // Build rhyme list
    window.rhymes = {};
    var keys = Object.keys(window.chain).filter(x => x != "\n");
    var stems = keys.map(x => getRhymeStem(x));
    for (let i = 0; i < keys.length; i++) {
        if (window.rhymes[stems[i]] == null) window.rhymes[stems[i]] = [];
        window.rhymes[stems[i]].push(keys[i]);
    }

    //Generate poem
    var sel = document.getElementById("poemType");
    var func = poemFunctions[sel.options[sel.selectedIndex].text];
    document.getElementById("poem").innerHTML = func().join("<br />");
}
