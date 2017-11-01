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

function reverseChain(chain) {
    var reverse = {};
    for (let key in chain) {
        for (let follow in chain[key]) {
            if (reverse[follow] == null) reverse[follow] = {};
            reverse[follow][key] = chain[key][follow];
        }
    }
    return reverse;
}
