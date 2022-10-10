import HttpError from "./base";

export default class RateLimitError extends HttpError{
    constructor(message){
        super(message, '429');
        this.name = "RateLimitError";
    }
}