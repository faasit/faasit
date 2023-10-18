var express = require('express');
var bodyParser = require('body-parser');
var app = express();

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

app.post("/", async (req,res) => {
    var runTimeDate = getDate();
    console.log(`[${runTimeDate}]: Function Start`)

    const codeDir = 'code'
    const codeName = 'index'
    // exec(`node /${codeDir}/${codeName}`, (error, stdout, stderr) => {
    //     if (error) {
    //         console.error(`Error executing function: ${error.message}`)
    //         return;
    //     }
    //     if (stderr) {
    //         console.error(`Stderr: ${stderr}`);
    //         return;
    //     }
    //     try {
    //         const respFromCode = stdout;
    //         console.log(respFromCode);
    //         res.send('Hello World')
    //     } catch(err) {
    //         console.error(`Error parsing JSON: ${err.message}`)
    //     }
    // })
    const functionInvoke = require(`/${codeDir}/${codeName}`)
    const event = req.body;
    const context = null;
    const result = await functionInvoke.handler(event,context);
    res.json(result);

    runTimeDate = getDate();
    console.log(`[${runTimeDate}]: Function End`)
})

const port = 9000

app.listen(port, ()=>{
    console.log(`Server is running on http://127.0.0.1:${port}`)
})
