const { createFunction} = require('@faasit/runtime')
const path = require('path');
const fs = require('fs');

const split = createFunction(async (frt) => {
  const { text } = frt.input()

  const words = text.split(/[\s,\.]/)

  return frt.output({
    message: 'ok',
    words
  })
})

const nativeSplit = (input) => {
  const { text } = input

  const words = text.split(/[\s,\.]/)

  return {
    message: 'ok',
    words
  }
}

const executor = createFunction(async (frt) => {
  const { filename } = frt.input()
  const filePath = path.join(__dirname, filename);
  const text = fs.readFileSync(filePath).toString();
  const size = fs.statSync(filePath).size;

  const time1 = Date.now();
  const words1 = nativeSplit({ text })
  const time2 = Date.now();
  const words2 = (await frt.call('split', { input: { text } }));
  const time3 = Date.now();

  const executeTime1 = time2 - time1
  const executeTime2 = time3 - time2
  console.log("executeTime(native):", executeTime1, "ms");
  console.log("executeTime(Fassit-RT):", executeTime2, "ms");
  console.log("fileSize:", size, "Byte");
  console.log("executeTime(native)/executeTime(Fassit-RT):", executeTime1 / executeTime2);
  console.log("timeDiff/fileSize:", (executeTime2 - executeTime1) / size * 1024 * 1024, "ms/MB");


  return frt.output({
    message: 'ok',
  })
})

module.exports = { split, executor }
