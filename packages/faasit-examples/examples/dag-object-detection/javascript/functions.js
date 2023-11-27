const { defineHandler } = require('@faasit/runtime')
const tf = require('@tensorflow/tfjs-node');
const cocoSsd = require('@tensorflow-models/coco-ssd');

const preprocess = defineHandler(async (frt) => {
  const { base64Image } = frt.input()
  const pattern = /^data:image\/(\w+);base64,/

  const type = pattern.exec(base64Image)[1]
  return {
    type,
    data: base64Image.replace(pattern, "")
  }
})

const detect = defineHandler(async (frt) => {
  const { type, data } = frt.input()

  // Decode the base64 image to a tensor
  const imageBuffer = Buffer.from(data, 'base64')
  let imageTensor;
  if (type == 'jpeg') {
    imageTensor = tf.node.decodeJpeg(imageBuffer);
  } else if (type == 'png') {
    imageTensor = tf.node.decodePng(imageBuffer);
  } else {
    throw new Error('Unsupported image format. Only JPEG and PNG are supported.');
  }

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

const executor = defineHandler(async (frt) => {
  const input = frt.input()

  const r1 = await frt.call('preprocess', { input })
  const r2 = await frt.call('detect', {
    input: r1.output
  })

  return frt.output(r2.output)
})

module.exports = { preprocess, detect, executor }