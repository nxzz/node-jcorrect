"use strict";
const fs = require('fs');
const readline = require('readline');
const spawn = require('child_process').spawn;

const MAX_PHRASE_LEN = 60;
const MAX_SENTENCE_LEN = 60;


const rs = fs.ReadStream('./test.txt');
const rl = readline.createInterface({ 'input': rs, 'output': {} });

let buf = "";
let arr = [];
rl.on('line', (line) => {
    buf += line
        .replace(/^\s*-\s*/g, "")
        .replace(/\[\d{5}\]/g, "")
        .replace(/^\s+/g, "")
        .replace(/\s+$/g, "");
});
// rl.resume();
rl.on('pause', () => {
    console.log('Readline end.');
    arr = buf
        .split("。")
        .map((e) => {
            return e.replace(/\(.*?\)/g, "") + "。";;
        })
        .filter((e) => { return e !== "。"; });

    let que = [];
    arr.forEach((v, i, a) => {
        que.push(dump_kakari(v, i))
    });

    Promise
        .all(que)
        .then((data) => {
            // console.log(data);
            data.forEach((v, i, a) => {
                console.log(v.input.replace(/、/g, "、\n") + "\n");
                console.log(v.output + "\n");
                check_length(v.input, v.index);
            });
        }).catch((err) => {
            console.log(err);
        });

});

let dump_kakari = (str, index) => {
    return new Promise((resolve, reject) => {
        let child = spawn('cabocha');
        child.stdin.setEncoding('utf-8');

        child.stdin.write(str);
        child.stdin.write("\n");
        child.stdin.end();

        let out = "";
        child.stdout.on('data', (data) => {
            out += data.toString();
        });

        child.on('exit', () => {
            resolve({
                output: out.replace("\nEOS\n", ""),
                index: index,
                input: str
            });
        });

        child.stdout.on('error', (err) => {
            reject(err);
        });
    });
};

let check_length = (str, line) => {
    if (str.length > MAX_SENTENCE_LEN) {
        error(`too long sentence (should be <= ${MAX_SENTENCE_LEN} chars)`, line);
    }
    str
        .split("、")
        .forEach((v, i, a) => {
            if (v.length > MAX_PHRASE_LEN) {
                error(`too long phrase (should be <= ${MAX_PHRASE_LEN} chars)`, line);
            }
        });
};


let error = (str, line) => {
    console.log(`${line}: **** ${str}`)
};

let warning = (str, line) => {
    console.log(`${line}: ${str}`)
};