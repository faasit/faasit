function getZeroPrefixInt(num: number, len: number): string{
    return ("000000"+num).substring(-len)
}

export function getSecondBasedTime(): string{
    const date = new Date()
    return `${getZeroPrefixInt(date.getFullYear(), 2)}_\
${getZeroPrefixInt(date.getMonth(), 2)}_\
${getZeroPrefixInt(date.getDay(), 2)}_\
${getZeroPrefixInt(date.getHours(), 2)}_\
${getZeroPrefixInt(date.getMinutes(), 2)}_\
${getZeroPrefixInt(date.getSeconds(), 2)}`
}