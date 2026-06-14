  // UNIVERSAL NOTIFICATION METHODS
  async getUserNotifications(req, res, next) {
    try {
      const userId = req.user?.uuid;
      if (!userId) return res.status(401).json({ success: false, error: { message: 'Authentication required' } });

      const { limit = 20, offset = 0, type, isRead } = req.query;
      const result = await notificationService.getUserNotifications(userId, parseInt(limit), parseInt(offset), type || null, isRead !== undefined ? (isRead === 'true' ? 1 : 0) : null);
      res.json({ success: true, data: result, pagination: { limit: parseInt(limit), offset: parseInt(offset) } });
    } catch (error) {
      console.error('Get notifications error:', error);
      next(error);
    }
  }

  async getUnreadCount(req, res, next) {
    try {
      const userId = req.user?.uuid;
      if (!userId) return res.status(401).json({ success: false, error: { message: 'Authentication required' } });
      const result = await notificationService.getUnreadCount(userId);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Get unread count error:', error);
      next(error);
    }
  }

  async markAsRead(req, res, next) {
    try {
      const { uuid } = req.params;
      const userId = req.user?.uuid;
      if (!userId) return res.status(401).json({ success: false, error: { message: 'Authentication required' } });
      const result = await notificationService.markAsRead(uuid, userId);
      if (result && result.affectedRows > 0) {
        res.json({ success: true, data: { uuid }, message: 'Notification marked as read' });
      } else {
        res.status(404).json({ success: false, error: { message: 'Notification not found' } });
      }
    } catch (error) {
      console.error('Mark as read error:', error);
      next(error);
    }
  }

  async markAllAsRead(req, res, next) {
    try {
      const userId = req.user?.uuid;
      if (!userId) return res.status(401).json({ success: false, error: { message: 'Authentication required' } });
      const result = await notificationService.markAllAsRead(userId);
      res.json({ success: true, data: result, message: 'All notifications marked as read' });
    } catch (error) {
      console.error('Mark all as read error:', error);
      next(error);
    }
  }

  async deleteNotification(req, res, next) {
    try {
      const { uuid } = req.params;
      const userId = req.user?.uuid;
      if (!userId) return res.status(401).json({ success: false, error: { message: 'Authentication required' } });
      const result = await notificationService.deleteNotification(uuid, userId);
      if (result) {
        res.json({ success: true, data: { uuid }, message: 'Notification deleted' });
      } else {
        res.status(404).json({ success: false, error: { message: 'Notification not found' } });
      }
    } catch (error) {
      console.error('Delete notification error:', error);
      next(error);
    }
  }
