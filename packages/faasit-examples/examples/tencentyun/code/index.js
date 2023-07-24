exports.main_handler = async (event, context) => {
  console.log("test");
  const result = {
    msg: 'hello world',
    event: event,
  }

  return result
};