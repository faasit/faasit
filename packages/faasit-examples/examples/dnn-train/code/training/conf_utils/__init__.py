from dataclasses import dataclass
import dataclasses
import os
import pathlib
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field


class InputModel(BaseModel):
    name: str
    env: str = ""
    secret: bool = False
    default: Optional[Any] = None


class VarModel(BaseModel):
    name: str
    value: Any


class PropDefine(BaseModel):
    name: str
    default: Optional[Any] = None


class ComponentModel(BaseModel):
    name: str
    props: List[PropDefine] = Field(default_factory=list)
    render: Any


class ConfigComponent(BaseModel):
    name: str
    props: Dict[str, Any]


class ConfigTask(BaseModel):
    name: str
    config: Any = None


class ConfigModel(BaseModel):
    name: str
    component: Optional[ConfigComponent] = None
    task: Optional[ConfigTask] = None


class ResolvedConfigModel(BaseModel):
    name: str
    task: ConfigTask


class ConfigRootModel(BaseModel):
    inputs: List[InputModel] = Field(default_factory=list)
    vars: List[VarModel] = Field(default_factory=list)
    components: List[ComponentModel] = Field(default_factory=list)
    configs: List[ConfigModel] = Field(default_factory=list)


class ResolvedConfigRoot(BaseModel):
    configs: List[ResolvedConfigModel] = Field(default_factory=list)

    def get_config(self, name: str) -> ResolvedConfigModel:
        for conf in self.configs:
            if conf.name == name:
                return conf
        raise ValueError(f"config not found, name={name}")


@dataclass
class _SymtabResolveContext:
    use_extends: bool = True
    props: Dict[str, Any] = dataclasses.field(default_factory=dict)


class _SymbolTable:
    def __init__(self, envs: Dict[str, Any] = {}) -> None:
        self._input_values: Dict[str, Any] = {}
        self._vars: Dict[str, VarModel] = {}
        self._cache: Dict[str, Any] = {}
        self._envs: Dict[str, Any] = envs

    def add_input_value(self, name: str, value: Any):
        self._input_values[name] = value

    def add_var(self, var: VarModel):
        self._vars[var.name] = var

    def resolve(self, value: Any, ctx: _SymtabResolveContext) -> Any:
        if isinstance(value, str):
            if value.startswith("${") and value.endswith("}"):
                return self.lookup(value[2:-1], ctx)
            return value

        if isinstance(value, list):
            return [self.resolve(v, ctx) for v in value]

        if isinstance(value, Dict):
            out = {}

            extends = value.get("$extends", [])
            if ctx.use_extends:
                for ext in extends:
                    out.update(self.lookup(ext, ctx))
            else:
                # resolve $extends
                out["$extends"] = self.resolve(extends, ctx)

            for k, v in value.items():
                if k.startswith("$"):
                    continue
                out[k] = self.resolve(v, ctx)
            return out

        return value

    def lookup(self, id: Any, ctx: _SymtabResolveContext):
        cache_value = self._cache.get(id)
        if cache_value is not None:
            return cache_value

        prefix, path = id.split(".")

        def lookup_impl(prefix: str, path: str):
            if prefix == "inputs":
                value = self._input_values[path]
                if value is None:
                    raise ValueError(f"input not resolved, name={path}")
                return value
            elif prefix == "vars":
                return self._vars[path].value
            elif prefix == "envs":
                return self._envs[path]
            elif prefix == "props":
                return ctx.props[path]
            else:
                raise ValueError(f"unknown symbol id, prefix=${prefix}")

        value = lookup_impl(prefix, path)
        # TODO: avoid loop dependencies
        value = self.resolve(value, ctx)

        if prefix not in ("props"):
            self._cache[id] = value
        return value


