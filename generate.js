function generate() {
    var input = document.getElementById("text").value;
    var output = {
        wordData: {},
        chains: [
            buildChain(input, 1),
            buildChain(input, 2),
            buildChain(input, 3)
        ]
    };
    var words = Object.keys(output.chains[0]);
    function finished() {
        document.getElementById("output").value = JSON.stringify(output);
        alert("Done!");
    }
    (function addWord(index) {
        var word = words[index];
        if (word == "\n") return addWord(index + 1);
        fetch("https://api.datamuse.com/words?qe=sp&md=sr&max=1&sp=" + word)
        .then(data => data.json())
        .then(data => data[0])
        .then(json => {
            if (index >= words.length) return finished();
            output.wordData[word] = {
                syllables: json.numSyllables,
                pronounce: json.tags.filter(x => x.startsWith("pron:"))[0].substring(5)
            };
            return addWord(index + 1);
        });
    })(0);
}