"use strict";
const fs = require('fs');
const readline = require('readline');
const spawn = require('child_process').spawn;
const xml2js = require('xml-js');

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
            let que2 = [];
            data.forEach((v, i, a) => {
                // console.log(v.input.replace(/、/g, "、\n") + "\n");
                // console.log(v.output + "\n");
                // check_length(v.input, v.index);

                // console.log(v.input, v.index);
                que2.push(check_kakari(v.input, v.line));
            });
            return Promise.all(que2);
        })
        .then((data) => {
            console.log(data.length);
            data.forEach((v, i, a) => {
                console.log(v.line, v.output);
                // console.log(v);
            });
        })
        .catch((err) => {
            console.log(err);
        });

});

let dump_kakari = (str, line) => {
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
                line: line,
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

let check_kakari = (str, line) => {
    return new Promise((resolve, reject) => {
        let child = spawn('cabocha', ['-f1']);
        child.stdin.setEncoding('utf-8');

        child.stdin.write(str);
        child.stdin.write("\n");
        child.stdin.end();

        let out = "";
        child.stdout.on('data', (data) => {
            out += data;
        });

        child.on('exit', () => {
            let str = out.toString().replace("EOS", "").split(/\n/);

            let output = [];
            let temp = {};
            for (let i = 0; i < str.length; i++) {
                if (str[i].substr(0, 1) === '*') {

                    output.push(temp);
                    temp = {};
                    let dumy, from_id, to_id;
                    [dumy, from_id, to_id] = str[i].split(/\s+/);
                    temp.to = to_id.substr(0, to_id.length - 1);
                    temp.type = to_id.substr(to_id.length - 1);
                    temp.phrase = '';
                } else {
                    let word, yomi, orig, type;
                    [word, yomi, orig, type] = str[i].split(/\s+/);

                    if (type === '記号-句点') continue;
                    if (type === '記号-読点') continue;
                    temp.phrase += word;
                    if (type === '連体詞') warning(`check referred word/phrase by ${word}'`, line);
                }
            }
            output.push(temp);
            output.shift();

            resolve({
                output: output,
                line: line,
                input: str
            });
        });

        child.on('error', (err) => {
            reject(err);
        });
    });
};


let error = (str, line) => {
    console.log(`${line}: **** ${str}`)
};

let warning = (str, line) => {
    console.log(`${line}: ${str}`)
};