window.maxLineLength = 100;
window.maxTries = 10000;

function getSyllables(word) {
    return word.trim().split(" ").map(x => window.wordData[x].syllables).reduce((x, y) => x + y);
}

function getStresses(word) {
    return word.trim().split(" ").map(x => window.wordData[x].pronounce.replace(/[^0-9]/g, "")).reduce((x, y) => x + y).split("").map(x => parseInt(x));
}

function checkIambic(word, reversed) {
    // Only works with even syllables
    var stresses = getStresses(word).map(x => x == 0 ? 0 : 1);
    for (let i = 0; i < stresses.length; i++) {
        if (stresses[i] != (reversed ? i + 1 : i) % 2) return false;
    }
    return true;
}

function getRhymeStem(word) {
    var pronounce = window.wordData[word.trim().split(" ").slice(-1)[0]].pronounce.replace(/[0-9]/g, "").split(" ").filter(x => x.length > 0);
    pronounce.splice(0, pronounce.lastIndexOf(pronounce.filter(x => /[AEIOU]/.test(x)).slice(-1)[0]));
    return pronounce.join(" ");
}

function getRhymes(word) {
    var list = window.rhymes[getRhymeStem(word)];
    list.splice(list.indexOf(word), 1);
    return list;
}

function forceGenerateLine(constraints, hideAlert) {
    var line = null;
    var tries = 0;
    while (line == null) {
        line = generateLine(constraints);
        if (tries++ > window.maxTries) {
            if (!hideAlert) alert("Poem generation failed, try again? :(");
            return null;
        }
    }
    return line;
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
            var result = forceGenerateLine(Object.assign({}, constraints, { notRoot: true }));
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
        return Array.apply(null, Array(10)).map(_ => generateLine({}).line);
    },

    haiku: function () {
        return [generateLine({ syllables: 5 }).line, generateLine({ syllables: 7 }).line, generateLine({ syllables: 5 }).line];
    },

    iambicPentameter: function () {
        return Array.apply(null, Array(10)).map(_ => generateLine({ syllables: 10, requireIambic: true }).line);
    },

    sonnet: function () {
        function generateRhyme() {
        }

        var lines = Array.apply(null, Array(5)).map(_ => generateRhyme());
        return [lines[0][0], lines[1][0], lines[0][1], lines[1][1], "", lines[2][0], lines[3][0], lines[2][1], lines[3][1], "", lines[4][0], lines[4][1]];
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
