const { createFunction } = require('@faasit/runtime')

const putAfter1s = createFunction(async (frt) => {
  const { fileName, content } = frt.input()
  console.log(`${frt.metadata().funcName} will put ${content} into ${fileName} after 1s`);
  await new Promise(resolve => setTimeout(resolve, 1000));
  frt.storage.put(fileName, content);
})

const executor = createFunction(async (frt) => {
  const { fileName } = frt.input();

  // put -> get -> list -> delete
  frt.storage.put(fileName, new Buffer.from('123'))
  const res1 = await frt.storage.get(fileName);
  console.log(res1.toString()); // '123'
  console.log(await frt.storage.list()); // [fileName]
  await frt.storage.delete(fileName)

  // list, exists, get when file is not exist
  console.log(await frt.storage.list()); // []
  console.log(await frt.storage.exists(fileName)); // false
  console.log(await frt.storage.get(fileName, 1000)); // null (after 1s)

  // async put and get
  frt.tell('putAfter1s', {
    input: {
      fileName: fileName,
      content: new Buffer.from('abc')
    }
  })
  const res2 = await frt.storage.get(fileName);
  console.log(res2.toString()); // 'abc' (after 1s)

  frt.storage.delete(fileName)
})

module.exports = { putAfter1s, executor }
