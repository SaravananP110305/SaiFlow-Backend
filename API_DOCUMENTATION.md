# SaiFlow CRM – REST API Reference Manual

Welcome to the REST API documentation for the SaiFlow CRM backend. This reference details every endpoint available in the API, grouped by functional module.

---

## Global API Constants & Headers

* **Base URL**: `http://<host>:5000/api/v1`
* **Default Content Type**: `application/json`
* **Headers**:
  * `Authorization`: `Bearer <Access Token>` (Required for all authenticated endpoints)
  * `Content-Type`: `application/json`

---

## Table of Contents
1. [Health & Diagnostics](#1-health--diagnostics)
2. [Authentication & Session Management](#2-authentication--session-management)
3. [User Profile & Self Management](#3-user-profile--self-management)
4. [User Administration](#4-user-administration)
5. [Role & Permission Management](#5-role--permission-management)
6. [Master Data Management](#6-master-data-management)
7. [Company Management](#7-company-management)
8. [Lead Management](#8-lead-management)
9. [Contact Logs & Follow-ups (Connect)](#9-contact-logs--follow-ups-connect)
10. [Meeting Management](#10-meeting-management)
11. [Quotation & Proposal Management](#11-quotation--proposal-management)
12. [Client Management](#12-client-management)
13. [Project Handover Management](#13-project-handover-management)
14. [Analytics & Reporting](#14-analytics--reporting)
15. [System Settings](#15-system-settings)
16. [Notification Center](#16-notification-center)

---

## 1. Health & Diagnostics

### Get Server Health
* **URL**: `/health`
* **Method**: `GET`
* **Auth Required**: No
* **Purpose**: Health check to ensure API service, database connections, and memory state are fully healthy.
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "API service is healthy",
    "data": {
      "uptime": 1420.5,
      "timestamp": "2026-08-06T11:19:18.000Z",
      "env": "development",
      "database": "CONNECTED"
    }
  }
  ```

---

## 2. Authentication & Session Management

### Login
* **URL**: `/auth/login`
* **Method**: `POST`
* **Auth Required**: No
* **Request Body**:
  * `email` (string, email, required, lowercase)
  * `password` (string, required)
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Login successful",
    "data": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
  ```
  *(Note: The server also sets a secure, HTTP-only cookie named `refreshToken`).*
* **Error Response (401 Unauthorized)**:
  ```json
  {
    "success": false,
    "statusCode": 401,
    "message": "Invalid email or password"
  }
  ```

### Refresh Tokens
* **URL**: `/auth/refresh`
* **Method**: `PUT`
* **Auth Required**: No (Requires HTTP-Only `refreshToken` cookie)
* **Headers**: `withCredentials: true` (Axios configuration)
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Tokens refreshed successfully",
    "data": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
  ```
* **Error Response (401 Unauthorized)**:
  ```json
  {
    "success": false,
    "statusCode": 401,
    "message": "Refresh token is required"
  }
  ```

### Logout
* **URL**: `/auth/logout`
* **Method**: `DELETE`
* **Auth Required**: Yes (JWT Bearer Token + HTTP-Only Cookie)
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Logout successful"
  }
  ```

---

## 3. User Profile & Self Management

### Get Current User Profile
* **URL**: `/auth/me`
* **Method**: `GET`
* **Auth Required**: Yes
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Profile retrieved successfully",
    "data": {
      "user": {
        "id": 2,
        "name": "Alex Mercer",
        "email": "alex@saiflow.com",
        "phone": "9876543211",
        "department": "Sales",
        "roleId": 2,
        "status": "ACTIVE",
        "createdAt": "2026-08-06T05:28:16.000Z",
        "updatedAt": "2026-08-06T05:28:16.000Z",
        "deletedAt": null,
        "role": {
          "id": 2,
          "name": "Business Development Manager",
          "status": "Active"
        }
      }
    }
  }
  ```

### Get Role Privileges
* **URL**: `/auth/privileges`
* **Method**: `GET`
* **Auth Required**: Yes
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "User privileges retrieved successfully",
    "data": {
      "role": {
        "id": 2,
        "name": "Business Development Manager",
        "status": "Active"
      },
      "permissions": {
        "leads": ["view", "create", "edit", "export", "assign"],
        "meetings": ["view", "create", "edit"],
        "proposals": ["view", "create", "edit", "approve"],
        "clients": ["view", "create", "edit", "approve"],
        "companies": ["view", "create", "edit", "delete"],
        "reports": ["view"],
        "connect": ["view", "create", "edit"],
        "settings": ["view"],
        "notifications": ["view"]
      }
    }
  }
  ```

### Update Self Profile
* **URL**: `/auth/profile`
* **Method**: `PATCH`
* **Auth Required**: Yes
* **Request Body** (At least one must be provided):
  * `name` (string, 2-200 chars)
  * `email` (string, valid email)
  * `phone` (string, max 20 chars, nullable)
  * `department` (string, max 100 chars, nullable)
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Profile updated successfully",
    "data": {
      "user": {
        "id": 2,
        "name": "Alex Mercer Updated",
        "email": "alex@saiflow.com",
        "phone": "9876543211",
        "department": "Business Development",
        "roleId": 2,
        "status": "ACTIVE"
      }
    }
  }
  ```

### Change Password
* **URL**: `/auth/change-password`
* **Method**: `PATCH`
* **Auth Required**: Yes
* **Request Body**:
  * `oldPassword` (string, required)
  * `newPassword` (string, min 6 chars, required)
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Password updated successfully. Please login again."
  }
  ```

---

## 4. User Administration

### Get User List
* **URL**: `/users`
* **Method**: `GET`
* **Auth Required**: Yes (`users` permission: `view`)
* **Query Parameters**:
  * `page` (number, default: 1)
  * `limit` (number, default: 10, max: 100)
  * `search` (string, searches over name, email, department)
  * `paginate` (boolean, default: false)
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Users retrieved successfully",
    "data": [
      {
        "id": 1,
        "name": "System Administrator",
        "email": "admin@saiflow.com",
        "phone": "9876543210",
        "department": "IT Operations",
        "roleId": 1,
        "status": "ACTIVE",
        "role": {
          "id": 1,
          "name": "Administrator"
        }
      }
    ]
  }
  ```

### Get Active Assignees List
* **URL**: `/users/assignees`
* **Method**: `GET`
* **Auth Required**: Yes (Accessible to all authenticated users)
* **Purpose**: Fetches a lightweight list of users available for assignment.
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Assignees retrieved successfully",
    "data": [
      {
        "id": 2,
        "name": "Alex Mercer"
      }
    ]
  }
  ```

### Get User Details by ID
* **URL**: `/users/:id`
* **Method**: `GET`
* **Auth Required**: Yes (`users` permission: `view`)
* **Path Parameters**:
  * `id` (integer)
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "User retrieved successfully",
    "data": {
      "id": 2,
      "name": "Alex Mercer",
      "email": "alex@saiflow.com",
      "phone": "9876543211",
      "department": "Sales",
      "roleId": 2,
      "status": "ACTIVE",
      "role": {
        "id": 2,
        "name": "Business Development Manager"
      }
    }
  }
  ```

### Create User
* **URL**: `/users`
* **Method**: `POST`
* **Auth Required**: Yes (`users` permission: `create`)
* **Request Body**:
  * `name` (string, min 2, max 200, required)
  * `email` (string, valid email, required)
  * `password` (string, min 6, required)
  * `phone` (string, max 20, optional)
  * `department` (string, max 100, optional)
  * `roleId` (number, positive integer, required)
  * `status` (string, options: `ACTIVE`, `INACTIVE`, `SUSPENDED`, default: `ACTIVE`)
* **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "statusCode": 201,
    "message": "User created successfully",
    "data": {
      "id": 3,
      "name": "John Doe",
      "email": "john@saiflow.com",
      "phone": "9876543222",
      "department": "Presales",
      "roleId": 4,
      "status": "ACTIVE"
    }
  }
  ```

### Update User
* **URL**: `/users/:id`
* **Method**: `PUT`
* **Auth Required**: Yes (`users` permission: `edit`)
* **Path Parameters**:
  * `id` (integer)
* **Request Body**:
  * `name` (string, optional)
  * `email` (string, optional)
  * `phone` (string, optional)
  * `department` (string, optional)
  * `roleId` (number, optional)
  * `status` (string, optional)
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "User updated successfully",
    "data": {
      "id": 3,
      "name": "John Doe",
      "status": "INACTIVE"
    }
  }
  ```

### Delete User
* **URL**: `/users/:id`
* **Method**: `DELETE`
* **Auth Required**: Yes (`users` permission: `delete`)
* **Path Parameters**:
  * `id` (integer)
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "User deleted successfully"
  }
  ```

---

## 5. Role & Permission Management

### Get Role List
* **URL**: `/roles`
* **Method**: `GET`
* **Auth Required**: Yes (`roles` permission: `view`)
* **Query Parameters**:
  * `paginate` (boolean, default: false)
  * `page` (number, default: 1)
  * `limit` (number, default: 10)
  * `search` (string, filter by name/status)
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Roles retrieved successfully",
    "data": [
      {
        "id": 1,
        "name": "Administrator",
        "status": "Active",
        "permissions": { ... },
        "userCount": 1
      }
    ]
  }
  ```

### Get Role by ID
* **URL**: `/roles/:id`
* **Method**: `GET`
* **Auth Required**: Yes (`roles` permission: `view`)
* **Path Parameters**:
  * `id` (integer)
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Role retrieved successfully",
    "data": {
      "id": 2,
      "name": "Business Development Manager",
      "status": "Active",
      "permissions": { ... },
      "userCount": 2
    }
  }
  ```

### Create Role
* **URL**: `/roles`
* **Method**: `POST`
* **Auth Required**: Yes (`roles` permission: `create`)
* **Request Body**:
  * `name` (string, required, 2-100 chars)
  * `status` (string: `'Active'` or `'Inactive'`)
  * `permissions` (object, keys must be valid modules, values must be arrays of actions)
* **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "statusCode": 201,
    "message": "Role created successfully",
    "data": {
      "id": 5,
      "name": "Technical Lead",
      "status": "Active",
      "permissions": {
        "clients": ["view", "approve"],
        "proposals": ["view", "create", "edit"]
      }
    }
  }
  ```

### Update Role
* **URL**: `/roles/:id`
* **Method**: `PUT`
* **Auth Required**: Yes (`roles` permission: `edit`)
* **Path Parameters**:
  * `id` (integer)
* **Request Body**:
  * `name` (string, optional)
  * `status` (string, optional)
  * `permissions` (object, optional)
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Role updated successfully",
    "data": {
      "id": 5,
      "name": "Technical Lead"
    }
  }
  ```

### Delete Role
* **URL**: `/roles/:id`
* **Method**: `DELETE`
* **Auth Required**: Yes (`roles` permission: `delete`)
* **Path Parameters**:
  * `id` (integer)
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Role deleted successfully"
  }
  ```

---

## 6. Master Data Management

### Get Master Items
* **URL**: `/master-items`
* **Method**: `GET`
* **Auth Required**: Yes (All authenticated users)
* **Query Parameters**:
  * `category` (string, filter by CATEGORY name, e.g. `'LEAD_SOURCE'`, `'PRIORITY'`, `'COUNTRY'`)
  * `parentId` (number, e.g., states linked to a country parentId)
  * `status` (string, e.g. `'Active'`)
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Master items retrieved successfully",
    "data": [
      {
        "id": 1,
        "category": "LEAD_SOURCE",
        "name": "Website",
        "status": "Active",
        "parentId": null
      }
    ]
  }
  ```

### Create Master Item
* **URL**: `/master-items`
* **Method**: `POST`
* **Auth Required**: Yes (Requires **Administrator** role)
* **Request Body**:
  * `category` (string, required, valid categories list)
  * `name` (string, 1-100 chars, required)
  * `status` (string: `'Active'` or `'Inactive'`)
  * `parentId` (number, optional)
* **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "statusCode": 201,
    "message": "Master item created successfully",
    "data": {
      "id": 15,
      "category": "TECH_STACK",
      "name": "React Native",
      "status": "Active",
      "parentId": null
    }
  }
  ```

---

## 7. Company Management

### Get Companies
* **URL**: `/companies`
* **Method**: `GET`
* **Auth Required**: Yes (`companies` permission: `view`)
* **Query Parameters**:
  * `page` (number, default: 1)
  * `limit` (number, default: 10)
  * `search` (string, searches company name, email, website)
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Companies retrieved successfully",
    "data": [
      {
        "id": 1,
        "name": "Google LLC",
        "website": "https://google.com",
        "phone": "0123456789",
        "email": "hq@google.com"
      }
    ],
    "meta": {
      "total": 1,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    }
  }
  ```

---

## 8. Lead Management

### Get Lead List
* **URL**: `/leads`
* **Method**: `GET`
* **Auth Required**: Yes (`leads` permission: `view`)
* **Query Parameters**:
  * `page` (number, default: 1)
  * `limit` (number, default: 10, max: 100)
  * `search` (string, searches title, contact person, email, phone)
  * `status` (string, e.g. `'NEW'`, `'ASSIGNED'`, `'WON'`)
  * `sourceId` (number)
  * `priorityId` (number)
  * `assignedToId` (number)
  * `createdFrom` (date, YYYY-MM-DD)
  * `createdTo` (date, YYYY-MM-DD)
  * `sortBy` (string, fields: `id`, `createdAt`, `title`, `status`, etc.)
  * `sortOrder` (string: `'asc'` or `'desc'`)
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Leads retrieved successfully",
    "data": [
      {
        "id": 1,
        "title": "Acme Corporation Inc",
        "contactPerson": "John Watson",
        "email": "watson@acme.com",
        "status": "NEW",
        "source": { "id": 1, "name": "LinkedIn" },
        "priority": { "id": 2, "name": "Medium" }
      }
    ],
    "meta": {
      "total": 12,
      "page": 1,
      "limit": 10,
      "totalPages": 2
    }
  }
  ```

### Get Lead Status Counts
* **URL**: `/leads/status-counts`
* **Method**: `GET`
* **Auth Required**: Yes (`leads` permission: `view`)
* **Purpose**: Fetches status-wise aggregation counts to populate badge counts.
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Lead status counts retrieved successfully",
    "data": {
      "NEW": 5,
      "ASSIGNED": 2,
      "CONTACTED": 4,
      "MEETING_SCHEDULED": 1,
      "QUALIFIED": 3,
      "PROPOSAL": 0,
      "NEGOTIATION": 1,
      "WON": 2,
      "LOST": 1,
      "DISQUALIFIED": 0
    }
  }
  ```

### Get Lead by ID
* **URL**: `/leads/:id`
* **Method**: `GET`
* **Auth Required**: Yes (`leads` permission: `view`)
* **Path Parameters**:
  * `id` (integer)
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Lead retrieved successfully",
    "data": {
      "id": 1,
      "title": "Acme Corporation Inc",
      "contactPerson": "John Watson",
      "email": "watson@acme.com",
      "phone": "9876543210",
      "status": "NEW",
      "requirements": "Need CRM application built.",
      "meetings": [],
      "proposals": [],
      "auditLogs": [
        {
          "id": "125678",
          "action": "CREATE",
          "entity": "Lead",
          "createdAt": "2026-08-06T05:28:16.000Z",
          "user": { "id": 1, "name": "Admin" }
        }
      ]
    }
  }
  ```

### Create Lead
* **URL**: `/leads`
* **Method**: `POST`
* **Auth Required**: Yes (`leads` permission: `create`)
* **Request Body**:
  * `title` (string, required)
  * `contactPerson` (string, required)
  * `email` (string, required, email)
  * `phone` (string, optional)
  * `website` (string, optional)
  * `industryId` (number, optional)
  * `countryId` (number, optional)
  * `stateId` (number, optional)
  * `cityId` (number, optional)
  * `pincode` (string, optional)
  * `sourceId` (number, optional)
  * `priorityId` (number, optional)
  * `assignedToId` (number, optional)
  * `status` (string, default: `'NEW'`)
  * `requirements` (string, optional)
* **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "statusCode": 201,
    "message": "Lead created successfully",
    "data": {
      "id": 13,
      "title": "SleekTech Labs",
      "status": "NEW"
    }
  }
  ```

### Assign Lead
* **URL**: `/leads/:id/assignment`
* **Method**: `PATCH`
* **Auth Required**: Yes (`leads` permission: `assign`)
* **Path Parameters**:
  * `id` (integer)
* **Request Body**:
  * `assignedToId` (number, positive integer, required)
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Lead assigned successfully",
    "data": {
      "id": 13,
      "assignedToId": 2
    }
  }
  ```

### Bulk Assign Leads
* **URL**: `/leads/bulk-assign`
* **Method**: `POST`
* **Auth Required**: Yes (`leads` permission: `assign`)
* **Request Body**:
  * `ids` (array of positive integers, required)
  * `assignedToId` (number, required)
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Successfully assigned 3 leads to assignee ID 2"
  }
  ```

### Convert Lead to Client
* **URL**: `/leads/:id/convert`
* **Method**: `POST`
* **Auth Required**: Yes (`leads` permission: `edit`)
* **Path Parameters**:
  * `id` (integer)
* **Request Body**:
  * `gstPan` (string, optional)
  * `paymentTerms` (string, optional)
  * `creditLimit` (number, optional)
  * `relationshipManagerId` (number, optional)
  * `accountManagerId` (number, optional)
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Lead converted to client successfully",
    "data": {
      "clientId": 1,
      "companyId": 4
    }
  }
  ```

---

## 9. Contact Logs & Follow-ups (Connect)

### Get Contact/Follow-up List
* **URL**: `/connect`
* **Method**: `GET`
* **Auth Required**: Yes (`connect` permission: `view`)
* **Query Parameters**:
  * `page` (number, default: 1)
  * `limit` (number, default: 10)
  * `status` (string, e.g. `'SCHEDULED'`, `'COMPLETED'`)
  * `search` (string, filter by company/contactPerson)
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Connect logs retrieved successfully",
    "data": [
      {
        "id": 1,
        "leadId": 4,
        "company": "Stripe Payments",
        "contactPerson": "Sarah Jenkins",
        "outcome": "INTERESTED",
        "status": "SCHEDULED",
        "followUpDate": "2026-08-10"
      }
    ]
  }
  ```

### Create Contact/Follow-up Log
* **URL**: `/connect`
* **Method**: `POST`
* **Auth Required**: Yes (`connect` permission: `create`)
* **Request Body**:
  * `leadId` (number, positive integer, required)
  * `outcome` (string, valid outcomes: `CONTACTED`, `INTERESTED`, `CALL_LATER`, `NOT_INTERESTED`)
  * `summary` (string, max 5000 chars)
  * `followUpType` (string, e.g. `'Call'`, `'Email'`, `'WhatsApp'`)
  * `followUpDate` (string, date format YYYY-MM-DD)
  * `followUpTime` (string, HH:MM or 12-hour AM/PM format)
  * `status` (string, e.g. `'SCHEDULED'`, `'COMPLETED'`)
* **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "statusCode": 201,
    "message": "Connect log created successfully",
    "data": {
      "id": 2,
      "leadId": 4,
      "status": "SCHEDULED"
    }
  }
  ```

---

## 10. Meeting Management

### Get Meetings
* **URL**: `/meetings`
* **Method**: `GET`
* **Auth Required**: Yes (`meetings` permission: `view`)
* **Query Parameters**:
  * `page` (number, default: 1)
  * `limit` (number, default: 10)
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Meetings retrieved successfully",
    "data": [
      {
        "id": 1,
        "title": "Discovery Scope Meeting",
        "scheduledAt": "2026-08-12T10:00:00.000Z",
        "status": "SCHEDULED",
        "lead": {
          "id": 4,
          "title": "Acme Corp"
        }
      }
    ]
  }
  ```

### Create Meeting
* **URL**: `/meetings`
* **Method**: `POST`
* **Auth Required**: Yes (`meetings` permission: `create`)
* **Request Body**:
  * `leadId` (number, required)
  * `title` (string, required)
  * `scheduledAt` (string, ISO Date, required)
  * `durationMinutes` (number, default: 30)
  * `meetingLink` (string, e.g. Google Meet link or venue location)
  * `status` (string, default: `'SCHEDULED'`)
  * `agenda` (string, optional)
  * `scopeNotes` (string, optional)
  * `actionSummary` (string, optional)
* **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "statusCode": 201,
    "message": "Meeting scheduled successfully",
    "data": {
      "id": 4,
      "title": "Scope Alignment Call"
    }
  }
  ```

### Update Meeting Status / Notes
* **URL**: `/meetings/:id`
* **Method**: `PATCH`
* **Auth Required**: Yes (`meetings` permission: `edit`)
* **Path Parameters**:
  * `id` (integer)
* **Request Body**:
  * `status` (string, options: `'SCHEDULED'`, `'COMPLETED'`, `'RESCHEDULED'`, `'CANCELLED'`, required)
  * `scopeNotes` (string, optional)
  * `actionSummary` (string, optional)
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Meeting status updated successfully",
    "data": {
      "id": 4,
      "status": "COMPLETED"
    }
  }
  ```

