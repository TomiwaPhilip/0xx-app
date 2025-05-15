import { Types } from 'mongoose'

/**
 * Serializes a MongoDB document or array of documents into a plain JavaScript object
 * Handles ObjectIds, Dates, and nested objects/arrays
 */
export function serializeDocument<T>(doc: any): T {
  if (!doc) {
    return doc
  }

  if (Array.isArray(doc)) {
    return doc.map((item) => serializeDocument(item)) as T
  }

  if (doc.toObject) {
    doc = doc.toObject()
  }

  const serialized: any = {}

  for (const [key, value] of Object.entries(doc)) {
    if (value instanceof Types.ObjectId) {
      serialized[key] = value.toString()
    } else if (value instanceof Date) {
      serialized[key] = value.toISOString()
    } else if (value instanceof Buffer) {
      serialized[key] = value.toString('hex')
    } else if (Array.isArray(value)) {
      serialized[key] = value.map((item) => serializeDocument(item))
    } else if (value && typeof value === 'object') {
      serialized[key] = serializeDocument(value)
    } else {
      serialized[key] = value
    }
  }

  return serialized as T
} 