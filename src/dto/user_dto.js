class UserDTO {
  constructor(uuid, email, role_id, status) {
    this.uuid = uuid;
    this.email = email;
    this.role_id = role_id;
    this.status = status;
  }
}

module.exports = UserDTO;