---

## 11. Quotation & Proposal Management

### Get Proposals
* **URL**: `/proposals`
* **Method**: `GET`
* **Auth Required**: Yes (`proposals` permission: `view`)
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Proposals retrieved successfully",
    "data": [
      {
        "id": 1,
        "proposalNumber": "PROP-2026-001",
        "title": "E-Commerce App Scope Design",
        "amount": 25000.00,
        "status": "Draft",
        "lead": {
          "id": 1,
          "title": "SleekTech"
        }
      }
    ]
  }
  ```

### Create Proposal (with Phases and Estimation Matrix)
* **URL**: `/proposals`
* **Method**: `POST`
* **Auth Required**: Yes (`proposals` permission: `create`)
* **Request Body**:
  * `leadId` (number, required)
  * `proposalNumber` (string, required)
  * `title` (string, required)
  * `amount` (number, required)
  * `status` (string, default: `'Draft'`)
  * `documentUrl` (string, uri, optional)
  * `phases` (array of objects, optional)
    * `phaseName` (string, required)
    * `overview` (string, optional)
    * `estimatedTimeline` (string, optional)
    * `objectives` (array of strings, optional)
    * `lineItems` (array of line item objects)
      * `category` (string, required)
      * `description` (string, required)
      * `unitPrice` (number, required)
      * `quantity` (number, default: 1)
* **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "statusCode": 201,
    "message": "Proposal created successfully",
    "data": {
      "id": 2,
      "proposalNumber": "PROP-2026-002",
      "amount": 18500.00
    }
  }
  ```

