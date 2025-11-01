"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanTaskText = cleanTaskText;
const escapeRegExp_1 = require("./escapeRegExp");
function cleanTaskText(originalText, dateMatch, timeMatch) {
    let result = originalText;
    if (dateMatch) {
        // remove leading ' в ' + dateMatch (e.g. ' в завтра') and standalone dateMatch
        let regexDate = new RegExp(`\\s+в\\s*${(0, escapeRegExp_1.escapeRegExp)(dateMatch)}`, "i");
        result = result.replace(regexDate, "").trim();
        regexDate = new RegExp((0, escapeRegExp_1.escapeRegExp)(dateMatch), "i");
        result = result.replace(regexDate, "").trim();
    }
    if (timeMatch) {
        // remove leading ' в ' + timeMatch and standalone timeMatch
        let regexTime = new RegExp(`\\s+в\\s*${(0, escapeRegExp_1.escapeRegExp)(timeMatch)}`, "i");
        result = result.replace(regexTime, "").trim();
        regexTime = new RegExp((0, escapeRegExp_1.escapeRegExp)(timeMatch), "i");
        result = result.replace(regexTime, "").trim();
    }
    // remove leftover leading connectors like 'в ' at end if any
    result = result.replace(/\s{2,}/g, " ").trim();
    return result;
}
exports.default = cleanTaskText;
