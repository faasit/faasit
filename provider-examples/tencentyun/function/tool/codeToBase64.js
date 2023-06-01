import { readFileSync } from 'fs';
import { resolve } from 'path';

export default (path) => {
  console.log(path);
  const filePath = resolve(path);
  return readFileSync(filePath).toString('base64');
}