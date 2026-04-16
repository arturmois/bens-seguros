import type { ApiAutoDataResponse, ApiEnumOption } from '../types/api.js'
import type { EnumOption } from '../types/enums.js'
import { ALL_ENUM_DEFAULTS } from './auto-enum-defaults.js'
import { LABEL_TO_KEY } from './label-mappings.js'

/**
 * Builds a reverse lookup: Portuguese label (lowercased) -> API Key string,
 * from a list of ApiEnumOption[].
 */
function buildLabelToApiKey(
  options: readonly ApiEnumOption[]
): Map<string, string> {
  const map = new Map<string, string>()
  for (const option of options) {
    map.set(option.Value.toLowerCase(), option.Key)
  }
  return map
}

/**
 * Dynamic enum registry that fetches enum data from the Aggilizador API
 * at runtime, caches it in memory, and falls back to hardcoded defaults
 * when the API is unavailable.
 */
export class EnumRegistry {
  private readonly baseUrl: string
  private cache: ApiAutoDataResponse | null = null
  private fetchPromise: Promise<ApiAutoDataResponse | null> | null = null

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  /**
   * Resolves an English enum key to the API string value for a given field.
   * Tries the dynamic API data first, falls back to hardcoded defaults.
   */
  async resolve(apiField: string, ourKey: string): Promise<string> {
    const apiData = await this.loadEnums()

    if (apiData) {
      const options = apiData[apiField]
      const labelMap = LABEL_TO_KEY[apiField]

      if (options && labelMap) {
        const portugueseLabel = labelMap[ourKey]
        if (portugueseLabel) {
          const reverseMap = buildLabelToApiKey(options)
          const apiKey = reverseMap.get(portugueseLabel.toLowerCase())
          if (apiKey !== undefined) {
            return apiKey
          }
        }
      }
    }

    // Fallback to hardcoded defaults.
    // TypeScript cannot narrow `keyof typeof` from a runtime string,
    // so the `as` casts here are necessary and safe — all values in
    // ALL_ENUM_DEFAULTS are Record<string, string>.
    const defaults =
      ALL_ENUM_DEFAULTS[apiField as keyof typeof ALL_ENUM_DEFAULTS]
    if (defaults) {
      const value = (defaults as Record<string, string>)[ourKey]
      if (value !== undefined) {
        return value
      }
    }

    throw new Error(`Unknown enum: field="${apiField}", key="${ourKey}"`)
  }

  /**
   * Returns all enum options for a given API field (for populating dropdowns).
   * Tries API data first, falls back to hardcoded defaults with Portuguese labels.
   */
  async getEnumList(apiField: string): Promise<readonly EnumOption[]> {
    const apiData = await this.loadEnums()

    if (apiData) {
      const options = apiData[apiField]
      if (options) {
        return options.map((option) => ({
          key: option.Key,
          value: option.Value,
        }))
      }
    }

    // Fallback: build from hardcoded defaults + LABEL_TO_KEY.
    // Same `as` reasoning as in resolve() above.
    const defaults =
      ALL_ENUM_DEFAULTS[apiField as keyof typeof ALL_ENUM_DEFAULTS]
    const labelMap = LABEL_TO_KEY[apiField]

    if (!defaults || !labelMap) {
      return []
    }

    return Object.entries(defaults as Record<string, string>).map(
      ([ourKey, apiKey]) => ({
        key: apiKey,
        value: labelMap[ourKey] ?? ourKey,
      })
    )
  }

  /** Clears the in-memory cache, forcing a re-fetch on next access. */
  invalidate(): void {
    this.cache = null
    this.fetchPromise = null
  }

  /**
   * Loads enum data from the API (or cache). Deduplicates concurrent calls
   * so only one fetch happens even if multiple resolve() calls race.
   */
  private async loadEnums(): Promise<ApiAutoDataResponse | null> {
    if (this.cache) {
      return this.cache
    }

    if (!this.fetchPromise) {
      this.fetchPromise = this.fetchEnums()
    }

    return this.fetchPromise
  }

  private async fetchEnums(): Promise<ApiAutoDataResponse | null> {
    try {
      const response = await fetch(`${this.baseUrl}/Auto/Data`)

      if (!response.ok) {
        this.fetchPromise = null
        return null
      }

      const data = (await response.json()) as ApiAutoDataResponse
      this.cache = data
      this.fetchPromise = null
      return data
    } catch {
      this.fetchPromise = null
      return null
    }
  }
}
