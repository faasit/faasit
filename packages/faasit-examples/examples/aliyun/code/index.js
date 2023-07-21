'use strict'

exports.handler = (event,context,callback) => {
    console.log('hello world');
    event = event ? event : {};
    callback(null,{
        'hello' : 'world',
        event
    });
}