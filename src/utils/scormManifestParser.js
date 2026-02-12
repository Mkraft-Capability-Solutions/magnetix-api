/**
 * SCORM Manifest Parser Utility
 *
 * Parses imsmanifest.xml files to extract SCORM package information
 * including entry point, SCORM version, and metadata.
 */

const fs = require('fs').promises;
const path = require('path');
const { parseStringPromise } = require('xml2js');

/**
 * Parse SCORM manifest file and extract key information
 *
 * @param {string} packagePath - Full path to SCORM package directory
 * @returns {Promise<Object>} Manifest information
 */
async function parseScormManifest(packagePath) {
  try {
    const manifestPath = path.join(packagePath, 'imsmanifest.xml');

    // Check if manifest file exists
    try {
      await fs.access(manifestPath);
    } catch (error) {
      throw new Error(`imsmanifest.xml not found in ${packagePath}`);
    }

    // Read manifest file
    const manifestXml = await fs.readFile(manifestPath, 'utf-8');

    // Parse XML
    const manifest = await parseStringPromise(manifestXml, {
      explicitArray: false,
      mergeAttrs: true,
      trim: true
    });

    // Extract SCORM version from schema
    const schemaVersion = manifest.manifest?.metadata?.schemaversion || '1.2';

    // Extract resources section
    const resources = manifest.manifest?.resources?.resource;

    if (!resources) {
      throw new Error('No resources found in manifest');
    }

    // Handle single resource (not in array) or multiple resources
    const resourceArray = Array.isArray(resources) ? resources : [resources];

    // Find the SCO (Shareable Content Object) resource
    const scoResource = resourceArray.find(resource =>
      resource.scormtype === 'sco' ||
      resource['adlcp:scormtype'] === 'sco'
    );

    if (!scoResource) {
      throw new Error('No SCO resource found in manifest');
    }

    // Extract entry point (href attribute)
    const entryPoint = scoResource.href || 'index.html';

    // Extract title from organizations
    const org = manifest.manifest?.organizations?.organization;
    const title = org?.title || org?.item?.title || 'SCORM Content';

    return {
      entryPoint,
      scormVersion: schemaVersion,
      title: typeof title === 'string' ? title : title._ || 'SCORM Content',
      packagePath,
      manifestPath
    };
  } catch (error) {
    console.error('Error parsing SCORM manifest:', error);
    throw error;
  }
}

/**
 * Get entry point for SCORM package with fallback logic
 *
 * @param {string} packagePath - Full path to SCORM package directory
 * @returns {Promise<string>} Entry point filename (e.g., 'index_lms.html', 'story.html')
 */
async function getScormEntryPoint(packagePath) {
  try {
    const manifestInfo = await parseScormManifest(packagePath);
    return manifestInfo.entryPoint;
  } catch (error) {
    console.warn(`Failed to parse manifest, using fallback: ${error.message}`);

    // Fallback: Check which files exist
    const possibleEntryPoints = [
      'index_lms.html',
      'story.html',
      'index.html',
      'scorm.html'
    ];

    for (const entryPoint of possibleEntryPoints) {
      try {
        await fs.access(path.join(packagePath, entryPoint));
        console.log(`Using fallback entry point: ${entryPoint}`);
        return entryPoint;
      } catch {
        // File doesn't exist, try next one
        continue;
      }
    }

    // Ultimate fallback
    return 'story.html';
  }
}

module.exports = {
  parseScormManifest,
  getScormEntryPoint
};
