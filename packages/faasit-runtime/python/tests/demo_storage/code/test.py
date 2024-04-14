from dotenv import find_dotenv, load_dotenv
load_dotenv(find_dotenv())
import json
from index import handler;
import asyncio
inputData = {"filename":"storage_test_file"}
async def main():
    output = await handler(inputData)
    print(json.dumps(output))
loop = asyncio.get_event_loop()
loop.run_until_complete(main())
loop.close()