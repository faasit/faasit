async function main(event) {
  const result = {
    msg: 'hello world',
    event: event,
  }
  return result
}

main(process.argv.slice(2))