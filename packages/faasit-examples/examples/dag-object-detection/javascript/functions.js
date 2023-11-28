const { createFunction } = require('@faasit/runtime')
const tf = require('@tensorflow/tfjs-node');
const cocoSsd = require('@tensorflow-models/coco-ssd');

const preprocess = createFunction(async (frt) => {
  const { image } = frt.input()
  return frt.output({
    data: image.base64
  })
})

const detect = createFunction(async (frt) => {
  const { data } = frt.input()

  // Decode the base64 image to a tensor
  const imageBuffer = Buffer.from(data, 'base64')
  const imageTensor = tf.node.decodeImage(imageBuffer);

  // Load the COCO-SSD model
  const model = await cocoSsd.load();
  // Perform object detection
  const predictions = await model.detect(imageTensor);

  // Dispose the tensor to release memory
  tf.dispose(imageTensor);

  return frt.output({
    predictions
  })
})

const postprocess = createFunction(async (frt) => {
  const res = frt.input()
  return frt.output(res)
})

const executor = createFunction(async (frt) => {
  const input = frt.input()

  const r1 = await frt.call('preprocess', { input })
  const r2 = await frt.call('detect', {
    input: r1.output
  })
  const r3 = await frt.call('postprocess', {
    input: r2.output
  })

  return frt.output(r3.output)
})

module.exports = { preprocess, detect, postprocess, executor }