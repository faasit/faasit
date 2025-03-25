export interface ConfigEntry {
    time: number;         // 触发时间（秒）
    model: string;         // 模型类型（Uniform/Poisson/ONOFF）
    mode: 0 | 1;          // 0=持续时间模式，1=请求次数模式
    primaryParam: number;  // 主参数（对应模式的数值）
    params: number[];     // 模型专属参数
}