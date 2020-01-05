"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Environment {
    constructor() {
        this.baseUrl = process.env["BASE_URL"];
        this.locale = process.env["LOCALE"];
    }
}
exports.Environment = Environment;
