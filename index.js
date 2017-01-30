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
                // console.log();
                check_length(v.input, v.line);
                check_kakari_subj(v.output, v.line);
                check_kakari_verbose(v.output, v.line);
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
    // console.log(obj);
    let id = Object.keys(obj);
    // console.log(id);
    for (let to = id.length - 1; to > 0; to--) {
        let list = [];
        for (let from = 0; from < id.length; from++) {
            if (obj[id[from]].to === id[to] && obj[id[from]].type.match(/^[DO]$/)) {
                list.push(obj[id[from]].phrase);
            }
        }

        if (list.length < 1) continue;
        {
            // console.log(list);
            let join = "";
            for (var key in list) {
                join += list[key] + "|";
            }
            join = join.substr(0, join.length - 1);
            warning(`check meaning of \`${join} -> ${obj[to].phrase}'`, line);
        }

        {
            let pos = [
                find_kaku(/(は|が)$/, list),
                find_kaku(/を$/, list),
                find_kaku(/から$/, list),
                find_kaku(/に$/, list)
            ];
            // console.log(pos);
            if (pos.length >= 2) {
                for (let i = 0; i < pos.length; i++) {
                    for (let p = i + 1; p < pos.length; p++) {
                        if (pos[i] > pos[p] && pos[i] >= 0 && pos[p] >= 0) {
                            error(`reversed word order ${list[pos[p]]} -> ${list[pos[i]]}`, line);
                        }
                    }
                }
            }
        }

    }
};

let check_kakari_subj = (obj, line) => {
    // console.log(obj);
    let id = Object.keys(obj);
    let last_id = id[id.length - 1];
    let list = [];

    for (let from = 0; from < id.length; from++) {
        if (obj[id[from]].type === 'A') continue;
        if (obj[id[from]].type === 'P') continue;
        list.push(obj[id[from]].phrase);
    }
    // console.log(list);
    if (find_kaku(/(は|が)$/, list) === -1) {
        error(`misssing subject for ${obj[last_id]}`, line);
    }
};

let check_kakari_verbose = (obj, line) => {
    let id = Object.keys(obj);

    let RULES = {
        'している': 'する',
        'について': 'を',
        'など': '(削除する)',
        'を行う': 'する',
        'なる': '(具体的に)',
        'に関して': '(具体的に)',
        'とき': '時'
    };
    // console.log(id);
    for (let from = 0; from < id.length; from++) {
        for (let key in RULES) {
            if (obj[from].phrase.match(new RegExp(key))) {
                error(`avoid using \`${key}\' (instead use \`${RULES[key]}\')`, line);
            }
        }
    }
};

let find_kaku = (regexp, list) => {
    for (let i = 0; i < list.length; i++) {
        if (list[i].match(regexp)) return i;
    }
    return -1;
};

let error = (str, line) => {
    console.log(`${line + 1}: **** ${str}`)
};

let warning = (str, line) => {
    console.log(`${line + 1}: ${str}`)
};