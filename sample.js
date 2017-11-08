const jc = require('./index');
jc.run("技術文書は簡潔であることが重要です。")
    .then((data) => {
        data.forEach((v, i, a) => {
            console.log(v.input);
            v.error.forEach((v2, i2, a2) => {
                error(v2, v.line);
            });
            v.warning.forEach((v2, i2, a2) => {
                warning(v2, v.line);
            });
        });
    })
    .catch((err) => {
        console.log(err);
    });
let error = (str, line) => {
    console.log(`${line + 1}: **** ${str}`)
};

let warning = (str, line) => {
    console.log(`${line + 1}: ${str}`)
};