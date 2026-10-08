// An Error that carries an HTTP status code, so the central error handler
// in app.js can send the right response (e.g. 400, 401, 409).
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Shortcut: httpError(404, 'Not found') is the same as new HttpError(404, 'Not found')
export const httpError = (status, message) => new HttpError(status, message);
