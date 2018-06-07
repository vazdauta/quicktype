import * as fs from "fs";
import { Readable } from "stream";
import { messageError, getStream, JSONSchemaStore, JSONSchema, parseJSON } from "../quicktype-core";

// The typings for this module are screwy
const isURL = require("is-url");
const fetch = require("node-fetch");
const os = require("os");

export async function readableFromFileOrURL(fileOrURL: string): Promise<Readable> {
    try {
        if (fileOrURL === "-") {
            return process.stdin;
        } else if (isURL(fileOrURL)) {
            const response = await fetch(fileOrURL);
            return response.body;
        } else if (fs.existsSync(fileOrURL)) {
            return fs.createReadStream(fileOrURL);
        }
    } catch (e) {
        const message = typeof e.message === "string" ? e.message : "Unknown error";
        return messageError("MiscReadError", { fileOrURL, message });
    }
    return messageError("DriverInputFileDoesNotExist", { filename: fileOrURL });
}

export async function readFromFileOrURL(fileOrURL: string): Promise<string> {
    fileOrURL = handleAdobeNamespace(fileOrURL);
    fileOrURL = handleSchemaOrgNamespace(fileOrURL);
    const readable = await readableFromFileOrURL(fileOrURL);
    try {
        return await getStream(readable);
    } catch (e) {
        const message = typeof e.message === "string" ? e.message : "Unknown error";
        return messageError("MiscReadError", { fileOrURL, message });
    }
}

function handleAdobeNamespace(address: string): string {
    if (address.indexOf("ns.adobe.com") >= 0) {
        //TODO: get from parameters or environment variables or scan all
        let path = os.homedir() + "/work/xdm/schemas/";
        address = address.replace(/https*:\/\/ns.adobe.com\/xdm/, path) + ".schema.json";
        address = address.replace(/https*:\/\/ns.adobe.com\//, os.homedir() + "/work/xdm/extensions/adobe/");
    }
    return address;
}

function handleSchemaOrgNamespace(address: string): string {
    if (address.indexOf("schema.org") >= 0) {
        return address + ".jsonld";
    }
    return address;
}

export class FetchingJSONSchemaStore extends JSONSchemaStore {
    async fetch(address: string): Promise<JSONSchema | undefined> {
        // console.log(`Fetching ${address}`);
        return parseJSON(await readFromFileOrURL(address), "JSON Schema", address);
    }
}
