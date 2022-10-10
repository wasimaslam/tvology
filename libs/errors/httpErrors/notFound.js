import HttpError from "./base";

export default class NotFoundError extends HttpError{
    constructor(message){
        super(message, '404');
        this.name = "NotFoundError";
    }
}