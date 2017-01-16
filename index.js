"use strict";
const fs = require('fs');
const readline = require('readline');
const spawn = require('child_process').spawn;

const MAX_PHRASE_LEN = 60 / 2;
const MAX_SENTENCE_LEN = 180 / 2;


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


    let que2 = [];
    arr.forEach((v, i, a) => {
        que2.push(check_kakari(v, i));
    });
    Promise.all(que2)
        .then((data) => {
            data.forEach((v, i, a) => {
                console.log("\n\n");
                console.log(v.input);
                console.log();
                check_length(v.input, v.line);
                check_kakari_dep(v.output, v.line);
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

let check_kakari = (instr, line) => {
    return new Promise((resolve, reject) => {
        let child = spawn('cabocha', ['-f1']);
        child.stdin.setEncoding('utf-8');

        child.stdin.write(instr);
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
                input: instr
            });
        });

        child.on('error', (err) => {
            reject(err);
        });
    });
};

let check_kakari_dep = (obj, line) => {
    let list = {};

    obj
        .concat()
        .sort((a, b) => {
            if (a.to < b.to) return 1;
            if (a.to > b.to) return -1;
            return 0;
        })
        .forEach((v, i, a) => {
            if (!list[v.to]) list[v.to] = [];
            list[v.to].push(v);
        });

    let keylist = [];
    for (let key in list) {
        if (list.hasOwnProperty(key)) {
            keylist.push(key);
        }
    }
    keylist
        .reverse()
        .forEach((v, i, a) => {
            let element = list[v];
            if (element.length < 1) return;

            let join = "";
            for (var key in obj) {
                if (obj.hasOwnProperty(key) && obj[key].to === element[0].to) {
                    join += obj[key].phrase + "|";

                }
            }
            join = join.substr(0, join.length - 1);

            if (element[0].to < 0) return;
            warning(`check meaning of \`${join} -> ${obj[element[0].to].phrase}'`, line)
        });

};


let error = (str, line) => {
    console.log(`${line + 1}: **** ${str}`)
};

let warning = (str, line) => {
    console.log(`${line + 1}: ${str}`)
};