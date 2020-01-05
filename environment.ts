export class Environment {
    baseUrl: string
    locale: string
    
    constructor() {
        this.baseUrl = process.env["BASE_URL"]!
        this.locale = process.env["LOCALE"]!
    }
}