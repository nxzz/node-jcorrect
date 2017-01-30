"use strict";
const fs = require('fs');
const readline = require('readline');

const jc = require('./node-jcorrect');

const rs = fs.ReadStream('./test.txt');
const rl = readline.createInterface({ 'input': rs, 'output': {} });

let buf = "";
rl.on('line', (line) => buf += line);
// rl.resume();
rl.on('pause', () => {
    jc.run(buf)
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
        }).catch((err) => {
            console.log(err);
        });
});

let error = (str, line) => {
    console.log(`${line + 1}: **** ${str}`)
};

let warning = (str, line) => {
    console.log(`${line + 1}: ${str}`)
};