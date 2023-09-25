// Monarch syntax highlighting for the faasit language.
export default {
    keywords: [
        'block','for','import','lib','shape','struct','use'
    ],
    operators: [
        ',','.','<','=','>','@'
    ],
    symbols:  /\(|\)|,|\.|<|=|>|@|\[|\]|\{|\}/,

    tokenizer: {
        initial: [
            { regex: /-?[0-9]+\.[0-9]*/, action: {"token":"number"} },
            { regex: /-?[0-9]+/, action: {"token":"number"} },
            { regex: /"(\\.|[^"\\])*"|'(\\.|[^'\\])*'/, action: {"token":"string"} },
            { regex: /[_a-zA-Z][\w_]*/, action: { cases: { '@keywords': {"token":"keyword"}, '@default': {"token":"ID"} }} },
            { include: '@whitespace' },
            { regex: /@symbols/, action: { cases: { '@operators': {"token":"operator"}, '@default': {"token":""} }} },
        ],
        whitespace: [
            { regex: /\s+/, action: {"token":"white"} },
            { regex: /\/\*/, action: {"token":"comment","next":"@comment"} },
            { regex: /\/\/[^\n\r]*/, action: {"token":"comment"} },
        ],
        comment: [
            { regex: /[^\/\*]+/, action: {"token":"comment"} },
            { regex: /\*\//, action: {"token":"comment","next":"@pop"} },
            { regex: /[\/\*]/, action: {"token":"comment"} },
        ],
    }
};
