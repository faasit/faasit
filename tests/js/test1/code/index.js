const {createFunction,createExports} = require('@faasit/runtime')

const handler = createFunction(async (frt) => {
  const { data } = frt.input()

  return frt.output({
    status: 'ok',
    data
  })
}
)
module.exports = createExports({ handler })