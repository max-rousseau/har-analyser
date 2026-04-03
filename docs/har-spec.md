# HAR (HTTP Archive) Format Specification Reference

Source: [W3C HAR Specification](https://w3c.github.io/web-performance/specs/HAR/Overview.html)

## Overview
The HAR format is an archival format for HTTP transactions that can be used by a web browser to export detailed performance data about web pages it loads. It uses JSON encoding and requires UTF-8 file encoding.

## Core Object Structure

### 1. log (Root Object)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| version | string | Yes | Format version number |
| creator | object | Yes | Application that created the log |
| browser | object | No | User agent information |
| pages | array | No | Array of page objects |
| entries | array | Yes | Array of HTTP request entries |
| comment | string | No | User or application comment |

### 2. creator / browser
| Field | Type | Required |
|-------|------|----------|
| name | string | Yes |
| version | string | Yes |
| comment | string | No |

### 3. pages (Array)
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| startedDateTime | string | Yes | ISO 8601 format timestamp |
| id | string | Yes | Unique page identifier |
| title | string | No | Page title |
| pageTimings | object | Yes | Timing details |
| comment | string | No | User or application comment |

### 4. entries (Array)
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| pageref | string | No | Reference to parent page |
| startedDateTime | string | Yes | ISO 8601 timestamp |
| time | number | Yes | Total elapsed time in milliseconds |
| request | object | Yes | Request details |
| response | object | Yes | Response details |
| cache | object | No | Cache state information |
| timings | object | Yes | Timing breakdown |
| serverIPAddress | string | No | IP address of connected server |
| connection | string | No | Unique TCP/IP connection identifier |
| comment | string | No | User or application comment |

### 5. request
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| method | string | Yes | HTTP method (GET, POST, etc.) |
| url | string | Yes | Absolute URL without fragments |
| httpVersion | string | Yes | HTTP version string |
| cookies | array | Yes | Cookie objects |
| headers | array | Yes | Header objects |
| queryString | array | Yes | Query parameter objects |
| postData | object | No | Posted data details |
| headersSize | number | Yes | -1 if unavailable |
| bodySize | number | Yes | -1 if unavailable |

### 6. response
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| status | number | Yes | HTTP status code |
| statusText | string | Yes | Status description |
| httpVersion | string | Yes | HTTP version string |
| cookies | array | Yes | Cookie objects |
| headers | array | Yes | Header objects |
| content | object | Yes | Response body details |
| redirectURL | string | Yes | Location header value |
| headersSize | number | Yes | -1 if unavailable |
| bodySize | number | Yes | -1 if unavailable |

### 7. headers / queryString (Array)
| Field | Type | Required |
|-------|------|----------|
| name | string | Yes |
| value | string | Yes |
| comment | string | No |

### 8. cookies (Array)
| Field | Type | Required |
|-------|------|----------|
| name | string | Yes |
| value | string | Yes |
| path | string | No |
| domain | string | No |
| expires | string | No |
| httpOnly | boolean | No |
| secure | boolean | No |

### 9. content
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| size | number | Yes | Content length in bytes |
| compression | number | No | Bytes saved by compression |
| mimeType | string | Yes | Content-Type with charset |
| text | string | No | Response body |
| encoding | string | No | e.g., "base64" |

### 10. timings (milliseconds)
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| blocked | number | No | Queue wait time; -1 if N/A |
| dns | number | No | DNS resolution; -1 if N/A |
| connect | number | No | TCP connection; -1 if N/A |
| send | number | Yes | Request send time |
| wait | number | Yes | Server response wait |
| receive | number | Yes | Response read time |
| ssl | number | No | SSL/TLS negotiation; -1 if N/A |

## Custom Fields
- Must begin with underscore (`_fieldName`)
- Parsers ignore unknown custom fields
