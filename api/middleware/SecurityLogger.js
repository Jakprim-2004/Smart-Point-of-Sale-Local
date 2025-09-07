const AttackLogModel = require('../models/AttackLogModel');
const { getClientIP } = require('./ddosProtection');

class SecurityLogger {
  static async logAttack(req, attackType, severity = 'LOW', additionalData = {}) {
    try {
      const clientIP = getClientIP(req);
      const userAgent = req.get('User-Agent') || 'Unknown';
      const endpoint = `${req.method} ${req.path}`;

      await AttackLogModel.create({
        ip_address: clientIP,
        attack_type: attackType,
        endpoint: endpoint,
        user_agent: userAgent,
        severity: severity,
        additional_data: additionalData,
        blocked: severity === 'CRITICAL' || severity === 'HIGH'
      });

      console.warn(`🚨 Security Event: ${attackType} - IP: ${clientIP} - Severity: ${severity}`);
    } catch (error) {
      console.error('Error logging attack:', error);
    }
  }

  static async getAttackStatistics(hours = 24) {
    try {
      const since = new Date(Date.now() - (hours * 60 * 60 * 1000));
      
      const stats = await AttackLogModel.findAll({
        where: {
          created_at: {
            [require('sequelize').Op.gte]: since
          }
        },
        attributes: [
          'attack_type',
          'severity',
          'ip_address',
          [require('sequelize').fn('COUNT', '*'), 'count']
        ],
        group: ['attack_type', 'severity', 'ip_address'],
        order: [[require('sequelize').literal('count'), 'DESC']]
      });

      return stats;
    } catch (error) {
      console.error('Error getting attack statistics:', error);
      return [];
    }
  }

  static async getTopAttackers(limit = 10, hours = 24) {
    try {
      const since = new Date(Date.now() - (hours * 60 * 60 * 1000));
      
      const topAttackers = await AttackLogModel.findAll({
        where: {
          created_at: {
            [require('sequelize').Op.gte]: since
          }
        },
        attributes: [
          'ip_address',
          [require('sequelize').fn('COUNT', '*'), 'attack_count'],
          [require('sequelize').fn('MAX', require('sequelize').col('severity')), 'max_severity']
        ],
        group: ['ip_address'],
        order: [[require('sequelize').literal('attack_count'), 'DESC']],
        limit: limit
      });

      return topAttackers;
    } catch (error) {
      console.error('Error getting top attackers:', error);
      return [];
    }
  }

  static async cleanOldLogs(daysToKeep = 30) {
    try {
      const cutoffDate = new Date(Date.now() - (daysToKeep * 24 * 60 * 60 * 1000));
      
      const deletedCount = await AttackLogModel.destroy({
        where: {
          created_at: {
            [require('sequelize').Op.lt]: cutoffDate
          },
          severity: {
            [require('sequelize').Op.notIn]: ['CRITICAL', 'HIGH']
          }
        }
      });

      // Security log cleanup completed (details hidden for security)
      return deletedCount;
    } catch (error) {
      console.error('Error cleaning old logs:', error);
      return 0;
    }
  }
}

module.exports = SecurityLogger;
