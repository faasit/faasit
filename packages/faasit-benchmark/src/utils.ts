function getZeroPrefixInt(num: number, len: number): string{
    let strNum = num.toString()
    for(let i=strNum.length; i<len; i++) {
        strNum = "0"+strNum
    }
    return strNum
}

export function getSecondBasedTime(): string{
    const date = new Date()
    return `${getZeroPrefixInt(date.getFullYear(), 2)}_\
${getZeroPrefixInt(date.getMonth()+1, 2)}_\
${getZeroPrefixInt(date.getDate(), 2)}_\
${getZeroPrefixInt(date.getHours(), 2)}_\
${getZeroPrefixInt(date.getMinutes(), 2)}_\
${getZeroPrefixInt(date.getSeconds(), 2)}`
}