const express = require('express');
const router = express.Router();
const SecurityLogger = require('../middleware/SecurityLogger');
const { getBlockedIPs, blockIP, unblockIP, getClientIP } = require('../middleware/ddosProtection');

// Get attack statistics
router.get('/admin/security/stats', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    
    const [stats, topAttackers] = await Promise.all([
      SecurityLogger.getAttackStatistics(hours),
      SecurityLogger.getTopAttackers(10, hours)
    ]);

    res.json({
      success: true,
      data: {
        timeframe: `${hours} hours`,
        statistics: stats,
        topAttackers: topAttackers,
        blockedIPs: getBlockedIPs()
      }
    });
  } catch (error) {
    console.error('Security stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving security statistics'
    });
  }
});

// Block an IP address
router.post('/admin/security/block-ip', (req, res) => {
  try {
    const { ip, reason } = req.body;
    
    if (!ip) {
      return res.status(400).json({
        success: false,
        message: 'IP address is required'
      });
    }

    // Validate IP format (basic validation)
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipRegex.test(ip)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid IP address format'
      });
    }

    blockIP(ip, reason || 'Manual admin block');

    res.json({
      success: true,
      message: `IP ${ip} has been blocked`,
      blockedIPs: getBlockedIPs()
    });
  } catch (error) {
    console.error('Block IP error:', error);
    res.status(500).json({
      success: false,
      message: 'Error blocking IP address'
    });
  }
});

// Unblock an IP address
router.post('/admin/security/unblock-ip', (req, res) => {
  try {
    const { ip } = req.body;
    
    if (!ip) {
      return res.status(400).json({
        success: false,
        message: 'IP address is required'
      });
    }

    unblockIP(ip);

    res.json({
      success: true,
      message: `IP ${ip} has been unblocked`,
      blockedIPs: getBlockedIPs()
    });
  } catch (error) {
    console.error('Unblock IP error:', error);
    res.status(500).json({
      success: false,
      message: 'Error unblocking IP address'
    });
  }
});

// Get current blocked IPs
router.get('/admin/security/blocked-ips', (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        blockedIPs: getBlockedIPs(),
        count: getBlockedIPs().length
      }
    });
  } catch (error) {
    console.error('Get blocked IPs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving blocked IPs'
    });
  }
});

// Clean old attack logs
router.post('/admin/security/cleanup', async (req, res) => {
  try {
    const daysToKeep = parseInt(req.body.days) || 30;
    const deletedCount = await SecurityLogger.cleanOldLogs(daysToKeep);

    res.json({
      success: true,
      message: `Cleaned ${deletedCount} old attack logs`,
      deletedCount: deletedCount
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({
      success: false,
      message: 'Error cleaning up logs'
    });
  }
});

// Get current request info (for debugging)
router.get('/admin/security/request-info', (req, res) => {
  try {
    const clientIP = getClientIP(req);
    const userAgent = req.get('User-Agent');
    const headers = req.headers;

    res.json({
      success: true,
      data: {
        ip: clientIP,
        userAgent: userAgent,
        headers: headers,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Request info error:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting request info'
    });
  }
});

module.exports = router;
