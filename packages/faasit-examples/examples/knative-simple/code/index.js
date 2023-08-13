const handle = async (context, body) => {
  context.log.info("query", context.query);
  context.log.info("body", body);

  if (context.method === 'POST') {
    return { body };
  } else if (context.method === 'GET') {
    return {
      query: context.query,
    }
  } else {
    return { statusCode: 405, statusMessage: 'Method not allowed' };
  }
}

module.exports = { handle };
