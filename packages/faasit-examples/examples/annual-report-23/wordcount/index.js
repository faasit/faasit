function WordCount (text, batchSize = 10) {
  const splitWords = (text) => {
    return text.split(/[\s,\.]+/).filter(Boolean);
  };

  const countWords = (words) => {
    const counter = new Map();
    for (const word of words) {
      const count = counter.get(word) || 0;
      counter.set(word, count + 1);
    }
    return Array.from(counter.entries());
  };

  const sortCounts = (countArrays) => {
    const counter = new Map();
    for (const arr of countArrays) {
      for (const [word, count] of arr) {
        const currentCount = counter.get(word) || 0;
        counter.set(word, currentCount + count);
      }
    }
    return Array.from(counter.entries()).sort((a, b) => {
      return b[1] - a[1] || a[0].localeCompare(b[0]);
    });
  };

  const words = splitWords(text);

  let batchResults = [];
  for (let i = 0; i < words.length; i += batchSize) {
    const batch = words.slice(i, i + batchSize);
    const countResult = countWords(batch);
    batchResults.push(countResult);
  }

  const sortedResult = sortCounts(batchResults);

  return sortedResult;
};

module.exports = { WordCount };