class ConfigManager:
    def __init__(self, roots: List[ConfigRootModel], env: os._Environ) -> None:
        self._roots = roots
        self._symtab = _SymbolTable(envs={k: v for k, v in env.items()})

        self._inputs: Dict[str, InputModel] = {}
        self._vars: List[VarModel] = []
        self._component_defs: Dict[str, ComponentModel] = {}
        self._configs: List[ConfigModel] = []

        for root in self._roots:
            for input in root.inputs:
                self._inputs[input.name] = input
            for var in root.vars:
                self._vars.append(var)
            for comp in root.components:
                self._component_defs[comp.name] = comp
            for conf in root.configs:
                self._configs.append(conf)

        for var in self._vars:
            self._symtab.add_var(var)

    def feed_inputs(self, env: os._Environ, args: List[str]):
        env2input = {}
        for input in self._inputs.values():
            if input.env:
                env2input[input.env] = input

        values = {}
        # feed default first
        for input in self._inputs.values():
            if input.default is not None:
                values[input.name] = input.default

        # feed env then
        for env_key, input in env2input.items():
            value = env.get(env_key)
            if value:
                values[input.name] = value

        # feed cli then
        for arg in args:
            key, value = arg.split("=", 1)
            input_def = self._inputs.get(key)
            if not input_def:
                raise ValueError(f"Unknown input key {key}")
            values[input_def.name] = value

        # validate inputs
        for input in self._inputs.values():
            if input.name not in values:
                raise ValueError(f"input not resolved, name={input.name}")

        for name, value in values.items():
            self._symtab.add_input_value(name, value)

    def finalize(self, includes: List[str]) -> ResolvedConfigRoot:
        """merge all roots and resolve all references"""

        _includes = set(includes)

        root = ResolvedConfigRoot()

        # resolve configs
        for conf in self._configs:
            if len(_includes) != 0 and conf.name not in _includes:
                continue

            assert conf.task or conf.component
            assert not (conf.task and conf.component)

            new_conf = None
            if conf.task:
                new_conf = self._resolve_conf_task(conf.name, conf.task)
            if conf.component:
                new_conf = self._resolve_conf_component(conf.name, conf.component)
            else:
                raise ValueError("no task or component defined")

            root.configs.append(new_conf)

        return root

    def _resolve_conf_task(self, name: str, task: ConfigTask) -> ResolvedConfigModel:
        return ResolvedConfigModel(
            name=name,
            task=ConfigTask(
                name=self._symtab.resolve(task.name, _SymtabResolveContext()),
                config=self._symtab.resolve(task.config, _SymtabResolveContext()),
            ),
        )

    def _resolve_conf_component(
        self, name: str, component: ConfigComponent
    ) -> ResolvedConfigModel:
        def resolve_component() -> ConfigTask:
            comp_def = self._component_defs[component.name]

            props = {}

            for prop in comp_def.props:
                props[prop.name] = component.props[prop.name]

            comp = self._symtab.resolve(
                comp_def.render, _SymtabResolveContext(False, props)
            )

            comp = self._symtab.resolve(comp, _SymtabResolveContext())

            return ConfigTask.model_validate(comp["task"])

        return ResolvedConfigModel(name=name, task=resolve_component())


def read_configs(
    dir: Union[pathlib.Path, str],
    env: os._Environ,
    args: List[str],
    includes: Optional[List[str]] = None,
) -> ResolvedConfigRoot:
    import yaml

    dir = pathlib.Path(dir)
    args = list(filter(bool, args))

    configs = []
    for file in dir.glob("*.yaml"):
        obj = yaml.load(file.read_text(), Loader=yaml.SafeLoader)
        configs.append(ConfigRootModel.model_validate(obj))

    manager = ConfigManager(configs, env)

    manager.feed_inputs(env, args)
    return manager.finalize(includes or [])


def to_yaml(obj: BaseModel, hide_secrets: bool = True) -> str:
    import yaml

    # TODO: use dynamic taint marker to mark secret
    secret_keys = ("access_key_id", "access_key_secret")

    def _hide_secrets(obj):
        if isinstance(obj, list):
            return [_hide_secrets(v) for v in obj]
        if isinstance(obj, Dict):
            out = {}
            for k, v in obj.items():
                if k in secret_keys:
                    out[k] = "*** <hidden-secret> ***"
                else:
                    out[k] = _hide_secrets(v)
            return out
        return obj

    data = obj.model_dump()
    if hide_secrets:
        data = _hide_secrets(data)

    return yaml.dump(data, sort_keys=False)
