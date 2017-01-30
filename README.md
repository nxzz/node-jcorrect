### node-jcorrect
- 日本語文書校正ツール jcorrect をnode.js向けに移植したもの。
- "check_kakari_parallel"が移植できていないため、完全移植ではない。

```
npm i https://github.com/ht14a022/node-jcorrect
```

``` JavaScript
const jc = require('node-jcorrect');
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
    }).catch((err) => {
        console.log(err);
    });
let error = (str, line) => {
    console.log(`${line + 1}: **** ${str}`)
};

let warning = (str, line) => {
    console.log(`${line + 1}: ${str}`)
};
```

```
技術文書は簡潔であることが重要です。
1: check meaning of `ことが -> 重要です。'
1: check meaning of `簡潔である -> ことが'
1: check meaning of `技術文書は -> 簡潔である'
```