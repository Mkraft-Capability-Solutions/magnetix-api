class UserDTO {
  constructor(uuid, email, role_id, status) {
    this.uuid = uuid;
    this.email = email;
    this.role_id = role_id;
    this.status = status;
  }

  // Static method to create from database row
  static fromDatabase(row) {
    return new UserDTO(
      row.uuid,
      row.email,
      row.role_id,
      row.status
    );
  }
}

module.exports = UserDTO;