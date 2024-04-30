# decorators

import asyncio
from dataclasses import dataclass
from aiohttp import web
from typing import Any, Callable, Dict, Optional, Type, TypeVar
import aiohttp
import httpx
import logging
from multidict import MultiMapping

import pydantic

logger = logging.getLogger(__name__)


class RpcPanicException(Exception):
    pass


def rpc_method(default: bool = False):
    def decorator(fn):
        fn.__rpc_meta__ = _TRpcMetaMethod(default=default)
        return fn

    return decorator


class RpcClient:
    def __init__(self, url: str, timeout_secs: Optional[float] = 3600) -> None:
        self._base_url = url
        self._timeout = httpx.Timeout(timeout_secs)
        self.call = RpcClientCall(self)
        self.acall = RpcClientAsyncCall(self)

    def _to_dict(self, tag: str, arg: Any):
        if isinstance(arg, pydantic.BaseModel):
            return {"$tag": tag, "$data": arg.model_dump()}
        else:
            return {"$tag": tag, "$data": arg}


class RpcClientCall:
    def __init__(self, parent: RpcClient) -> None:
        self._parent = parent
        self._http_client = httpx.Client(
            base_url=self._parent._base_url, timeout=self._parent._timeout
        )

    def invoke(self, name: str, arg: Any):
        req = self._parent._to_dict(name, arg)
        return self.send(req)

    def send(self, data: Any):
        resp = self._http_client.post("/", json=data)
        if not resp.status_code == 200:
            raise ValueError(f"rpc call failed: {resp.text}")
        reply = _TRpcReply.model_validate_json(resp.text)
        if not reply.ok:
            raise ValueError(f"rpc call failed: {reply.error}")
        return reply.data


class RpcClientAsyncCall:
    def __init__(self, parent: RpcClient) -> None:
        self._parent = parent

    async def invoke(self, name: str, arg: Any):
        req = self._parent._to_dict(name, arg)
        return await self.send(req)

    async def send(self, data: Any):
        async with httpx.AsyncClient(
            base_url=self._parent._base_url, timeout=self._parent._timeout
        ) as client:
            resp = await client.post("/", json=data)
        if not resp.status_code == 200:
            raise ValueError(f"rpc call failed: {resp.text}")
        reply = _TRpcReply.model_validate_json(resp.text)
        if not reply.ok:
            raise ValueError(f"rpc call failed: {reply.error}")
        return reply.data


# _ServerImpl

_T = TypeVar("_T", bound=pydantic.BaseModel)


@dataclass
class RpcRequestMeta:
    remote_addr: str
    headers: MultiMapping[str]


@dataclass
class RpcRequest:
    metadata: RpcRequestMeta
    tag: str
    data: Any

    def to_pydantic(self, cls: Type[_T]) -> _T:
        return cls.model_validate(self.data)


class RpcResponse:
    pass


@dataclass
class _TRpcMetaMethod:
    default: bool
    pass


class _TRpcReply(pydantic.BaseModel):
    ok: bool
    error: Any = None
    data: Any = None


@dataclass
class _TRpcServiceInfo:
    methods: Dict[str, Callable[[Any], Any]]
    default_method: Optional[Callable[[Any], Any]] = None

    @staticmethod
    def create_by_service(service: object) -> "_TRpcServiceInfo":
        info = _TRpcServiceInfo({}, None)

        for name in dir(service):
            if name.startswith("_"):
                continue

            fn = getattr(service, name, None)

            if not callable(fn):
                continue

            meta = getattr(fn, "__rpc_meta__", None)
            if not meta:
                continue

            assert isinstance(meta, _TRpcMetaMethod)

            if meta.default:
                if info.default_method:
                    raise ValueError(
                        f"multiple default methods found: {info.default_method} and {fn}"
                    )
                info.default_method = fn
            info.methods[name] = fn
        return info


class _AsyncRpcServer:
    def __init__(self, service_info: _TRpcServiceInfo, on_shutdown=None) -> None:
        self._on_shutdown = on_shutdown
        self._service_info = service_info

    def set_on_shutdown(self, on_shutdown):
        self._on_shutdown = on_shutdown

    async def handle_rpc(self, req: RpcRequest) -> _TRpcReply:
        method = self._service_info.default_method
        if req.tag:
            method = self._service_info.methods.get(req.tag)

        if not req.tag and not method:
            return _TRpcReply(ok=False, error=dict(msg="no default method found"))

        if not method:
            return _TRpcReply(
                ok=False,
                error=dict(
                    msg=f"no such tag={req.tag}, valid tags={self._service_info.methods.keys()}"
                ),
            )

        try:
            ret = await method(req)
            return _TRpcReply(ok=True, data=ret)
        except RpcPanicException as e:
            logging.exception(f"RpcPanicException: {e}, stop server")
            if self._on_shutdown:
                await self._on_shutdown()
            return _TRpcReply(ok=False, error=dict(msg="RpcPanicException"))
        except Exception as e:
            logger.exception(f"Failed to handle rpc request: {e}")
            return _TRpcReply(ok=False, error=dict(exception=repr(e)))

    async def handle_aiohttp(self, request: web.Request) -> web.Response:
        try:
            request_json = await request.json()

            tag = request_json.get("$tag", "")
            data = request_json.get("$data", request_json)

            logger.info(f"Received rpc request from {request.remote}, tag={tag}")

            reply = await self.handle_rpc(
                RpcRequest(
                    metadata=RpcRequestMeta(
                        remote_addr=str(request.remote), headers=request.headers
                    ),
                    tag=tag,
                    data=data,
                )
            )

            return web.json_response(reply.model_dump())

        except RpcPanicException as e:
            raise e
        except Exception as e:
            logger.exception(f"Failed to handle aiohttp request: {e}")
            return web.json_response(
                _TRpcReply(ok=False, error=dict(exception=repr(e))).model_dump()
            )


async def start_async_rpc_server(rpc_service: object, host="0.0.0.0", port=9000):
    app = web.Application()

    service_info = _TRpcServiceInfo.create_by_service(rpc_service)
    rpc_server = _AsyncRpcServer(service_info)

    app.add_routes([web.post("/", rpc_server.handle_aiohttp)])
    app.add_routes([web.post("/invoke", rpc_server.handle_aiohttp)])

    runner = web.AppRunner(app)

    shutdown = [False]
    running = asyncio.get_running_loop().create_future()

    async def stop_server():
        if shutdown[0]:
            return
        logger.info("Stopping rpc server...")
        shutdown[0] = True
        running.set_result(None)

    rpc_server.set_on_shutdown(stop_server)

    await runner.setup()
    site = web.TCPSite(runner, host, port)

    await site.start()

    try:
        logger.info(f"Starting rpc server on port {port}...")
        await running
        logger.info("rpc server stopped")
    except KeyboardInterrupt:
        pass
    finally:
        await runner.cleanup()

    return


def graceful_async_run(coro):
    try:
        asyncio.run(coro)
    except KeyboardInterrupt:
        logger.info("KeyboardInterrupt, stopping...")
