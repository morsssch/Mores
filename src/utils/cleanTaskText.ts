import { escapeRegExp } from "./escapeRegExp";

export function cleanTaskText(
    originalText: string,
    dateMatch?: string,
    timeMatch?: string
): string {
    let result = originalText;

    if (dateMatch) {
        // remove leading ' в ' + dateMatch (e.g. ' в завтра') and standalone dateMatch
        let regexDate = new RegExp(`\\s+в\\s*${escapeRegExp(dateMatch)}`, "i");
        result = result.replace(regexDate, "").trim();

        regexDate = new RegExp(escapeRegExp(dateMatch), "i");
        result = result.replace(regexDate, "").trim();
    }

    if (timeMatch) {
        // remove leading ' в ' + timeMatch and standalone timeMatch
        let regexTime = new RegExp(`\\s+в\\s*${escapeRegExp(timeMatch)}`, "i");
        result = result.replace(regexTime, "").trim();

        regexTime = new RegExp(escapeRegExp(timeMatch), "i");
        result = result.replace(regexTime, "").trim();
    }

    // remove leftover leading connectors like 'в ' at end if any
    result = result.replace(/\s{2,}/g, " ").trim();

    return result;
}

export default cleanTaskText;
