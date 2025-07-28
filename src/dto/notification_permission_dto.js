class NotificationPermissionDTO {
  constructor(data) {
    this.permission_id = data.permission_id;
    this.title = data.title;
    this.description = data.description;
    this.icon = data.icon;
  }
}

module.exports = NotificationPermissionDTO;
