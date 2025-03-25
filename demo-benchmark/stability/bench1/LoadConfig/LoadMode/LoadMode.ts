// Definition of LoadMode interface
export interface LoadMode {
  /**
 * 生成请求时间序列
 * @param params 从配置文件解析出的参数数组
 * @param mode 0=持续时间模式/1=次数模式
 * @param primaryParam 主参数（duration或count）
 */
  generate(
    mode: 0 | 1,
    primaryParam: number,
    params: number[]
  ): number[];
}