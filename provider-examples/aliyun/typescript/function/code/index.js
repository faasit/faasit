'use strict'

exports.handler = (event,context,callback) => {
    console.log('hello world');
    console.log(event.toString());
    console.log(event);
    // let res = JSON.parse(event.toString());
    callback(null,"helloworld");
}