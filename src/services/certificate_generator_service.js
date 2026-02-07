const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { promisePool } = require('../config/db');

class CertificateGeneratorService {
  constructor() {
    // Ensure uploads/certificates directory exists
    this.certificatesDir = path.join(__dirname, '../../uploads/certificates');
    if (!fs.existsSync(this.certificatesDir)) {
      fs.mkdirSync(this.certificatesDir, { recursive: true });
    }
  }

  /**
   * Generate a certificate PDF
   * @param {Object} data - Certificate data
   * @param {string} data.studentName - Name of the student
   * @param {string} data.certificationName - Name of the certification
   * @param {Date} data.completionDate - Date of completion
   * @param {string} data.certificateId - Unique certificate ID
   * @returns {Promise<string>} - Path to generated certificate
   */
  async generateCertificate(data) {
    const { studentName, certificationName, completionDate, certificateId } = data;

    const fileName = `cert_${certificateId}_${Date.now()}.pdf`;
    const filePath = path.join(this.certificatesDir, fileName);

    return new Promise((resolve, reject) => {
      try {
        // Create a new PDF document
        const doc = new PDFDocument({
          size: 'A4',
          layout: 'landscape',
          margins: { top: 50, bottom: 50, left: 72, right: 72 }
        });

        // Pipe the PDF to a file
        const writeStream = fs.createWriteStream(filePath);
        doc.pipe(writeStream);

        // Set background color
        doc.rect(0, 0, doc.page.width, doc.page.height)
           .fill('#f8f9fa');

        // Add decorative border
        doc.rect(30, 30, doc.page.width - 60, doc.page.height - 60)
           .lineWidth(3)
           .strokeColor('#2c5aa0')
           .stroke();

        doc.rect(40, 40, doc.page.width - 80, doc.page.height - 80)
           .lineWidth(1)
           .strokeColor('#2c5aa0')
           .stroke();

        // Add "CERTIFICATE" header
        doc.fontSize(48)
           .fillColor('#2c5aa0')
           .font('Helvetica-Bold')
           .text('CERTIFICATE', 0, 100, {
             align: 'center',
             width: doc.page.width
           });

        doc.fontSize(20)
           .fillColor('#4a5568')
           .font('Helvetica')
           .text('OF COMPLETION', 0, 160, {
             align: 'center',
             width: doc.page.width
           });

        // Add decorative line
        doc.moveTo(doc.page.width / 2 - 150, 200)
           .lineTo(doc.page.width / 2 + 150, 200)
           .lineWidth(2)
           .strokeColor('#2c5aa0')
           .stroke();

        // Add "This is to certify that" text
        doc.fontSize(14)
           .fillColor('#4a5568')
           .font('Helvetica')
           .text('This is to certify that', 0, 230, {
             align: 'center',
             width: doc.page.width
           });

        // Add student name
        doc.fontSize(32)
           .fillColor('#1a202c')
           .font('Helvetica-Bold')
           .text(studentName, 0, 260, {
             align: 'center',
             width: doc.page.width
           });

        // Add completion text
        doc.fontSize(14)
           .fillColor('#4a5568')
           .font('Helvetica')
           .text('has successfully completed the certification program', 0, 310, {
             align: 'center',
             width: doc.page.width
           });

        // Add certification name
        doc.fontSize(24)
           .fillColor('#2c5aa0')
           .font('Helvetica-Bold')
           .text(certificationName, 0, 340, {
             align: 'center',
             width: doc.page.width
           });

        // Add completion date
        const formattedDate = new Date(completionDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        doc.fontSize(12)
           .fillColor('#4a5568')
           .font('Helvetica')
           .text(`Date of Completion: ${formattedDate}`, 0, 400, {
             align: 'center',
             width: doc.page.width
           });

        // Add certificate ID
        doc.fontSize(10)
           .fillColor('#718096')
           .font('Helvetica')
           .text(`Certificate ID: ${certificateId}`, 0, 430, {
             align: 'center',
             width: doc.page.width
           });

        // Add footer signature area
        const signatureY = 480;
        const leftX = 150;
        const rightX = doc.page.width - 250;

        // Left signature line (Instructor/Admin)
        doc.moveTo(leftX, signatureY)
           .lineTo(leftX + 150, signatureY)
           .lineWidth(1)
           .strokeColor('#4a5568')
           .stroke();

        doc.fontSize(10)
           .fillColor('#4a5568')
           .font('Helvetica')
           .text('Authorized Signature', leftX, signatureY + 10, {
             width: 150,
             align: 'center'
           });

        // Right signature line (Director/CEO)
        doc.moveTo(rightX, signatureY)
           .lineTo(rightX + 150, signatureY)
           .lineWidth(1)
           .strokeColor('#4a5568')
           .stroke();

        doc.fontSize(10)
           .fillColor('#4a5568')
           .font('Helvetica')
           .text('Program Director', rightX, signatureY + 10, {
             width: 150,
             align: 'center'
           });

        // Finalize the PDF
        doc.end();

        writeStream.on('finish', () => {
          console.log(`✅ Certificate generated successfully: ${filePath}`);
          resolve(`/uploads/certificates/${fileName}`);
        });

        writeStream.on('error', (error) => {
          console.error('❌ Error writing certificate PDF:', error);
          reject(error);
        });
      } catch (error) {
        console.error('❌ Error generating certificate:', error);
        reject(error);
      }
    });
  }

  /**
   * Generate certificate for a certification enrollment
   * @param {number} enrollmentId - Certification enrollment ID
   * @returns {Promise<string>} - Path to generated certificate
   */
  async generateCertificateForEnrollment(enrollmentId) {
    try {
      // Get enrollment details
      const [enrollments] = await promisePool.query(
        `SELECT
          sce.id as enrollment_id,
          sce.user_id,
          sce.certification_id,
          sce.completion_date,
          c.certification_name,
          CONCAT(s.first_name, ' ', s.last_name) AS student_name,
          u.email AS student_email
        FROM student_certification_enrollments sce
        INNER JOIN certifications c ON sce.certification_id = c.id
        INNER JOIN students s ON sce.user_id COLLATE utf8mb4_general_ci = s.user_id COLLATE utf8mb4_general_ci
        INNER JOIN users u ON s.user_id COLLATE utf8mb4_general_ci = u.uuid COLLATE utf8mb4_general_ci
        WHERE sce.id = ?`,
        [enrollmentId]
      );

      if (enrollments.length === 0) {
        throw new Error('Enrollment not found');
      }

      const enrollment = enrollments[0];

      // Generate certificate ID (unique identifier)
      const certificateId = `CERT-${enrollment.certification_id}-${enrollment.user_id.substring(0, 8)}-${Date.now()}`;

      // Generate the PDF
      const certificatePath = await this.generateCertificate({
        studentName: enrollment.student_name,
        certificationName: enrollment.certification_name,
        completionDate: enrollment.completion_date || new Date(),
        certificateId: certificateId
      });

      // Update the enrollment with the certificate path
      await promisePool.query(
        `UPDATE student_certification_enrollments
         SET certificate_file_path = ?
         WHERE id = ?`,
        [certificatePath, enrollmentId]
      );

      return {
        success: true,
        certificatePath,
        certificateId,
        message: 'Certificate generated successfully'
      };
    } catch (error) {
      console.error('Error in generateCertificateForEnrollment:', error);
      throw error;
    }
  }

  /**
   * Regenerate certificate for an existing enrollment
   * @param {number} enrollmentId - Certification enrollment ID
   * @returns {Promise<string>} - Path to regenerated certificate
   */
  async regenerateCertificate(enrollmentId) {
    return this.generateCertificateForEnrollment(enrollmentId);
  }

  /**
   * Delete a certificate file
   * @param {string} filePath - Path to certificate file
   * @returns {Promise<boolean>} - Success status
   */
  async deleteCertificate(filePath) {
    try {
      const fullPath = path.join(__dirname, '../..', filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        console.log(`Certificate deleted: ${fullPath}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting certificate:', error);
      throw error;
    }
  }
}

module.exports = new CertificateGeneratorService();
