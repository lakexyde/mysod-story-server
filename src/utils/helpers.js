/**
 * 
 * @param {string} data 
 * @returns {json | null }
 */
function getJSON(data) {
    try {
        var o = JSON.parse(data, (_, value) => {
            if (["true", "false"].includes(value)) {
                return JSON.parse(value);
            }

            if (typeof value === 'string' && value.startsWith("{") && value.endsWith("}")) {
                return JSON.parse(value)
            }

            return value;
        });
        if (o && typeof o === 'object') {
            return o;
        }
    } catch (error) {
        for (const [key, value] of Object.entries(data)) {
            if (["true", "false"].includes(value)) {
                data[key] = JSON.parse(value);
            }
            if (
                typeof value === 'string'
                && ((value.startsWith("{") && value.endsWith("}")) || (value.startsWith("[") && value.endsWith("]")))
            ) {
                data[key] = JSON.parse(value)
            }
        }
        return data;
    }
    return data;
}

/**
 * 
 * @param {string} str 
 * @returns 
 */
function stringEscape(str) {
    return str.replace(/'/g, '\'\'');
}

/**
 * Util quote
 * @param {any} data 
 */
function quote(data) {
    switch (typeof data) {
        case 'string': return '\'' + stringEscape(data) + '\''
        case 'number': return data;
        default: '\'' + JSON.stringify(data) + '\'';
    }
}

/**
 * Capitalize text
 * @param {string} text 
 */
function capitalize(text) {
    let arr = [];
    let val = text.split(" ");
    for (let index = 0; index < val.length; index++) {
        const el = val[index].toLowerCase();
        arr.push(`${el[0].toUpperCase()}${el.slice(1)}`)
    }
    return arr.join(" ");
}

function getFileName(urlOrPath) {
    let fileName;

    try {
      // Parse the URL
      const parsedUrl = new URL(inputUrl);
  
      // For remote URLs
      fileName = path.basename(parsedUrl.pathname);
    } catch (error) {
      // If parsing as a URL fails, treat it as a local path
      fileName = path.basename(inputUrl);
    }
  
    return fileName;
  }

module.exports = {
    getJSON,
    capitalize,
    quote,
    getFileName
}