---

## 12. Client Management

### Get Client List
* **URL**: `/clients`
* **Method**: `GET`
* **Auth Required**: Yes (`clients` permission: `view`)
* **Query Parameters**:
  * `page` (number, default: 1)
  * `limit` (number, default: 10)
  * `search` (string, filter by company name)
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Clients retrieved successfully",
    "data": [
      {
        "id": 1,
        "status": "Active",
        "company": {
          "name": "Stripe Payments Inc"
        },
        "accountManager": {
          "name": "Alex Mercer"
        }
      }
    ]
  }
  ```

---

## 13. Project Handover Management

### Get Projects (Handovers)
* **URL**: `/clients/projects`
* **Method**: `GET`
* **Auth Required**: Yes (`clients` permission: `view`)
* **Query Parameters**:
  * `page` (number, default: 1)
  * `limit` (number, default: 10)
  * `clientId` (number)
  * `pmId` (number)
  * `status` (string, e.g. `'Kickoff'`, `'In Development'`, `'UAT'`)
  * `search` (string, filters project name and company name)
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Projects retrieved successfully",
    "data": [
      {
        "id": 1,
        "name": "Billing Integration Phase 1",
        "status": "Kickoff",
        "handoverDate": "2026-08-01T12:00:00Z",
        "pm": {
          "id": 4,
          "name": "Robert PM"
        }
      }
    ]
  }
  ```

