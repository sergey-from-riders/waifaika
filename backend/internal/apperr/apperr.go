package apperr

import "net/http"

type Error struct {
	Code    string
	Message string
	Status  int
	Details any
	Err     error
}

func (e *Error) Error() string {
	if e == nil {
		return ""
	}
	if e.Message != "" {
		return e.Message
	}
	if e.Err != nil {
		return e.Err.Error()
	}
	return e.Code
}

func (e *Error) Unwrap() error {
	if e == nil {
		return nil
	}
	return e.Err
}

func New(status int, code, message string) *Error {
	return &Error{Status: status, Code: code, Message: message}
}

func Wrap(status int, code, message string, err error) *Error {
	return &Error{Status: status, Code: code, Message: message, Err: err}
}

func Validation(message string, details any) *Error {
	return &Error{
		Status:  http.StatusBadRequest,
		Code:    "validation_error",
		Message: message,
		Details: details,
	}
}

func Unauthorized(message string) *Error {
	return New(http.StatusUnauthorized, "unauthorized", message)
}

func Forbidden(message string) *Error {
	return New(http.StatusForbidden, "forbidden", message)
}

func NotFound(message string) *Error {
	return New(http.StatusNotFound, "not_found", message)
}

func Conflict(code, message string) *Error {
	return New(http.StatusConflict, code, message)
}

func RateLimited(message string) *Error {
	return New(http.StatusTooManyRequests, "rate_limited", message)
}

func Internal(err error) *Error {
	return Wrap(http.StatusInternalServerError, "internal_error", "internal server error", err)
}
