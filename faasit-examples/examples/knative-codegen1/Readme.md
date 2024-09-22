
## Intro

目录 `code/gen` 下的源代码文件，如 `types.d.ts` 是根据 `main.ft` 自动生成的代码

## Test

```sh
curl -v -X POST \
    -H "content-type: application/json"  \
    -H "ce-specversion: 1.0"  \
    -H "ce-source: curl-command"  \
    -H "ce-type: curl.demo"  \
    -H "ce-id: 123-abc"  \
    -d '{"name":"Dave"}' \
    http://localhost:8080
```

## Resources

- https://github.com/knative/docs/tree/main/code-samples/serving/cloudevents/cloudevents-nodejs
