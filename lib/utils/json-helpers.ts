/**
 * JSON serialization/deserialization helpers
 * 
 * Used for SQLite compatibility where JSON fields are stored as strings
 */

export function serializeJson(data: any): string {
  return JSON.stringify(data)
}

export function deserializeJson(jsonString: string | null | undefined): any {
  if (!jsonString) return null
  try {
    return JSON.parse(jsonString)
  } catch (error) {
    console.error('Error parsing JSON string:', error, jsonString)
    return null
  }
}

