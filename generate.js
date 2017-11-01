function generate() {
    var input = document.getElementById("text").value;
    var splitSentences = document.getElementById("splitSentences").checked;
    var stripChars = document.getElementById("stripChars").checked;
    var stripUrls = document.getElementById("stripUrls").checked;
    var output = {
        wordData: {},
        chains: []
    };

    for (let i = 0; i < document.getElementById("chainNum").value; i++)
        output.chains.push(buildChain(input, splitSentences, stripUrls, stripChars, 1));

    var words = Object.keys(output.chains[0]).filter(x => x != "\n");
    function finished() {
        document.getElementById("output").value = JSON.stringify(output);
        alert("Done!");
    }
    (function addWord(index) {
        if (index >= words.length) return finished();
        var word = words[index];
        fetch("https://api.datamuse.com/words?qe=sp&md=sr&max=1&sp=" + word)
        .then(data => data.json())
        .then(data => data[0])
        .then(json => {
            output.wordData[word] = {
                syllables: json.numSyllables,
                pronounce: json.tags.filter(x => x.startsWith("pron:"))[0].substring(5)
            };
            return addWord(index + 1);
        });
    })(0);
}