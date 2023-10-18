var express = require('express');
var bodyParser = require('body-parser');
var app = express();
const config = require("./config.json");
const axios = require("axios");

function setup() {
    const services = config.service
    var service_map = new Map();
    for ( const service in services ) {
        const port = services[service]
        service_map[service] = port
    }
    return service_map;
}

function getDate() {
    const currentDate = new Date();

    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2,'0');
    const day = String(currentDate.getDate()).padStart(2,'0');
    const hours = String(currentDate.getHours()).padStart(2,'0');
    const minutes = String(currentDate.getMinutes()).padStart(2,'0');
    const seconds = String(currentDate.getSeconds()).padStart(2,'0');

    const formattedDateTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    return formattedDateTime;
}

app.use(bodyParser.json());

app.use(bodyParser.urlencoded({extended: true}));

const service_map = setup()
for ( const service_name in service_map ) {
    const port = service_map[service_name];
    console.log(service_name);
    console.log(port);
    app.post(`/${service_name}`, async (req, res) => {
        const input = req.body;
        const url = `http://dag-wordcount-${service_name}-1:9000`;
        try {
            const axiosInstance = axios.create();
            
            const response = await axiosInstance.post(url,input);
            const data = await response.data;
            console.log(data)
            res.json(data)
    
        } catch (err) {
            console.error(`Fetch error: ${err}`)
        }
    })
}


const port = 9000

app.listen(port, ()=>{
    console.log(`Server is running on http://127.0.0.1:${port}`)
})