---

## 14. Analytics & Reporting

### Get Dashboard summary Metrics
* **URL**: `/reports/dashboard-summary`
* **Method**: `GET`
* **Auth Required**: Yes (Accessible to all authenticated users)
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Dashboard KPIs retrieved successfully",
    "data": {
      "totalLeads": 24,
      "unassignedLeads": 4,
      "wonLeads": 8,
      "scheduledMeetings": 3,
      "openProposals": 2,
      "activeClients": 5,
      "totalWonRevenue": 145000.00,
      "conversionRate": "33.33%"
    }
  }
  ```

### Get Lead Report
* **URL**: `/reports/leads`
* **Method**: `GET`
* **Auth Required**: Yes (`reports` permission: `view`)
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Lead report retrieved successfully",
    "data": [
      {
        "id": 1,
        "title": "Google LLC",
        "contactPerson": "John Doe",
        "status": "WON"
      }
    ],
    "meta": {
      "total": 1,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    }
  }
  ```

---

## 15. System Settings

### Get System Settings
* **URL**: `/settings`
* **Method**: `GET`
* **Auth Required**: Yes (`settings` permission: `view`)
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Settings retrieved successfully",
    "data": {
      "appName": "SaiFlow ERP",
      "timeZone": "GMT+05:30",
      "language": "English (US)",
      "companyName": "Sai Technologies",
      "contactEmail": "info@saiflow.com",
      "address": "12, Tech Park Avenue, Bangalore, India"
    }
  }
  ```

---

## 16. Notification Center

### Get Notifications List
* **URL**: `/notifications`
* **Method**: `GET`
* **Auth Required**: Yes (`notifications` permission: `view`)
* **Query Parameters**:
  * `page` (number, default: 1)
  * `limit` (number, default: 15)
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Notifications retrieved successfully",
    "data": [
      {
        "id": 1,
        "userName": "Admin",
        "message": "assigned a new lead to you",
        "targetName": "Slack Integration",
        "category": "Lead",
        "isRead": false,
        "createdAt": "2026-08-06T10:00:00.000Z"
      }
    ]
  }
  ```

### Mark Notification as Read
* **URL**: `/notifications/:id/read`
* **Method**: `PATCH`
* **Auth Required**: Yes (`notifications` permission: `view`)
* **Path Parameters**:
  * `id` (integer)
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Notification marked as read"
  }
  ```
