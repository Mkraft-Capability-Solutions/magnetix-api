/**
 * Script to check course thumbnails in database
 */

const { promisePool } = require("../src/config/db");

async function checkThumbnails() {
  try {
    console.log("Checking course thumbnails...\n");

    // Get a few courses with their thumbnails
    const [courses] = await promisePool.query(`
      SELECT id, title, thumbnail, creator_id
      FROM course
      WHERE is_deleted = 0
      ORDER BY id DESC
      LIMIT 5
    `);

    console.log(`Found ${courses.length} recent courses:\n`);

    courses.forEach((course, index) => {
      console.log(`${index + 1}. Course ID: ${course.id}`);
      console.log(`   Title: ${course.title}`);
      console.log(`   Thumbnail: ${course.thumbnail || 'NULL'}`);
      console.log(`   Creator: ${course.creator_id}`);
      console.log('');
    });

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkThumbnails();
