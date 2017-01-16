"use strict";
const fs = require('fs');
const readline = require('readline');
const spawn = require('child_process').spawn;

const rs = fs.ReadStream('../test.txt');
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
            console.log(data);
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

        child.on('exit', function () {
            resolve({
                out: out,
                index: index,
                input: str
            });
        });

        child.stdout.on('error', (err) => {
            reject(err);
        });
    });
};