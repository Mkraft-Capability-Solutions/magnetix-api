class ServiceResponseDTO {
  constructor(success, data, message = '') {
    this.success = success;
    this.data = data;
    this.message = message;
  }
}

class ErrorResponseDTO {
  constructor(error, statusCode = 500) {
    this.success = false;
    this.error = {
      message: error.message,
      code: error.code || 'INTERNAL_ERROR',
      status: statusCode,
      details: error.details || null
    };
  }
}

module.exports = {
  ServiceResponseDTO,
  ErrorResponseDTO
};