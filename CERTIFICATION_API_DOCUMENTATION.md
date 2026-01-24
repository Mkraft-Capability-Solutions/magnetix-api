# Certification Management API Documentation

## Overview
This API provides endpoints for managing certifications in the LMS admin panel. Admins can create certifications, link them with required courses, and manage their status.

## Base URL
```
http://localhost:5111/api/admin
```

## Authentication
All endpoints require:
- **Authentication**: Bearer token in Authorization header
- **Authorization**: Admin (role 3) or Super Admin (role 4)

---

## API Endpoints

### 1. Get All Certifications (with Pagination & Filters)

**Endpoint:** `GET /certifications`

**Query Parameters:**
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 10): Items per page
- `status` (optional): Filter by status (`active`, `inactive`, or `all`)
- `search` (optional): Search by certification name

**Example Request:**
```bash
GET /api/admin/certifications?page=1&limit=10&status=active&search=React
```

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "certification_name": "React Developer Certification",
      "description": "Complete certification for React developers",
      "validity_period": 365,
      "validity_type": "limited",
      "template_file_path": "/uploads/templates/react-cert.pdf",
      "status": "active",
      "created_at": "2024-01-24T10:00:00.000Z",
      "updated_at": "2024-01-24T10:00:00.000Z",
      "required_courses_count": 3,
      "created_by_name": "John",
      "created_by_lastname": "Doe"
    }
  ],
  "pagination": {
    "total": 15,
    "page": 1,
    "limit": 10,
    "totalPages": 2
  }
}
```

---

### 2. Get Certification by ID

**Endpoint:** `GET /certifications/:certificationId`

**Example Request:**
```bash
GET /api/admin/certifications/1
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "certification_name": "React Developer Certification",
    "description": "Complete certification for React developers",
    "validity_period": 365,
    "validity_type": "limited",
    "template_file_path": "/uploads/templates/react-cert.pdf",
    "status": "active",
    "created_at": "2024-01-24T10:00:00.000Z",
    "updated_at": "2024-01-24T10:00:00.000Z",
    "created_by_name": "John",
    "created_by_lastname": "Doe",
    "required_courses": [
      {
        "requirement_id": 1,
        "course_id": 101,
        "course_title": "React Fundamentals",
        "short_description": "Learn React basics",
        "thumbnail": "/uploads/courses/react-thumb.jpg",
        "course_duration": "20 hours",
        "level": "beginner",
        "course_status": "active",
        "category_name": "Frontend Development",
        "subcategory_name": "JavaScript Frameworks"
      }
    ]
  }
}
```

---

### 3. Create Certification

**Endpoint:** `POST /certifications`

**Request Body:**
```json
{
  "certification_name": "Full Stack Developer Certification",
  "description": "Complete full stack development certification",
  "validity_period": 730,
  "validity_type": "limited",
  "template_file_path": "/uploads/templates/fullstack-cert.pdf",
  "status": "active",
  "course_ids": [101, 102, 103]
}
```

**Field Validations:**
- `certification_name` (required, 3-255 characters)
- `description` (optional)
- `validity_period` (optional, integer >= 1) - in days
- `validity_type` (optional, default: "lifetime") - values: "lifetime" or "limited"
- `template_file_path` (optional) - path to certificate template
- `status` (optional, default: "active") - values: "active" or "inactive"
- `course_ids` (optional, array of integers) - course IDs to be linked

**Success Response (201):**
```json
{
  "success": true,
  "message": "Certification created successfully",
  "data": {
    "success": true,
    "certificationId": 5,
    "message": "Certification created successfully"
  }
}
```

---

### 4. Update Certification

**Endpoint:** `PUT /certifications/:certificationId`

**Request Body:**
```json
{
  "certification_name": "Updated Certification Name",
  "description": "Updated description",
  "validity_period": 365,
  "validity_type": "limited",
  "status": "active",
  "course_ids": [101, 102, 104, 105]
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Certification updated successfully"
}
```

---

### 5. Delete Certification

**Endpoint:** `DELETE /certifications/:certificationId`

**Example Request:**
```bash
DELETE /api/admin/certifications/5
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Certification deleted successfully"
}
```

---

### 6. Toggle Certification Status

**Endpoint:** `PATCH /certifications/:certificationId/toggle-status`

**Example Request:**
```bash
PATCH /api/admin/certifications/1/toggle-status
```

**Success Response (200):**
```json
{
  "success": true,
  "status": "inactive",
  "message": "Certification deactivated successfully"
}
```

---

### 7. Get Active Courses (for dropdown in Create/Edit)

**Endpoint:** `GET /certifications/metadata/active-courses`

**Example Request:**
```bash
GET /api/admin/certifications/metadata/active-courses
```

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 101,
      "title": "React Fundamentals",
      "short_description": "Learn React basics",
      "thumbnail": "/uploads/courses/react-thumb.jpg",
      "course_duration": "20 hours",
      "level": "beginner",
      "category_name": "Frontend Development",
      "subcategory_name": "JavaScript Frameworks"
    }
  ]
}
```

---

### 8. Add Course Requirement

**Endpoint:** `POST /certifications/:certificationId/courses`

**Request Body:**
```json
{
  "course_id": 105
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Course requirement added successfully",
  "requirementId": 12
}
```

---

### 9. Remove Course Requirement

**Endpoint:** `DELETE /certifications/:certificationId/courses/:courseId`

**Example Request:**
```bash
DELETE /api/admin/certifications/1/courses/105
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Course requirement removed successfully"
}
```

---

## Error Responses

### Validation Error (400)
```json
{
  "success": false,
  "message": "Validation failed",
  "details": [
    "certification_name is required",
    "validity_period must be a positive integer"
  ]
}
```

### Not Found (404)
```json
{
  "success": false,
  "message": "Certification not found"
}
```

### Conflict (409)
```json
{
  "success": false,
  "message": "This course is already added to the certification"
}
```

### Internal Server Error (500)
```json
{
  "success": false,
  "message": "Internal Server Error",
  "error": {}
}
```

---

## Database Schema

### Table: certifications
```sql
CREATE TABLE certifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  certification_name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  validity_period INT NULL,
  validity_type ENUM('lifetime', 'limited') DEFAULT 'lifetime',
  template_file_path VARCHAR(500) NULL,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_by VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(36) NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Table: certification_course_requirements
```sql
CREATE TABLE certification_course_requirements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  certification_id INT NOT NULL,
  course_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (certification_id) REFERENCES certifications(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES course(id) ON DELETE CASCADE,
  UNIQUE KEY unique_cert_course (certification_id, course_id)
);
```

---

## Implementation Flow for Frontend

### Certification List Tab
1. Call `GET /certifications` with pagination
2. Display certifications in a table/card view
3. Add search and filter functionality
4. Show course count for each certification
5. Add toggle status button
6. Add edit/delete actions

### Create/Edit Certification Tab
1. Call `GET /certifications/metadata/active-courses` to populate course dropdown
2. Display form with fields:
   - Certification Name (required)
   - Description (optional)
   - Validity Type (radio: Lifetime/Limited)
   - Validity Period (shown only if Limited, in days)
   - Template Upload (optional)
   - Status (active/inactive)
   - Course Selection (multi-select dropdown with cards)
3. On submit, call `POST /certifications` or `PUT /certifications/:id`
4. Show selected courses as separate cards with remove option

---

## Notes

- All endpoints require admin authentication
- Course requirements are automatically deleted when a certification is deleted (CASCADE)
- Template upload functionality can be integrated with the existing upload service
- Validity period is stored in days
- The API supports soft deletion of courses (course.is_deleted = 0)
