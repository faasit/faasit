const fs = require('fs');
const path = require('path');
const { faker } = require('@faker-js/faker');

const file_path = path.join(__dirname, 'text.txt');

// 生成一篇随机的文章
let text = "";
for (let i = 0; i < 100000; i++) {
    text += faker.lorem.paragraphs(1) + "\n\n";
}


fs.writeFile(file_path, text, (err) => {
    if (err) {
        console.error('error:', err);
    } else {
        console.log('text.txt saved.');
    }
});
