// controllers/landingController.js
const { promisePool } = require('../config/db');

const landingController = {
  getAllSections: async (req, res, next) => {
    try {
      const [rows] = await promisePool.query('SELECT * FROM landing_page ORDER BY frame_id');
      
      // Organize data by section types
      const sections = {
        hero: rows.filter(row => row.frame_id >= 1 && row.frame_id <= 4),
        learningJourney: rows.filter(row => row.frame_id >= 5 && row.frame_id <= 9),
        popularCourses: rows.filter(row => row.frame_id >= 10 && row.frame_id <= 18),
        premierLearning: rows.filter(row => row.frame_id >= 19 && row.frame_id <= 23),
        instructors: rows.filter(row => row.frame_id >= 24 && row.frame_id <= 28),
        articles: rows.filter(row => row.frame_id >= 29 && row.frame_id <= 32),
        finalCTA: rows.filter(row => row.frame_id >= 33 && row.frame_id <= 38)
      };

      res.json(sections);
    } catch (error) {
      next(error);
    }
  },

  getSectionByType: async (req, res, next) => {
    try {
      const { sectionType } = req.params;
      
      let query;
      switch(sectionType) {
        case 'hero':
          query = 'SELECT * FROM landing_page WHERE frame_id BETWEEN 1 AND 4 ORDER BY frame_id';
          break;
        case 'learning-journey':
          query = 'SELECT * FROM landing_page WHERE frame_id BETWEEN 5 AND 9 ORDER BY frame_id';
          break;
        case 'popular-courses':
          query = 'SELECT * FROM landing_page WHERE frame_id BETWEEN 10 AND 18 ORDER BY frame_id';
          break;
        case 'premier-learning':
          query = 'SELECT * FROM landing_page WHERE frame_id BETWEEN 19 AND 23 ORDER BY frame_id';
          break;
        case 'instructors':
          query = 'SELECT * FROM landing_page WHERE frame_id BETWEEN 24 AND 28 ORDER BY frame_id';
          break;
        case 'articles':
          query = 'SELECT * FROM landing_page WHERE frame_id BETWEEN 29 AND 32 ORDER BY frame_id';
          break;
        case 'final-cta':
          query = 'SELECT * FROM landing_page WHERE frame_id BETWEEN 33 AND 38 ORDER BY frame_id';
          break;
        default:
          return res.status(404).json({ message: 'Section not found' });
      }

      const [rows] = await promisePool.query(query);
      res.json(rows);
    } catch (error) {
      next(error);
    }
  }
};

module.exports = landingController;