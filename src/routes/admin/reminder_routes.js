const express = require('express');
const router = express.Router();
const eventReminderScheduler = require('../../schedulers/event_reminder_scheduler');
const { authenticate, authorize } = require('../../middleware/auth_middleware');

// Get scheduler status
router.get('/scheduler/status', 
    authenticate,
    authorize(3, 4), // Admin and Super Admin only
    async (req, res) => {
        try {
            const status = eventReminderScheduler.getStatus();
            res.json({
                success: true,
                data: status
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
);

// Manual trigger for all events (testing purposes)
router.post('/trigger/all',
    authenticate,
    authorize(3, 4), // Admin and Super Admin only
    async (req, res) => {
        try {
            console.log(`Manual reminder trigger initiated by admin: ${req.user.email}`);
            
            const result = await eventReminderScheduler.triggerManually();
            
            res.json({
                success: true,
                message: 'Event reminders processed successfully',
                data: result
            });
        } catch (error) {
            console.error('Manual reminder trigger failed:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
);

// Manual trigger for specific event (testing purposes)
router.post('/trigger/event/:eventId',
    authenticate,
    authorize(3, 4), // Admin and Super Admin only
    async (req, res) => {
        try {
            const { eventId } = req.params;
            
            if (!eventId || isNaN(eventId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid event ID is required'
                });
            }
            
            console.log(`Manual reminder trigger for event ${eventId} by admin: ${req.user.email}`);
            
            const result = await eventReminderScheduler.triggerForEvent(parseInt(eventId));
            
            res.json({
                success: true,
                message: `Event reminder processed for event ${eventId}`,
                data: result
            });
        } catch (error) {
            console.error(`Manual reminder trigger failed for event ${req.params.eventId}:`, error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
);

module.exports = router;